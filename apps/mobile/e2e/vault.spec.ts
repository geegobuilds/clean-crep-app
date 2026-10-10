import { expect, test } from '@playwright/test';
import { apiSignUp, asUser, byTestId, newCustomer, placeholder, shot, sql, text } from './helpers';

// Repeat cleans land on the item already in the Vault (Geego, 2026-10-10):
// booking a cap from its Vault page must not create a second cap, and a
// never-cleaned item can be removed.

async function vaultCustomerWithCap() {
  const c = newCustomer();
  const { userId, accessToken } = await apiSignUp(c);
  await asUser(accessToken, 'customers', { method: 'POST', body: { id: userId, name: c.name, email: c.email } });
  sql(`insert into feature_flag_users (flag_key, user_id) values ('vault', '${userId}')`);
  sql(
    `insert into services (name, price_cents, note, description, icon, active, sort_order, location_id)
     select 'Premium Cap Clean', 250000, '24-48 hrs', 'Wool, structured, fitted.', 'pkg', true, 41, location_id
       from services where not exists (select 1 from services where name = 'Premium Cap Clean') limit 1`
  );
  const cap = await asUser(accessToken, 'pairs', { method: 'POST', body: { customer_id: userId, category: 'cap', brand: 'NY', model: 'SnapBack' } });
  expect(cap.status).toBe(201);
  return { c, userId, accessToken, capId: cap.body[0].id as string };
}

test('booking a cap from its Vault page adds the clean to that cap, not a new one', async ({ page }) => {
  const { c, userId, capId } = await vaultCustomerWithCap();
  await page.goto('/sign-in');
  await placeholder(page, 'you@email.com').fill(c.email);
  await placeholder(page, '••••••••').fill(c.password);
  await text(page, 'Sign In').click();
  await expect(page).not.toHaveURL(/sign-in/);

  await page.goto('/vault');
  await byTestId(page, 'vault-pair').click();
  await expect(text(page, 'NY SnapBack', false)).toBeVisible();
  await byTestId(page, 'pair-book').click();

  // Book opens for that cap: only cap services, the cap already chosen.
  await expect(byTestId(page, 'booking-for')).toContainText('NY SnapBack');
  await expect(text(page, 'Sneaker Clean')).toHaveCount(0);
  await text(page, 'Premium Cap Clean').click();
  await expect(byTestId(page, 'vault-choice')).toHaveAttribute('aria-checked', 'true');
  await shot(page, '30-book-from-vault');
  await text(page, 'Confirm Booking').click();
  await expect(text(page, "You're booked.", false)).toBeVisible();

  expect(sql(`select count(*) from pairs where customer_id = '${userId}'`)).toBe('1');
  expect(sql(`select pair_id from orders where customer_id = '${userId}'`)).toBe(capId);
});

test('a never-cleaned Vault item can be removed', async ({ page }) => {
  const { c, userId } = await vaultCustomerWithCap();
  await page.goto('/sign-in');
  await placeholder(page, 'you@email.com').fill(c.email);
  await placeholder(page, '••••••••').fill(c.password);
  await text(page, 'Sign In').click();
  await expect(page).not.toHaveURL(/sign-in/);

  await page.goto('/vault');
  await byTestId(page, 'vault-pair').click();
  await text(page, 'Remove from Vault').click();
  await byTestId(page, 'confirm-remove').click();
  await expect(text(page, 'Your Vault is empty.', false)).toBeVisible();
  expect(sql(`select count(*) from pairs where customer_id = '${userId}'`)).toBe('0');
});
