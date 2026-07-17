import { loadTestEnv } from './load-test-env';

// Runs in each worker before the app is imported, so PrismaService picks up the
// test database URL.
loadTestEnv();

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
    process.env[variableName] = `${url}${separator}connection_limit=5&pool_timeout=60`;
  }
};
appendConnectionLimit('DATABASE_URL');
appendConnectionLimit('DATABASE_DIRECT_URL');
