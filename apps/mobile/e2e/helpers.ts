import type { Locator, Page } from '@playwright/test';

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.E2E_SERVICE_ROLE_KEY ?? '';

/** Unique throwaway customer per run. Local Supabase has email confirmation off. */
export function newCustomer() {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return { name: `E2E ${id}`, email: `e2e+${id}@cleancrep.test`, password: 'test-pass-123' };
}

/** Read rows with the service role (bypasses RLS) to verify what the app wrote. */
export async function adminSelect<T = Record<string, unknown>>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`adminSelect ${table}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T[];
}

export async function adminUpdate(table: string, query: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`adminUpdate ${table}: ${res.status} ${await res.text()}`);
}

/** Save a step screenshot when E2E_SHOTS=1 (for eyeballing layouts). */
export async function shot(page: Page, name: string) {
  if (!process.env.E2E_SHOTS) return;
  await page.screenshot({ path: `e2e/.shots/${name}.png` });
}

/** Tap a bottom tab by its label. */
export async function tab(page: Page, label: 'Home' | 'Book' | 'Orders' | 'Inbox' | 'Profile') {
  await page.getByRole('tab', { name: label }).click();
}

/** Raw backend error strings that must never be shown to customers. */
export const RAW_ERROR_PATTERNS = [/row-level security/i, /violates/i, /PGRST/i, /TypeError/i, /Failed to fetch/i, /JWT/i, /duplicate key/i];

/**
 * Text on the *active* screen only. Tab screens stay mounted on web, stacked
 * under the focused one inside an aria-hidden="true" container, so a plain
 * getByText would also match the same words on a hidden tab.
 */
function onActiveScreen(page: Page): Locator {
  return page.locator('xpath=//*[not(ancestor-or-self::*[@aria-hidden="true"])]');
}

export function text(page: Page, value: string | RegExp, exact = true): Locator {
  return page
    .getByText(value, typeof value === 'string' ? { exact } : undefined)
    .and(onActiveScreen(page))
    .first();
}

export function placeholder(page: Page, value: string): Locator {
  return page.getByPlaceholder(value).and(onActiveScreen(page)).first();
}
