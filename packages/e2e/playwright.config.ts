import { defineConfig, devices } from '@playwright/test';

// Must match GALLERY_PORT in apps/sdk/gallery/vite.config.ts.
const GALLERY_URL = 'http://127.0.0.1:5190';
// Must match RUNTIME_HOST_PORT in scripts/static-host.mjs and tests/sdk/fixtures.ts.
const RUNTIME_HOST_URL = 'http://127.0.0.1:5191';

// `E2E_PROJECT=sdk` skips the gallery build, which the runtime suite does not
// need; the widget suite (and a full run) still builds it.
const onlySdk = process.env.E2E_PROJECT === 'sdk';

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
    {
      // The built SDK bundle on a plain host page against a protocol server
      // the test controls (tests/sdk/fixtures.ts).
      name: 'sdk',
      testDir: './tests/sdk',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: RUNTIME_HOST_URL,
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: [
    {
      command: 'node scripts/static-host.mjs',
      url: `${RUNTIME_HOST_URL}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    ...(onlySdk
      ? []
      : [
          {
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
        ]),
  ],
});
