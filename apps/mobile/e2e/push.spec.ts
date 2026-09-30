import { expect, test } from '@playwright/test';
import { adminUpdate, apiSignUp, asUser, newCustomer, placeholder, shot, sql, text } from './helpers';

// Server side of push notifications (migration 0005), exercised against the
// real local database: token registration rules, and that an order status
// change produces the right push message and hands it to pg_net.
// Actual delivery to a phone needs a real device + EAS project (see HANDOFF).

// The first three checks are database-only (no screen), so run them once.
function dbOnly() {
  test.skip(test.info().project.name !== 'android-pixel-7', 'database-only check; runs on one device');
}

async function customerWithOrder() {
  const c = newCustomer();
  const { userId, accessToken } = await apiSignUp(c);
  const profile = await asUser(accessToken, 'customers', { method: 'POST', body: { id: userId, name: c.name, email: c.email } });
  expect(profile.status).toBe(201);
  const [service] = (await asUser(accessToken, 'services?select=id,location_id,price_cents,currency&name=eq.Sneaker%20Clean')).body;
  const order = await asUser(accessToken, 'orders', {
    method: 'POST',
    body: {
      customer_id: userId,
      service_id: service.id,
      location_id: service.location_id,
      item_name: 'AF1 Triple White',
      drop_method: 'dropoff',
      scheduled_date: new Date().toISOString().slice(0, 10),
      price_cents: service.price_cents,
      currency: service.currency,
    },
  });
  expect(order.status).toBe(201);
  return { c, userId, accessToken, orderId: order.body[0].id as string };
}

test('status change pushes the order update to the customer\'s phone', async () => {
  dbOnly();
  const { userId, accessToken, orderId } = await customerWithOrder();
  const token = `ExponentPushToken[e2e-${userId}]`;

  const reg = await asUser(accessToken, 'rpc/register_push_token', { method: 'POST', body: { p_token: token, p_platform: 'android' } });
  expect(reg.status).toBe(204);

  const queuedBefore = Number(sql(`select count(*) from net.http_request_queue`) || 0) + Number(sql(`select count(*) from net._http_response`) || 0);
  await adminUpdate('orders', `id=eq.${orderId}`, { status: 'ready_for_pickup' });

  // The exact message Expo receives for the newest notification.
  const messages = JSON.parse(
    sql(`select push_messages_for_notification(n) from notifications n where order_id = '${orderId}' order by created_at desc limit 1`)
  );
  expect(messages).toEqual([
    expect.objectContaining({
      to: token,
      title: 'Ready for Pickup',
      body: 'Your AF1 Triple White is clean and waiting for pickup.',
      channelId: 'order-updates',
      data: expect.objectContaining({ orderId, url: '/orders' }),
    }),
  ]);

  // And the trigger handed it to pg_net (queued or already attempted).
  const queuedAfter = Number(sql(`select count(*) from net.http_request_queue`) || 0) + Number(sql(`select count(*) from net._http_response`) || 0);
  expect(queuedAfter).toBeGreaterThan(queuedBefore);
});

test('a phone\'s token moves to whoever signs in on it, and sign-out detaches it', async () => {
  dbOnly();
  const a = await customerWithOrder();
  const b = await customerWithOrder();
  const token = `ExponentPushToken[e2e-shared-${a.userId}]`;

  await asUser(a.accessToken, 'rpc/register_push_token', { method: 'POST', body: { p_token: token, p_platform: 'ios' } });
  expect(sql(`select customer_id from push_tokens where token = '${token}'`)).toBe(a.userId);

  // Customer B signs in on the same phone.
  await asUser(b.accessToken, 'rpc/register_push_token', { method: 'POST', body: { p_token: token, p_platform: 'ios' } });
  expect(sql(`select customer_id from push_tokens where token = '${token}'`)).toBe(b.userId);

  // A can't remove B's token; B signing out removes it.
  await asUser(a.accessToken, 'rpc/unregister_push_token', { method: 'POST', body: { p_token: token } });
  expect(sql(`select count(*) from push_tokens where token = '${token}'`)).toBe('1');
  await asUser(b.accessToken, 'rpc/unregister_push_token', { method: 'POST', body: { p_token: token } });
  expect(sql(`select count(*) from push_tokens where token = '${token}'`)).toBe('0');
});

