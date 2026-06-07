import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';

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
  return app;
}
