import { expect, test } from '@playwright/test';
import { newCustomer, placeholder, shot, tab, text } from './helpers';

// Ask Creppie in the app. The relay (apps/web /api/creppie → n8n) is stubbed:
// what matters here is what the app sends and how it handles needsSignIn.
// The n8n side (guest blocked, signed-in booking lands on the account) is
// dry-run in n8n itself.

test('guest asks Creppie to book, is asked to sign in, and the booking goes ahead signed in', async ({ page }) => {
  const c = newCustomer();
  const calls: { body: { sessionId: string; message: string; channel: string }; auth: string | null }[] = [];
  await page.route('**/api/creppie', async (route) => {
    const req = route.request();
    const auth = req.headers()['authorization'] ?? null;
    calls.push({ body: req.postDataJSON(), auth });
    await route.fulfill({
      json: auth
        ? { reply: 'Locked in! 1 pair Sneaker Clean, drop-off Saturday. Check your Orders tab.', needsSignIn: false }
        : { reply: "Nearly there! Sign in or create your Clean Crep account first and I'll lock this booking in for you right away 👍", needsSignIn: true },
    });
  });

  await page.goto('/');
  await text(page, 'Ask Creppie').click();
  await expect(text(page, /Wah gwaan! I'm Creppie/)).toBeVisible();
  await shot(page, '20-creppie-open');

  await text(page, 'Book a clean').click();
  await expect(text(page, /Nearly there!/)).toBeVisible();
  await expect(text(page, 'Sign in to book')).toBeVisible();
  await shot(page, '21-creppie-sign-in-card');
  expect(calls[0].body).toMatchObject({ message: 'Book a clean', channel: 'app' });
  expect(calls[0].body.sessionId).toMatch(/^[0-9a-f-]{36}$/);
  expect(calls[0].auth).toBeNull();

  await text(page, 'Sign in or create account').click();
  await expect(text(page, 'One last step', false)).toBeVisible();
  await text(page, "Don't have an account? Sign up", false).click();
  await placeholder(page, 'Geego').fill(c.name);
  await placeholder(page, 'you@email.com').fill(c.email);
  await placeholder(page, '••••••••').fill(c.password);
  await text(page, 'Create Account').click();

  await expect(text(page, /Locked in!/)).toBeVisible();
  await expect(text(page, 'Sign in to book')).toHaveCount(0);
  await shot(page, '22-creppie-booked');
  expect(calls).toHaveLength(2);
  // Same conversation before and after signing in, now carrying the account's token.
  expect(calls[1].body).toMatchObject({ sessionId: calls[0].body.sessionId, message: "I've signed in, please go ahead and book it.", channel: 'app' });
  expect(calls[1].auth).toMatch(/^Bearer \S+$/);

  await page.getByLabel('Close chat').click();
  await tab(page, 'Book');
  await expect(text(page, 'Ask Creppie')).toBeVisible();
});
