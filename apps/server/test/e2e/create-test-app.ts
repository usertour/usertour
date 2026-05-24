import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@/app.module';

/**
 * Boots the full application for an HTTP e2e spec. Connects to whatever
 * DATABASE_URL points at — run e2e with it pointed at a migrated test
 * database. Call once in `beforeAll`; `app.close()` in `afterAll`
 * (jest may need `--forceExit` because redis/bullmq/websocket keep handles).
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}
