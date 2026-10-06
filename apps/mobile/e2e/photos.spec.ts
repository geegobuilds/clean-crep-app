import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { adminUpdate, apiSignUp, asUser, newCustomer, placeholder, shot, sql, tab, text } from './helpers';

// Before/after photos (migration 0019): staff upload to the private
// `order-photos` bucket and register the file on the order; a customer can read
// only their own order's photos; the app shows a slider + Share on a completed
// order. The staff dashboard's "Add before/after" buttons use the same two
// calls as staffUpload() below.

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env.E2E_ANON_KEY ?? '';
const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name));

function dbOnly() {
  test.skip(test.info().project.name !== 'android-pixel-7', 'database-only check; runs on one device');
}

async function storage(token: string, method: string, p: string, body?: Buffer | string, contentType = 'image/jpeg') {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/${p}`, {
    method,
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': contentType } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : new Uint8Array(body),
  });
  return { status: res.status, body: await res.text() };
}

async function staffUser() {
  const s = newCustomer();
  const { userId, accessToken } = await apiSignUp(s);
  sql(`insert into staff (id, name) values ('${userId}', 'E2E Staff')`);
  return { accessToken };
}

async function customerWithOrder(item = 'Jordan 11 Concord') {
  const c = newCustomer();
  const { userId, accessToken } = await apiSignUp(c);
  await asUser(accessToken, 'customers', { method: 'POST', body: { id: userId, name: c.name, email: c.email } });
  const [service] = (await asUser(accessToken, 'services?select=id,location_id,price_cents,currency&name=eq.Sneaker%20Clean')).body;
  const order = await asUser(accessToken, 'orders', {
    method: 'POST',
    body: {
      customer_id: userId,
      service_id: service.id,
      location_id: service.location_id,
      item_name: item,
      drop_method: 'dropoff',
      scheduled_date: new Date().toISOString().slice(0, 10),
      price_cents: service.price_cents,
      currency: service.currency,
    },
  });
  expect(order.status).toBe(201);
  return { c, userId, accessToken, orderId: order.body[0].id as string };
}

/** Exactly what the dashboard does: upload the file, then register it. */
async function staffUpload(token: string, orderId: string, kind: 'before' | 'after') {
  const p = `${orderId}/${kind}-${Date.now()}.jpg`;
  const up = await storage(token, 'POST', `object/order-photos/${p}`, fixture(`${kind}.jpg`));
  expect(up.status, up.body).toBe(200);
  const row = await asUser(token, 'order_photos', { method: 'POST', body: { order_id: orderId, kind, storage_path: p } });
  expect(row.status).toBe(201);
  return p;
}

test('photos: staff upload; the owner reads them; other customers and guests cannot; customers cannot upload', async () => {
  dbOnly();
  const staff = await staffUser();
  const a = await customerWithOrder();
  const b = await customerWithOrder('Someone else');
  const beforePath = await staffUpload(staff.accessToken, a.orderId, 'before');
  await staffUpload(staff.accessToken, a.orderId, 'after');

  // Owner: sees both rows and can sign + download the file.
  const rows = await asUser(a.accessToken, `order_photos?order_id=eq.${a.orderId}&select=kind`);
  expect(rows.body.map((r: { kind: string }) => r.kind).sort()).toEqual(['after', 'before']);
  const signed = await storage(a.accessToken, 'POST', 'object/sign/order-photos', JSON.stringify({ paths: [beforePath], expiresIn: 60 }), 'application/json');
  const [entry] = JSON.parse(signed.body);
  expect(entry.error).toBeNull();
  const file = await fetch(`${SUPABASE_URL}/storage/v1${entry.signedURL}`);
  expect(file.status).toBe(200);

  // Another customer: no rows, no file.
  expect((await asUser(b.accessToken, `order_photos?order_id=eq.${a.orderId}`)).body).toEqual([]);
  const bRead = await storage(b.accessToken, 'GET', `object/authenticated/order-photos/${beforePath}`);
  expect(bRead.status).toBeGreaterThanOrEqual(400);

  // Guest (anon key only): bucket is private.
  const anon = await storage(ANON_KEY, 'GET', `object/public/order-photos/${beforePath}`);
  expect(anon.status).toBeGreaterThanOrEqual(400);

  // Customers can't upload, even to their own order.
  const sneaky = await storage(a.accessToken, 'POST', `object/order-photos/${a.orderId}/after-x.jpg`, fixture('after.jpg'));
  expect(sneaky.status).toBeGreaterThanOrEqual(400);
  const sneakyRow = await asUser(a.accessToken, 'order_photos', { method: 'POST', body: { order_id: a.orderId, kind: 'after', storage_path: 'x' } });
  expect(sneakyRow.status).toBeGreaterThanOrEqual(400);
});

test('completed order: boarding-pass ticket, before/after slider, and Share', async ({ page }) => {
  const staff = await staffUser();
  const { c, orderId } = await customerWithOrder('Jordan 11 Concord');
  await staffUpload(staff.accessToken, orderId, 'before');
  await staffUpload(staff.accessToken, orderId, 'after');
  for (const status of ['in_progress', 'ready_for_pickup', 'completed']) await adminUpdate('orders', `id=eq.${orderId}`, { status });

  await page.goto('/sign-in');
  await placeholder(page, 'you@email.com').fill(c.email);
  await placeholder(page, '••••••••').fill(c.password);
  await text(page, 'Sign In').click();
  await text(page, 'Not now').click(); // one-time review ask
  await tab(page, 'Orders');

  const ticket = page.getByTestId('order-ticket').and(page.locator('xpath=//*[not(ancestor-or-self::*[@aria-hidden="true"])]')).first();
  await expect(ticket).toBeVisible();
  await expect(ticket.getByText('Jordan 11 Concord')).toBeVisible();
  await expect(ticket.getByText(/ready by/i).first()).toBeVisible();

  const slider = page.getByTestId('before-after').first();
  await expect(slider).toBeVisible();
  await expect(slider.locator('img')).toHaveCount(2);
  // Drag the handle: the "before" layer follows the finger.
  const box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await shot(page, '15-before-after');

  // Share builds the watermarked card (download fallback in headless Chromium).
  const download = page.waitForEvent('download');
  await page.getByTestId('share-photos').first().click();
  expect((await download).suggestedFilename()).toMatch(/^clean-crep-CC-\d+\.jpg$/);
});
