import { defineConfig, devices } from '@playwright/test';

// Must match GALLERY_PORT in apps/sdk/gallery/vite.config.ts.
const GALLERY_URL = 'http://127.0.0.1:5190';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No local retries: a flaky check should show up, not be papered over.
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: './playwright-report' }]],
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'widget',
      testDir: './tests/widget',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: GALLERY_URL,
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    // Built and previewed rather than the dev server: no HMR, and nothing the
    // dev server might inject that a customer page would not have.
    command:
      'pnpm --filter @usertour/sdk gallery:build && pnpm --filter @usertour/sdk gallery:preview',
    url: GALLERY_URL,
    // Never reuse a server already on the port: it would serve whatever build
    // it started with, and the suite would pass against stale code.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
