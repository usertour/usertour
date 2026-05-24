import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Loads `apps/server/.env.test` into `process.env` so e2e specs run against the
 * dedicated test database without the caller passing DATABASE_URL. Kept
 * dependency-free (the file is a plain KEY=VALUE list); an already-set variable
 * is left untouched, so `DATABASE_URL=... pnpm test:e2e` still wins for one-offs.
 * Returns the resolved DATABASE_URL.
 */
export function loadTestEnv(): string {
  const envPath = resolve(__dirname, '../.env.test');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const separator = trimmed.indexOf('=');
      if (separator === -1) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      if (process.env[key] === undefined) {
        process.env[key] = trimmed
          .slice(separator + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  }
  return process.env.DATABASE_URL ?? '';
}
