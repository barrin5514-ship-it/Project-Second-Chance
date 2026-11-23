import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  // Cold Vite dev-server transforms of the SDK bundle can be slower than a
  // normal page load on a busy machine. This only allows the same assertions
  // more time; it does not retry or weaken them. Codex's independent run saw
  // one page.goto timeout while the isolated case passed.
  timeout: 60_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // The pinned SDK asks for microphone consent before it requests a token, so
    // the no-key failure path must get past media setup to reach the server's
    // honest 503. A fake device and a pre-granted permission keep this
    // deterministic without a physical microphone; no provider is contacted.
    permissions: ['microphone'],
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
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
