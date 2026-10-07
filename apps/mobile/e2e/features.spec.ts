import { expect, test } from '@playwright/test';
import { apiSignUp, asUser, newCustomer, sql } from './helpers';

// Phase 0 (migration 0020): feature flags and the hidden Vault / Passport /
// membership data. Everything ships dark: anon and customers see nothing,
// staff see everything, allow-listed testers see only their flag.
// Database-only, so one device.

test.beforeEach(() => {
  test.skip(test.info().project.name !== 'android-pixel-7', 'database-only check; runs on one device');
});

const ANON_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321';

async function anonRpc(fn: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${ANON_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: process.env.E2E_ANON_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test('feature flags, Vault pairs and the public Passport stay hidden until switched on', async () => {
  const s = newCustomer();
  const staff = await apiSignUp(s);
  sql(`insert into staff (id, name) values ('${staff.userId}', 'E2E Staff')`);

  const c = newCustomer();
  const cust = await apiSignUp(c);
  await asUser(cust.accessToken, 'customers', { method: 'POST', body: { id: cust.userId, name: 'Vera Vault', email: c.email } });

  const t = newCustomer();
  const tester = await apiSignUp(t);
  await asUser(tester.accessToken, 'customers', { method: 'POST', body: { id: tester.userId, name: 'Tess Tester', email: t.email } });

  // Everything off: anon and customers get nothing, staff get every flag.
  expect((await anonRpc('my_features')).body).toEqual([]);
  expect((await asUser(cust.accessToken, 'rpc/my_features', { method: 'POST', body: {} })).body).toEqual([]);
  const staffFlags = (await asUser(staff.accessToken, 'rpc/my_features', { method: 'POST', body: {} })).body as string[];
  expect(staffFlags.sort()).toEqual(['condition_grade', 'fresh_pairs', 'membership', 'passport', 'smart_nudges', 'vault']);

  // Customers can't flip flags or add themselves as testers.
  const flip = await asUser(cust.accessToken, 'feature_flags?key=eq.vault', { method: 'PATCH', body: { enabled_for_all: true } });
  expect(flip.body ?? []).toEqual([]);
  const selfAdd = await asUser(cust.accessToken, 'feature_flag_users', { method: 'POST', body: { flag_key: 'vault', user_id: cust.userId } });
  expect(selfAdd.status).toBeGreaterThanOrEqual(400);

  // Staff allow-lists the tester for the Vault only.
  const added = await asUser(staff.accessToken, 'feature_flag_users', { method: 'POST', body: { flag_key: 'vault', user_id: tester.userId } });
  expect(added.status).toBe(201);
  expect((await asUser(tester.accessToken, 'rpc/my_features', { method: 'POST', body: {} })).body).toEqual(['vault']);

  // Vault: the tester can add a pair (with a passport code); the customer without the flag can't.
  const pair = await asUser(tester.accessToken, 'pairs', {
    method: 'POST',
    body: { customer_id: tester.userId, brand: 'Nike', model: 'Air Force 1', colorway: 'Triple White' },
  });
  expect(pair.status).toBe(201);
  const code = pair.body[0].passport_code as string;
  expect(code).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
  const blocked = await asUser(cust.accessToken, 'pairs', { method: 'POST', body: { customer_id: cust.userId, brand: 'Clarks' } });
  expect(blocked.status).toBeGreaterThanOrEqual(400);
  // Nobody else sees the tester's pair, and the tester can't move it or change its code.
  expect((await asUser(cust.accessToken, `pairs?id=eq.${pair.body[0].id}`)).body).toEqual([]);
  const steal = await asUser(tester.accessToken, `pairs?id=eq.${pair.body[0].id}`, { method: 'PATCH', body: { passport_code: 'AAAAAAAA' } });
  expect(steal.status).toBeGreaterThanOrEqual(400);
  const rename = await asUser(tester.accessToken, `pairs?id=eq.${pair.body[0].id}`, { method: 'PATCH', body: { nickname: 'Sunday pair' } });
  expect(rename.status).toBe(200);

  // Passport: hidden while the flag is off (even with a real code), public once on, no owner details.
  expect((await anonRpc('passport', { p_code: code })).body).toBeNull();
  sql(`update feature_flags set enabled_for_all = true where key = 'passport'`);
  try {
    const pp = (await anonRpc('passport', { p_code: code.toLowerCase() })).body as Record<string, unknown>;
    expect(pp.code).toBe(code);
    expect(pp.brand).toBe('Nike');
    expect(JSON.stringify(pp)).not.toContain(t.email);
    expect(JSON.stringify(pp)).not.toContain(tester.userId);
    expect((await anonRpc('passport', { p_code: 'ZZZZZZZZ' })).body).toBeNull();
  } finally {
    sql(`update feature_flags set enabled_for_all = false where key = 'passport'`);
  }

  // Membership: plans are hidden from customers until both the flag and the plan are on; staff see them.
  expect((await asUser(cust.accessToken, 'membership_plans')).body).toEqual([]);
  expect(((await asUser(staff.accessToken, 'membership_plans')).body as unknown[]).length).toBeGreaterThanOrEqual(3);
  const clubId = sql(`select id from membership_plans where slug = 'fresh'`);
  const selfGrant = await asUser(cust.accessToken, 'memberships', { method: 'POST', body: { customer_id: cust.userId, plan_id: clubId, status: 'active' } });
  expect(selfGrant.status).toBeGreaterThanOrEqual(400);
});

test('vault: orders create pairs automatically; repeat cleans of the same item build one pair', async () => {
  const c = newCustomer();
  const cust = await apiSignUp(c);
  await asUser(cust.accessToken, 'customers', { method: 'POST', body: { id: cust.userId, name: 'Paul Pairs', email: c.email } });
  const sneakerId = sql(`select id from services where name = 'Sneaker Clean'`);
  const day = sql(`select d::date from generate_series(jm_today() + 1, jm_today() + 7, interval '1 day') d where extract(isodow from d) <> 7 limit 1`);
  const book = (item: string) =>
    asUser(cust.accessToken, 'orders', {
      method: 'POST',
      body: { customer_id: cust.userId, service_id: sneakerId, item_name: item, drop_method: 'dropoff', scheduled_date: day, add_ons: [] },
    });

  const first = await book('2x Jordan 1s');
  const again = await book('jordan 1s');
  expect(first.status).toBe(201);
  expect(first.body[0].pair_id).toBeTruthy();
  expect(again.body[0].pair_id).toBe(first.body[0].pair_id);

  // Hidden until the vault flag is on for this customer.
  expect((await asUser(cust.accessToken, 'pairs')).body).toEqual([]);
  sql(`insert into feature_flag_users (flag_key, user_id) values ('vault', '${cust.userId}')`);
  const vault = (await asUser(cust.accessToken, 'pairs?select=nickname,cleans:orders(id)')).body as { nickname: string; cleans: unknown[] }[];
  expect(vault).toEqual([{ nickname: 'Jordan 1s', cleans: expect.any(Array) }]);
  expect(vault[0].cleans).toHaveLength(2);
});

test('club: join (pending) -> staff records payment -> a care credit covers the clean', async () => {
  const s = newCustomer();
  const staff = await apiSignUp(s);
  sql(`insert into staff (id, name) values ('${staff.userId}', 'E2E Staff')`);
  const c = newCustomer();
  const cust = await apiSignUp(c);
  await asUser(cust.accessToken, 'customers', { method: 'POST', body: { id: cust.userId, name: 'Cara Club', email: c.email } });

  // Hidden: can't join until the flag is on for this customer.
  const hidden = await asUser(cust.accessToken, 'rpc/join_membership', { method: 'POST', body: { p_plan_slug: 'fresh' } });
  expect(hidden.status).toBeGreaterThanOrEqual(400);
  sql(`insert into feature_flag_users (flag_key, user_id) values ('membership', '${cust.userId}')`);
  sql(`update membership_plans set active = true where slug = 'fresh'`);
  try {
    const joined = await asUser(cust.accessToken, 'rpc/join_membership', { method: 'POST', body: { p_plan_slug: 'fresh' } });
    expect(joined.body.status).toBe('pending');
    expect(joined.body.payment_ref).toMatch(/^CC[0-9A-F]{5}$/);

    // Customers can't activate themselves; staff can.
    const self = await asUser(cust.accessToken, 'rpc/record_membership_payment', {
      method: 'POST',
      body: { p_membership_id: joined.body.id, p_amount_cents: 500000, p_method: 'lynk', p_reference: 'x' },
    });
    expect(self.status).toBeGreaterThanOrEqual(400);
    const paid = await asUser(staff.accessToken, 'rpc/record_membership_payment', {
      method: 'POST',
      body: { p_membership_id: joined.body.id, p_amount_cents: 500000, p_method: 'lynk', p_reference: joined.body.payment_ref },
    });
    expect(paid.status).toBe(200);
    expect(paid.body.balance).toBe(3);

    const sneakerId = sql(`select id from services where name = 'Sneaker Clean'`);
    const day = sql(`select d::date from generate_series(jm_today() + 1, jm_today() + 7, interval '1 day') d where extract(isodow from d) <> 7 limit 1`);
    const order = await asUser(cust.accessToken, 'orders', {
      method: 'POST',
      body: { customer_id: cust.userId, service_id: sneakerId, item_name: 'Club pair', drop_method: 'dropoff', scheduled_date: day, add_ons: [], redeem_credit: true },
    });
    expect(order.status).toBe(201);
    expect(order.body[0].price_cents).toBe(0);
    expect(order.body[0].credits_used).toBe(1);
    const mine = await asUser(cust.accessToken, 'rpc/my_membership', { method: 'POST', body: {} });
    expect(mine.body.balance).toBe(2);
    expect(mine.body.status).toBe('active');
  } finally {
    sql(`update membership_plans set active = false where slug = 'fresh'`);
  }
});
