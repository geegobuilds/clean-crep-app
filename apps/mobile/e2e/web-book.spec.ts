import { expect, test } from '@playwright/test';
import { apiSignUp, asUser, newCustomer, sql } from './helpers';

// The website's Quick Book (migration 0013): book_web_order() prices and dates
// the order itself, and a guest's bookings move onto their account once they
// sign up with the same (verified) email. Database-only, so one device.

test.beforeEach(() => {
  test.skip(test.info().project.name !== 'android-pixel-7', 'database-only check; runs on one device');
});

const ANON_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321';

async function book(args: Record<string, unknown>) {
  const res = await fetch(`${ANON_URL}/rest/v1/rpc/book_web_order`, {
    method: 'POST',
    headers: { apikey: process.env.E2E_ANON_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  return { status: res.status, body: await res.json() };
}

function id(query: string) {
  return sql(query);
}

test('Quick Book: the database prices it, picks the pickup day, and refuses Sundays', async () => {
  const c = newCustomer();
  const phone = `876${Date.now().toString().slice(-7)}`;
  const base = { p_item: 'AF1s', p_name: 'Web Test', p_phone: phone, p_email: c.email, p_notes: '' };
  const sneaker = id(`select id from services where name = 'Sneaker Clean'`);

  // 2 pairs + Deep Clean (per pair) + a kit (once) + CrepRun Zone 2 (J$2,000);
  // the pickup fee add-on is ignored on the website (zones price pickup).
  const pickup = await book({
    ...base,
    p_service_id: sneaker,
    p_pairs: 2,
    p_add_on_ids: [
      id(`select id from add_ons where slug = 'deep-clean'`),
      id(`select id from add_ons where slug = 'suede-revive-kit'`),
      id(`select id from add_ons where slug = 'pickup-delivery'`),
    ],
    p_drop_method: 'pickup',
    p_zone_id: id(`select id from zones where name = 'Zone 2'`),
    p_date: '2000-01-01', // ignored: pickup day comes from the zone
  });
  expect(pickup.status).toBe(200);
  expect(pickup.body[0].price_cents).toBe(2 * 200000 + 2 * 100000 + 400000 + 200000);
  expect(sql(`select to_char('${pickup.body[0].scheduled_date}'::date, 'FMDay')`)).toBe('Wednesday');
  expect(sql(`select source || '|' || item_name from orders where order_number = '${pickup.body[0].order_number}'`)).toBe('web|2x AF1s');

  const sunday = sql(`select d::date from generate_series(jm_today(), jm_today() + 7, interval '1 day') d where extract(isodow from d) = 7 limit 1`);
  const refused = await book({ ...base, p_service_id: sneaker, p_pairs: 1, p_add_on_ids: [], p_drop_method: 'dropoff', p_zone_id: null, p_date: sunday });
  expect(refused.status).toBe(400);
  expect(refused.body.message).toMatch(/^BOOK: Pick a drop-off day/);
});

test('Quick Book: signing up with the booking email claims the order, only once verified', async () => {
  const c = newCustomer();
  const booked = await book({
    p_service_id: id(`select id from services where name = 'Clarks Clean'`),
    p_pairs: 1,
    p_item: '',
    p_add_on_ids: [],
    p_drop_method: 'dropoff',
    p_zone_id: null,
    p_date: sql(`select d::date from generate_series(jm_today(), jm_today() + 7, interval '1 day') d where extract(isodow from d) <> 7 limit 1`),
    p_name: 'Claim Test',
    p_phone: `876${Date.now().toString().slice(-7)}`,
    p_email: c.email.toUpperCase(), // case shouldn't matter
    p_notes: '',
  });
  expect(booked.body[0].has_account).toBe(false);

  // Local Supabase auto-confirms emails, so this account is verified.
  const { userId, accessToken } = await apiSignUp(c);
  await asUser(accessToken, 'customers', { method: 'POST', body: { id: userId, name: c.name, email: c.email } });
  const mine = await asUser(accessToken, `orders?select=order_number&order_number=eq.${booked.body[0].order_number}`);
  expect(mine.body).toEqual([{ order_number: booked.body[0].order_number }]);

  // An unverified account with someone else's booking email gets nothing.
  const victim = newCustomer();
  await book({
    p_service_id: id(`select id from services where name = 'Clarks Clean'`),
    p_pairs: 1, p_item: '', p_add_on_ids: [], p_drop_method: 'dropoff', p_zone_id: null,
    p_date: sql(`select d::date from generate_series(jm_today(), jm_today() + 7, interval '1 day') d where extract(isodow from d) <> 7 limit 1`),
    p_name: 'Victim', p_phone: `876${(Date.now() + 1).toString().slice(-7)}`, p_email: victim.email, p_notes: '',
  });
  const attacker = await apiSignUp(victim);
  sql(`update auth.users set email_confirmed_at = null where id = '${attacker.userId}'`);
  await asUser(attacker.accessToken, 'customers', { method: 'POST', body: { id: attacker.userId, name: 'x', email: victim.email } });
  expect(sql(`select count(*) from orders where customer_id = '${attacker.userId}'`)).toBe('0');
});
