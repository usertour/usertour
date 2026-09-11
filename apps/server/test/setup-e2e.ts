import { loadTestEnv } from './load-test-env';

// Runs in each worker before the app is imported, so PrismaService picks up the
// test database URL.
loadTestEnv();

// Redis is shared with whatever dev server is running on this machine; the
// suite takes its own logical database so queue jobs, locks and sync cursors
// never cross over (a dev worker used to consume e2e jobs, and e2e runs used
// to reset the dev server's journal cursor). `Redis_DB=...` still wins.
process.env.Redis_DB ??= '1';

// Cap each app instance's Prisma pool. The default pool size is
// `physical CPUs × 2 + 1` PER booted application, and every e2e suite boots a
// full AppModule in parallel jest workers — with enough suites the combined
// pools blow past Postgres max_connections (100) and specs start failing with
// "sorry, too many clients already". Suites are short and mostly sequential
// inside a worker; a small pool costs little and keeps the whole run bounded.
const appendConnectionLimit = (variableName: string): void => {
  const url = process.env[variableName];
  if (url && !url.includes('connection_limit=')) {
    const separator = url.includes('?') ? '&' : '?';
    process.env[variableName] = `${url}${separator}connection_limit=3&pool_timeout=60`;
  }
};
appendConnectionLimit('DATABASE_URL');
appendConnectionLimit('DATABASE_DIRECT_URL');