test('push tokens are private and validated', async () => {
  dbOnly();
  const a = await customerWithOrder();
  const b = await customerWithOrder();
  await asUser(a.accessToken, 'rpc/register_push_token', { method: 'POST', body: { p_token: `ExponentPushToken[e2e-priv-${a.userId}]`, p_platform: 'android' } });

  // B can't read A's tokens.
  const peek = await asUser(b.accessToken, `push_tokens?customer_id=eq.${a.userId}`);
  expect(peek.body).toEqual([]);
  // Garbage isn't accepted as a token.
  const bad = await asUser(a.accessToken, 'rpc/register_push_token', { method: 'POST', body: { p_token: 'not-a-token', p_platform: 'android' } });
  expect(bad.status).toBeGreaterThanOrEqual(400);
  // Customers can't call the internal message builder.
  const internal = await asUser(a.accessToken, 'rpc/send_push_for_notification', { method: 'POST', body: {} });
  expect(internal.status).toBeGreaterThanOrEqual(400);
});

test('after a completed order, Home asks once for a Google review', async ({ page }) => {
  const { c, orderId } = await customerWithOrder();
  await adminUpdate('orders', `id=eq.${orderId}`, { status: 'completed' });

  await page.goto('/sign-in');
  await placeholder(page, 'you@email.com').fill(c.email);
  await placeholder(page, '••••••••').fill(c.password);
  await text(page, 'Sign In').click();

  await expect(text(page, 'How did your AF1 Triple White come out?', false)).toBeVisible();
  await shot(page, '12-review-ask');
  await text(page, 'Not now').click();
  await expect(text(page, 'How did your AF1 Triple White come out?', false)).toHaveCount(0);

  // Once means once: it stays gone after a reload.
  await page.reload();
  await expect(text(page, 'ACTIVE ORDERS', false)).toBeVisible();
  await expect(text(page, 'How did your AF1 Triple White come out?', false)).toHaveCount(0);
});

test('the database, not the phone, prices an app order', async () => {
  dbOnly();
  const c = newCustomer();
  const { userId, accessToken } = await apiSignUp(c);
  await asUser(accessToken, 'customers', { method: 'POST', body: { id: userId, name: c.name, email: c.email } });
  const [service] = (await asUser(accessToken, 'services?select=id,location_id,currency&name=eq.Sneaker%20Clean')).body;
  const addOns: { id: string; slug: string }[] = (await asUser(accessToken, 'add_ons?select=id,slug')).body;
  const bySlug = (s: string) => addOns.find((a) => a.slug === s)!.id;

  // A tampered request: J$1 price, a pre-completed status (would farm loyalty
  // points), the pickup fee smuggled in on a drop-off, and a made-up add-on.
  const order = await asUser(accessToken, 'orders', {
    method: 'POST',
    body: {
      customer_id: userId,
      service_id: service.id,
      location_id: service.location_id,
      item_name: 'Tamper test',
      drop_method: 'dropoff',
      scheduled_date: new Date().toISOString().slice(0, 10),
      price_cents: 100,
      status: 'completed',
      currency: service.currency,
      add_ons: [{ id: bySlug('sole-refresh') }, { id: bySlug('pickup-delivery') }, { id: '00000000-0000-0000-0000-000000000000' }],
    },
  });
  expect(order.status).toBe(201);
  const row = order.body[0];
  expect(row.price_cents).toBe(200000 + 150000);
  expect(row.status).toBe('received');
  expect(row.add_ons.map((a: { name: string }) => a.name)).toEqual(['Sole Refresh']);
  expect(sql(`select loyalty_points from customers where id = '${userId}'`)).toBe('0');
});
