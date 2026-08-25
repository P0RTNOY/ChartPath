import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.CHARTPATH_QA_BASE_URL ?? 'http://127.0.0.1:4174';

export default defineConfig({
  testDir: './e2e-qa',
  timeout: 180_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Pixel 7 Chromium',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
    {
      name: 'iPad Pro 11 Chromium',
      use: { ...devices['iPad Pro 11'], browserName: 'chromium' },
    },
  ],
  webServer: process.env.CHARTPATH_QA_BASE_URL
    ? undefined
    : {
        command: 'CI=1 pnpm --filter @chartpath/mobile exec expo start --web --port 4174 --clear',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
