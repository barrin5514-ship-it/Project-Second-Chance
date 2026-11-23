import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // No real credential is ever provided to the browser.
    extraHTTPHeaders: {},
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-narrow',
      use: { ...devices['Pixel 5'], browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      // Starts the API with a deliberately ABSENT key so no live provider call
      // and no credit spend can occur during the automated suite.
      command: 'npm run dev:api',
      url: 'http://127.0.0.1:3001/api/avatar/bootstrap',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PSC_E2E_NO_KEY: '1',
        PORT: '3001',
      },
    },
    {
      command: 'npm run dev:web',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
