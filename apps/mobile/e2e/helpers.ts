import { execFileSync } from 'node:child_process';
import type { Locator, Page } from '@playwright/test';

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.E2E_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.E2E_ANON_KEY ?? '';
const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

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

/** The Creppie mascot slot for a mood, on the active screen. */
export function mascot(page: Page, mood: 'loading' | 'empty' | 'error' | 'offline' | 'success' | 'signin'): Locator {
  return page.getByTestId(`creppie-${mood}`).and(onActiveScreen(page)).first();
}

export function placeholder(page: Page, value: string): Locator {
  return page.getByPlaceholder(value).and(onActiveScreen(page)).first();
}

/** Run SQL against the local database (for internals REST can't see, e.g. pg_net's queue). */
export function sql(query: string): string {
  return execFileSync('psql', [DB_URL, '-Atc', query], { encoding: 'utf8' }).trim();
}

/** Sign up through Supabase Auth's API (no UI) and return the user's session. */
export async function apiSignUp(c: { email: string; password: string; name: string }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: c.email, password: c.password, data: { name: c.name } }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`signup: ${res.status} ${JSON.stringify(body)}`);
  return { userId: body.user.id as string, accessToken: body.access_token as string };
}

/** Call PostgREST as a signed-in user (RLS applies). */
export async function asUser(accessToken: string, path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method ?? 'GET',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
