import { chromium, type FullConfig } from '@playwright/test';

/**
 * Warm-up: Metro answers "ready" before it has compiled the web bundle, and a
 * cold compile (fresh container) can outlast a single test's timeout. Load the
 * app once here — generous timeout — so every test starts against a built bundle.
 */
export default async function globalSetup(config: FullConfig) {
  const { baseURL, launchOptions } = config.projects[0].use; // any device works for warm-up
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  await page.goto(baseURL ?? 'http://localhost:8081', { timeout: 300_000 });
  await page.getByRole('tab', { name: 'Book' }).waitFor({ timeout: 300_000 });
  await browser.close();
}
