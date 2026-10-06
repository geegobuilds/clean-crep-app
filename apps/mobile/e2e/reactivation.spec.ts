import { expect, test } from '@playwright/test';
import { apiSignUp, asUser, newCustomer, sql } from './helpers';

// "Due for a clean" (migrations 0017/0018): who is due, the staff-only list and
// nudge log, and WELCOMEBACK10 — off by default, and when on it only touches
// nudged customers, on all three booking paths (app, website, Creppie).
// Database-only, so one device.

test.beforeEach(() => {
  test.skip(test.info().project.name !== 'android-pixel-7', 'database-only check; runs on one device');
});

const ANON_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321';

async function bookWeb(args: Record<string, unknown>) {
  const res = await fetch(`${ANON_URL}/rest/v1/rpc/book_web_order`, {
    method: 'POST',
    headers: { apikey: process.env.E2E_ANON_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  return { status: res.status, body: await res.json() };
}

function uniquePhone() {
  return `876${Date.now().toString().slice(-7)}`;
}

/** A completed order `days` ago, written straight to the database (like Creppie/staff history). */
function completedOrder(opts: { customerId?: string; guestName?: string; guestPhone?: string; item: string; days: number }) {
  const id = sql(
    `insert into orders (customer_id, service_id, item_name, status, scheduled_date, price_cents, source, guest_name, guest_phone, created_at)
     select ${opts.customerId ? `'${opts.customerId}'` : 'null'}, id, '${opts.item}', 'completed', current_date - ${opts.days}, price_cents, 'creppie',
            ${opts.guestName ? `'${opts.guestName}'` : 'null'}, ${opts.guestPhone ? `'${opts.guestPhone}'` : 'null'}, now() - interval '${opts.days} days'
       from services where name = 'Sneaker Clean' returning id`
  ).split('\n')[0];
  sql(`update order_status_events set created_at = now() - interval '${opts.days - 1} days' where order_id = '${id}'`);
  sql(`insert into order_status_events (order_id, status, created_at) values ('${id}', 'completed', now() - interval '${opts.days - 1} days')`);
  return id;
}

test('due for a clean: staff-only list, nudge log, and WELCOMEBACK10 off by default and scoped to nudged customers', async () => {
  const sneakerPrice = Number(sql(`select price_cents from services where name = 'Sneaker Clean'`));
  const sneakerId = sql(`select id from services where name = 'Sneaker Clean'`);
  // A valid drop-off day (Mon–Sat, within two weeks) for new bookings.
  const day = sql(`select d::date from generate_series(jm_today() + 1, jm_today() + 7, interval '1 day') d where extract(isodow from d) <> 7 limit 1`);

  // Staff, an app customer (completed 40 days ago) and a Creppie guest (45 days ago).
  const s = newCustomer();
  const staff = await apiSignUp(s);
  sql(`insert into staff (id, name) values ('${staff.userId}', 'E2E Staff')`);

  const c = newCustomer();
  const cust = await apiSignUp(c);
  await asUser(cust.accessToken, 'customers', { method: 'POST', body: { id: cust.userId, name: 'Ana Due', email: c.email } });
  completedOrder({ customerId: cust.userId, item: 'AF1s', days: 40 });

  const guestPhone = uniquePhone();
  completedOrder({ guestName: 'Gina Due', guestPhone: `(${guestPhone.slice(0, 3)}) ${guestPhone.slice(3)}`, item: '1x Clarks Cleaning', days: 45 });
  const guestKey = `phone:${guestPhone}`;

  // Customers can't see the list; staff can, with both people on it.
  const asCustomer = await asUser(cust.accessToken, 'rpc/customers_due_for_clean', { method: 'POST', body: {} });
  expect(asCustomer.status).toBeGreaterThanOrEqual(400);
  const due = await asUser(staff.accessToken, 'rpc/customers_due_for_clean', { method: 'POST', body: {} });
  expect(due.status).toBe(200);
  const mine = (due.body as { customer_key: string; name: string; service_label: string }[]).filter(
    (r) => r.customer_key === cust.userId || r.customer_key === guestKey
  );
  expect(mine.map((r) => r.name).sort()).toEqual(['Ana Due', 'Gina Due']);
  expect(mine.find((r) => r.name === 'Gina Due')?.service_label).toBe('Clarks');

  // Staff taps WhatsApp for Gina: logged, and she leaves the list.
  const logged = await asUser(staff.accessToken, 'reactivation_nudges', { method: 'POST', body: { customer_key: guestKey, channel: 'whatsapp' } });
  expect(logged.status).toBe(201);
  const after = await asUser(staff.accessToken, 'rpc/customers_due_for_clean', { method: 'POST', body: {} });
  expect((after.body as { customer_key: string }[]).some((r) => r.customer_key === guestKey)).toBe(false);
  // Customers can't write the log.
  const forged = await asUser(cust.accessToken, 'reactivation_nudges', { method: 'POST', body: { customer_key: cust.userId, channel: 'whatsapp' } });
  expect(forged.status).toBeGreaterThanOrEqual(400);

  // Ana is nudged too (as the 9 AM push would).
  sql(`insert into reactivation_nudges (customer_key, customer_id, channel) values ('${cust.userId}', '${cust.userId}', 'push')`);

  const appOrder = async (item: string) =>
    asUser(cust.accessToken, 'orders', {
      method: 'POST',
      body: { customer_id: cust.userId, service_id: sneakerId, item_name: item, drop_method: 'dropoff', scheduled_date: day, add_ons: [] },
    });
  const creppieOrder = (item: string) =>
    Number(
      sql(
        `insert into orders (customer_id, service_id, item_name, scheduled_date, price_cents, source, guest_name, guest_phone)
         values (null, '${sneakerId}', '${item}', current_date + 1, ${sneakerPrice}, 'creppie', 'Gina Due', '${guestPhone}') returning price_cents`
      ).split('\n')[0]
    );

  // Discount OFF (the default): nudged customers pay the normal price.
  expect(sql(`select discount_enabled from reactivation_settings`)).toBe('f');
  const offApp = await appOrder('AF1s again (off)');
  expect(offApp.status).toBe(201);
  expect(offApp.body[0].price_cents).toBe(sneakerPrice);
  expect(creppieOrder('Clarks again (off)')).toBe(sneakerPrice);
  sql(`delete from orders where item_name like '% (off)'`);

  // Discount ON: 10% off for nudged customers only, once per round, on every path.
  sql(`update reactivation_settings set discount_enabled = true`);
  try {
    const onApp = await appOrder('AF1s again (on)');
    expect(onApp.body[0].price_cents).toBe(Math.round(sneakerPrice * 0.9));
    expect(onApp.body[0].notes).toMatch(/WELCOMEBACK10/);
    const second = await appOrder('AF1s third (on)');
    expect(second.body[0].price_cents).toBe(sneakerPrice);
    expect(creppieOrder('Clarks again (on)')).toBe(Math.round(sneakerPrice * 0.9));

    const webArgs = { p_service_id: sneakerId, p_pairs: 1, p_item: 'Web pair', p_add_on_ids: [], p_drop_method: 'dropoff', p_zone_id: null, p_date: day, p_notes: '' };
    const nudgedWebPhone = uniquePhone().replace(/.$/, '7');
    sql(`insert into reactivation_nudges (customer_key, channel) values ('phone:${nudgedWebPhone}', 'whatsapp')`);
    const nudgedWeb = await bookWeb({ ...webArgs, p_name: 'Wendy', p_phone: nudgedWebPhone, p_email: newCustomer().email });
    expect(nudgedWeb.body[0].price_cents).toBe(Math.round(sneakerPrice * 0.9));
    const freshWeb = await bookWeb({ ...webArgs, p_name: 'Walt', p_phone: uniquePhone().replace(/.$/, '8'), p_email: newCustomer().email });
    expect(freshWeb.body[0].price_cents).toBe(sneakerPrice);
  } finally {
    sql(`update reactivation_settings set discount_enabled = false`);
  }
});
