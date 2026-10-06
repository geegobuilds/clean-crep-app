import { expect, test } from '@playwright/test';
import { adminUpdate, apiSignUp, asUser, newCustomer, placeholder, shot, tab, text } from './helpers';

// A signed-in customer with one active and one completed order: the state most
// customers see. Also produces the Home / Book / Orders screenshots for design
// reviews (E2E_SHOTS=1 npm run e2e -- screens).

async function customerWithTwoOrders() {
  const c = newCustomer();
  const { userId, accessToken } = await apiSignUp(c);
  await asUser(accessToken, 'customers', { method: 'POST', body: { id: userId, name: 'Geego', email: c.email } });
  const [service] = (await asUser(accessToken, 'services?select=id,location_id,price_cents,currency&name=eq.Sneaker%20Clean')).body;
  const ids: string[] = [];
  for (const item of ['Jordan 1 Chicago', 'AF1 Triple White']) {
    const res = await asUser(accessToken, 'orders', {
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
    expect(res.status).toBe(201);
    ids.push(res.body[0].id);
  }
  // Oldest first: the Jordans are done, the AF1s are on the bench.
  await adminUpdate('orders', `id=eq.${ids[0]}`, { status: 'completed' });
  await adminUpdate('orders', `id=eq.${ids[1]}`, { status: 'in_progress' });
  return { c, userId, accessToken, completedId: ids[0], activeId: ids[1] };
}

test('signed-in customer: Home, Book and Orders with an active and a completed order', async ({ page }) => {
  const { c } = await customerWithTwoOrders();
  await page.goto('/sign-in');
  await placeholder(page, 'you@email.com').fill(c.email);
  await placeholder(page, '••••••••').fill(c.password);
  await text(page, 'Sign In').click();

  await expect(text(page, 'AF1 Triple White', false)).toBeVisible();
  await text(page, 'Not now').click(); // the one-time review ask
  await shot(page, 'screen-home');

  await tab(page, 'Book');
  await expect(text(page, 'Clarks Clean', false)).toBeVisible();
  await shot(page, 'screen-book');

  await tab(page, 'Orders');
  await expect(text(page, 'AF1 Triple White', false)).toBeVisible();
  await shot(page, 'screen-orders');
});
