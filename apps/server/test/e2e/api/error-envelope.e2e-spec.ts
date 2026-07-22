import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from '../create-test-app';

/**
 * The v2 error-envelope PROMISE: every /v2 error is `{ error: { code, ... } }`,
 * including exceptions thrown BEFORE any route handler exists — a malformed
 * JSON body (dies in the express body-parser middleware) and an unknown /v2
 * route (no controller matched). Both previously leaked Nest's bare
 * `{message, error, statusCode}` shape because the envelope filter is
 * controller-scoped; the global V2FallbackExceptionFilter closes that gap.
 * Non-/v2 paths must keep the default behavior.
 */
describe('API v2 error envelope fallback (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  it('a malformed JSON body returns the v2 envelope (400 E1017), not the framework shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/v2/projects/any/environments')
      .set('Content-Type', 'application/json')
      .send('{"name": "truncated'); // invalid JSON — dies in body-parser, before auth
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('E1017');
    expect(res.body.error?.message).toContain('Invalid JSON body');
    // The bare framework shape must NOT leak.
    expect(res.body.statusCode).toBeUndefined();
  });

  it('an unknown /v2 route returns the v2 envelope (404 E1033)', async () => {
    const res = await request(app.getHttpServer()).get('/v2/definitely/not/a/route');
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('E1033');
    expect(res.body.statusCode).toBeUndefined();
  });

  it('a non-/v2 unknown route keeps the default framework shape (no envelope hijack)', async () => {
    const res = await request(app.getHttpServer()).get('/definitely/not/a/route');
    expect(res.status).toBe(404);
    // Default Nest shape — proves the fallback only rewrites /v2 traffic.
    expect(res.body.statusCode).toBe(404);
    expect(res.body.error).not.toBeInstanceOf(Object);
  });
});
