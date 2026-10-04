import { expect, test, type Page } from '@playwright/test';
import { adminSelect, byTestId, mascot, newCustomer, placeholder, RAW_ERROR_PATTERNS, shot, tab, text } from './helpers';

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
  await expect(mascot(page, 'success')).toBeVisible();
  await expect(text(page, 'Jordan 4 Bred', false)).toBeVisible();
  // Push permission is offered here — after a booking, with the reason — never cold on launch.
  await expect(text(page, "Get a heads-up when it's ready?", false)).toBeVisible();
  await shot(page, '05-booked');
  await text(page, 'Turn on updates').click();
  await expect(text(page, "Updates on. We'll ping you the moment your pair is ready.", false)).toBeVisible();

  const [customer] = await adminSelect<{ id: string; name: string }>('customers', `email=eq.${encodeURIComponent(c.email)}&select=id,name`);
  expect(customer?.name).toBe(c.name);
  const orders = await adminSelect<{ item_name: string; notes: string }>('orders', `customer_id=eq.${customer.id}&select=item_name,notes`);
  expect(orders).toEqual([{ item_name: 'Jordan 4 Bred', notes: 'e2e run' }]);

  // Orders: the booking shows as a boarding-pass ticket on step 1 of the timeline.
  await tab(page, 'Orders');
  const ticket = byTestId(page, 'order-ticket');
  await expect(ticket.getByText('Jordan 4 Bred')).toBeVisible();
  await expect(ticket.getByText(/drop-off/i).first()).toBeVisible();
  await expect(ticket.getByText(/ready by/i).first()).toBeVisible();
  await expect(ticket.getByText('Sneaker Clean')).toBeVisible();
  await expect(byTestId(page, 'status-timeline')).toHaveAttribute('aria-label', 'Status: step 1 of 4');
  await shot(page, '06a-orders-ticket');
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
  await expect(mascot(page, 'signin')).toBeVisible();
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
  await expect(text(page, 'No kicks in the queue yet.', false)).toBeVisible();
  await expect(mascot(page, 'empty')).toBeVisible();
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
  await expect(text(page, "Can't reach the shop.", false)).toBeVisible();
  await expect(mascot(page, 'offline')).toBeVisible();
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

test('a server error (not offline) shows the error mascot with Creppie copy', async ({ page }) => {
  await page.route('**/rest/v1/services**', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'internal error', code: 'XX000' }) })
  );
  await page.goto('/');
  await tab(page, 'Book');
  await expect(text(page, 'Creppie slipped on a wet sole.', false)).toBeVisible();
  await expect(mascot(page, 'error')).toBeVisible();
  await expectNoRawErrors(page);
  await shot(page, '13-server-error');
});

test('booking with extras + CrepRun pickup: zone rate and day, and the database charges the same', async ({ page }) => {
  const c = newCustomer();
  await page.goto('/');
  await fillBookingDetails(page, 'Sneaker Clean', 'Dunk Low Panda');
  await expect(text(page, 'LEVEL IT UP', false)).toBeVisible();

  await text(page, 'Deep Clean Upgrade', false).click();
  await expect(page.getByRole('checkbox', { name: /Deep Clean Upgrade/ }).first()).toHaveAttribute('aria-checked', 'true');
  await text(page, 'Suede Revive Kit', false).click();
  await text(page, /^Pickup/).click();
  // No area picked yet: Confirm asks for one instead of booking.
  await text(page, 'Confirm Booking').click();
  await expect(text(page, /Pick your area/)).toBeVisible();
  await text(page, 'Zone 2 · Wednesdays', false).click();
  await expect(text(page, /CrepRun collects on Wed/)).toBeVisible();
  // $2,000 + $1,000 deep clean + $4,000 kit + $2,000 CrepRun Zone 2
  await expect(text(page, '$9,000')).toBeVisible();
  await expect(text(page, /We'll confirm stock/, false)).toBeVisible();
  await shot(page, '13-add-ons');

  await text(page, 'Confirm Booking').click();
  await text(page, "Don't have an account? Sign up", false).click();
  await placeholder(page, 'Geego').fill(c.name);
  await placeholder(page, 'you@email.com').fill(c.email);
  await placeholder(page, '••••••••').fill(c.password);
  await text(page, 'Create Account').click();

  await expect(text(page, "You're booked.", false)).toBeVisible();
  await expect(text(page, 'CrepRun Zone 2 (Wednesday)', false)).toBeVisible();
  await expect(text(page, '$9,000')).toBeVisible();
  await shot(page, '14-booked-with-extras');

  // The ticket lists the extras and says CrepRun collects, not drop-off.
  await tab(page, 'Orders');
  const ticket = byTestId(page, 'order-ticket');
  await expect(ticket.getByText(/CrepRun pickup/i).first()).toBeVisible();
  await expect(ticket.getByText(/Deep Clean Upgrade · Suede Revive Kit/)).toBeVisible();

  const [customer] = await adminSelect<{ id: string }>('customers', `email=eq.${encodeURIComponent(c.email)}&select=id`);
  const [order] = await adminSelect<{ price_cents: number; drop_method: string; scheduled_date: string; zone_id: string; add_ons: { name: string; kind: string }[] }>(
    'orders',
    `customer_id=eq.${customer.id}&select=price_cents,drop_method,scheduled_date,zone_id,add_ons`
  );
  expect(order.price_cents).toBe(900000);
  expect(order.drop_method).toBe('pickup');
  expect(order.zone_id).toBeTruthy();
  expect(new Date(`${order.scheduled_date}T12:00:00Z`).getUTCDay()).toBe(3); // Wednesday
  expect(order.add_ons.map((a) => a.name)).toEqual(['Deep Clean Upgrade', 'Suede Revive Kit', 'CrepRun Zone 2 (Wednesday)']);
});
