import { expect, test, type Page } from '@playwright/test';
import { adminSelect, newCustomer, placeholder, RAW_ERROR_PATTERNS, shot, tab, text } from './helpers';

// Core customer journeys, run in an emulated Pixel 7 against local Supabase.
// Each test starts signed out (fresh browser context = fresh install).

async function expectNoRawErrors(page: Page) {
  const text = await page.locator('body').innerText();
  for (const pattern of RAW_ERROR_PATTERNS) expect(text, `raw error ${pattern} on screen`).not.toMatch(pattern);
}

async function fillBookingDetails(page: Page, service: string, shoe: string) {
  await tab(page, 'Book');
  await text(page, service).click();
  await expect(text(page, 'Booking Details', false)).toBeVisible();
  await placeholder(page, 'e.g. Nike Air Force 1, Clarks Desert Boot').fill(shoe);
  await placeholder(page, 'Any special instructions for your pair…').fill('e2e run');
}

test('guest sees services and prices without signing in', async ({ page }) => {
  await page.goto('/');
  await expect(text(page, 'Sneaker Clean', false)).toBeVisible();
  await expect(text(page, '$2,000', false)).toBeVisible();
  await expect(text(page, 'Track your cleans here', false)).toBeVisible();
  await shot(page, '01-home-guest');

  await tab(page, 'Book');
  await expect(text(page, 'AVAILABLE SERVICES', false)).toBeVisible();
  await expect(text(page, 'Clarks Clean', false)).toBeVisible();
  await shot(page, '02-book-guest');
});

test('guest books, signs up in the sheet, and the order is placed with details kept', async ({ page }) => {
  const c = newCustomer();
  await page.goto('/');
  await fillBookingDetails(page, 'Sneaker Clean', 'Jordan 4 Bred');
  await expect(text(page, /sign in or create an account to confirm/i)).toBeVisible();
  await shot(page, '03-details-guest');

  await text(page, 'Confirm Booking').click();
  await expect(text(page, 'One last step', false)).toBeVisible();
  await text(page, "Don't have an account? Sign up", false).click();
  await placeholder(page, 'Geego').fill(c.name);
  await placeholder(page, 'you@email.com').fill(c.email);
  await placeholder(page, '••••••••').fill(c.password);
  await shot(page, '04-signup-sheet');
  await text(page, 'Create Account').click();

  await expect(text(page, "You're booked.", false)).toBeVisible();
  await expect(text(page, 'Jordan 4 Bred', false)).toBeVisible();
  await shot(page, '05-booked');

  const [customer] = await adminSelect<{ id: string; name: string }>('customers', `email=eq.${encodeURIComponent(c.email)}&select=id,name`);
  expect(customer?.name).toBe(c.name);
  const orders = await adminSelect<{ item_name: string; notes: string }>('orders', `customer_id=eq.${customer.id}&select=item_name,notes`);
  expect(orders).toEqual([{ item_name: 'Jordan 4 Bred', notes: 'e2e run' }]);

  await tab(page, 'Orders');
  await expect(text(page, 'Jordan 4 Bred', false)).toBeVisible();
  await tab(page, 'Inbox');
  await expect(text(page, 'Order Received', false)).toBeVisible();
  await shot(page, '06-inbox');
});

test('signed-out tabs show a sign-in prompt, and sign-in returns to that tab', async ({ page }) => {
  // Create an account first via the booking sheet flow's sibling: the sign-in screen.
  const c = newCustomer();
  await page.goto('/');
  await tab(page, 'Orders');
  await expect(text(page, 'Sign in to see your orders', false)).toBeVisible();
  await tab(page, 'Inbox');
  await expect(text(page, 'Sign in to see your updates', false)).toBeVisible();
  await tab(page, 'Profile');
  await expect(text(page, 'Sign in to see your profile', false)).toBeVisible();
  await shot(page, '07-profile-guest');

  await tab(page, 'Orders');
  await text(page, 'Sign In').click();
  await expect(text(page, 'Welcome back', false)).toBeVisible();
  await text(page, "Don't have an account? Sign up", false).click();
  await placeholder(page, 'Geego').fill(c.name);
  await placeholder(page, 'you@email.com').fill(c.email);
  await placeholder(page, '••••••••').fill(c.password);
  await text(page, 'Create Account').click();

  await expect(page).toHaveURL(/\/orders$/);
  await expect(text(page, 'No orders yet', false)).toBeVisible();
  await shot(page, '08-orders-empty');
});

test('wrong password shows friendly copy, not the raw auth error', async ({ page }) => {
  await page.goto('/sign-in');
  await placeholder(page, 'you@email.com').fill('nobody@cleancrep.test');
  await placeholder(page, '••••••••').fill('wrong-password');
  await text(page, 'Sign In').click();
  await expect(text(page, "That email and password don't match", false)).toBeVisible();
  await expect(page.getByText(/Invalid login credentials/i)).toHaveCount(0);
  await shot(page, '09-signin-error');
});

test('services failing to load shows an error with retry, then recovers', async ({ page }) => {
  let fail = true;
  await page.route('**/rest/v1/services**', (route) => (fail ? route.abort('internetdisconnected') : route.continue()));
  await page.goto('/');
  await tab(page, 'Book');
  await expect(text(page, 'Something went wrong', false)).toBeVisible();
  await expectNoRawErrors(page);
  await shot(page, '10-book-error');

  fail = false;
  // Exact match: the error copy above the button also says "try again".
  await text(page, 'Try Again').click();
  await expect(text(page, 'Clarks Clean', false)).toBeVisible();
});

test('a failed booking insert shows friendly copy and a WhatsApp fallback', async ({ page }) => {
  const c = newCustomer();
  await page.route('**/rest/v1/orders**', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ code: '42501', message: 'new row violates row-level security policy for table "orders"' }),
        })
      : route.continue()
  );
  await page.goto('/');
  await fillBookingDetails(page, 'Clarks Clean', 'Desert Boot');
  await text(page, 'Confirm Booking').click();
  await text(page, "Don't have an account? Sign up", false).click();
  await placeholder(page, 'Geego').fill(c.name);
  await placeholder(page, 'you@email.com').fill(c.email);
  await placeholder(page, '••••••••').fill(c.password);
  await text(page, 'Create Account').click();

  await expect(text(page, /Couldn't place your booking/)).toBeVisible();
  await expect(text(page, 'Message us on WhatsApp', false)).toBeVisible();
  // The details the customer typed are still there to retry.
  await expect(placeholder(page, 'e.g. Nike Air Force 1, Clarks Desert Boot')).toHaveValue('Desert Boot');
  await expectNoRawErrors(page);
  await shot(page, '11-booking-error');
});
