import { defineConfig, devices } from '@playwright/test';

// "Phone emulator" for automated checks: the Expo app rendered for web
// (react-native-web) inside Chromium emulating a Pixel 7 — mobile viewport,
// touch, mobile UA — talking to a real local Supabase (`supabase start`).
// It catches flow/UI/logic regressions; it is NOT a native Android runtime,
// so native-only behaviour (push delivery, native modules) still needs a device.
// Run via `npm run e2e` (scripts/e2e.sh sets up Supabase + env first).

const PORT = 8081;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: './e2e/.results',
  use: {
    ...devices['Pixel 7'],
    baseURL: `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npx expo start --web --port ${PORT} --offline`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      ...(process.env as Record<string, string>),
      CI: '1',
      BROWSER: 'none',
      EXPO_OFFLINE: '1',
      EXPO_NO_DEPENDENCY_VALIDATION: '1',
    },
  },
});
