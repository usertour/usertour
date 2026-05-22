import { loadTestEnv } from './load-test-env';

// Runs in each worker before the app is imported, so PrismaService picks up the
// test database URL.
loadTestEnv();
