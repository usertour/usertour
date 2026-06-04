import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import { loadTestEnv } from './load-test-env';

/**
 * Brings the test database schema up to date once before any e2e spec runs, so
 * a freshly created test database (or one behind on migrations) just works.
 *
 * Subtlety worth knowing: the dev `apps/server/.env` composes DATABASE_URL and
 * DATABASE_DIRECT_URL from `${POSTGRES_DB}`, and the Prisma CLI's dotenv-expand
 * OVERRIDES the real environment variable for those interpolated values. So
 * passing only DATABASE_URL here is silently ignored and the migration would run
 * against the dev database. We therefore:
 *   - override the component the dev `.env` interpolates (POSTGRES_DB), which
 *     redirects both `url` and `directUrl` to the test database while keeping
 *     user/password/host/port from `.env`; and
 *   - also pass the full URLs for environments that have no `.env` (e.g. CI).
 * A guard refuses to run unless the target database name looks like a test
 * database, so we can never migrate the dev database by accident.
 */
export default async function globalSetup(): Promise<void> {
  const databaseUrl = loadTestEnv();
  if (!databaseUrl) {
    throw new Error(
      'e2e globalSetup: DATABASE_URL is empty. Provide apps/server/.env.test or export DATABASE_URL.',
    );
  }

  const dbName = new URL(databaseUrl).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `e2e globalSetup: refusing to migrate "${dbName}" — it does not look like a test database (expected a name ending in "_test"). Check apps/server/.env.test or DATABASE_URL.`,
    );
  }

  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DATABASE_DIRECT_URL: databaseUrl,
      // Redirect the dev .env's interpolated URLs at the test database.
      POSTGRES_DB: dbName,
    },
    stdio: 'inherit',
  });
}
