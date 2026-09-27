import { defineConfig, devices } from '@playwright/test';

// "Phone emulators" for automated checks: the Expo app rendered for web
// (react-native-web) in Chromium emulating two phones — a Pixel 7 and an
// iPhone 15 Pro (viewport, pixel density, touch, user agent) — talking to a
// real local Supabase (`supabase start`). Every journey runs on both.
// It catches flow/UI/logic/layout regressions at both screen sizes; it is NOT
// a native Android or iOS runtime (the iPhone profile renders with Chromium,
// not Safari/WebKit, and has no notch/safe-area), so native-only behaviour
// (push delivery, native modules, notch insets) still needs a real device.
// Run via `npm run e2e` (scripts/e2e.sh sets up Supabase + env first).

const PORT = 8081;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: './e2e/.results',
  projects: [
    { name: 'android-pixel-7', use: { ...devices['Pixel 7'] } },
    // Playwright's iPhone profiles default to WebKit; only Chromium is available
    // in the cloud sandbox, so keep the iPhone's size/density/UA on Chromium.
    { name: 'iphone-15-pro', use: { ...devices['iPhone 15 Pro'], browserName: 'chromium', defaultBrowserType: 'chromium' } },
  ],
  use: {
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
