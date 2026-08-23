import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'tablet-chromium',
      use: { ...devices['iPad Pro 11'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm web:e2e:serve',
    port: 4173,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
