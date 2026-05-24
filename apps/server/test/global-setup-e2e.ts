import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import { loadTestEnv } from './load-test-env';

/**
 * Brings the test database schema up to date once before any e2e spec runs, so
 * a freshly created test database (or one behind on migrations) just works.
 */
export default async function globalSetup(): Promise<void> {
  const databaseUrl = loadTestEnv();
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
