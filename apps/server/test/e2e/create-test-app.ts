import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { PrismaService } from 'nestjs-prisma';

import { AppModule } from '@/app.module';
import { configureApp } from '@/configure-app';

/**
 * Boots the full application for an HTTP e2e spec. Connects to whatever
 * DATABASE_URL points at — run e2e with it pointed at a migrated test
 * database. Call once in `beforeAll`; `app.close()` in `afterAll`
 * (jest may need `--forceExit` because redis/bullmq/websocket keep handles).
 *
 * Pass `override` to swap providers before the module compiles — used by specs
 * that must mock external clients (e.g. Stripe, jsforce):
 *
 *   const app = await createTestApp((b) =>
 *     b.overrideProvider(StripeToken).useValue(mockStripe));
 */
export async function createTestApp(
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  const base = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await (override ? override(base) : base).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  // nestjs-prisma's PrismaService implements OnModuleInit only — `app.close()`
  // never `$disconnect()`s the Postgres pool. Harmless in production (process
  // exit closes the sockets), fatal here: jest REUSES worker processes across
  // suites, so every suite's pool (connection_limit=3, set in setup-e2e.ts)
  // leaked and accumulated — 59 suites × 3 > Postgres max_connections (100),
  // and the parallel full run drowned in "too many clients" 500s while
  // individual suites stayed green. Close the pool with the app.
  const close = app.close.bind(app);
  app.close = async () => {
    await close();
    await app.get(PrismaService).$disconnect();
  };
  return app;
}
