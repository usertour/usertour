import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from '../create-test-app';

/**
 * Rate limiting needs its own app with a tiny limit — the env is read at
 * module init, so it must be set BEFORE the app is created (and restored so
 * other suites keep the roomy default).
 */
describe('API v2 rate limiting (e2e)', () => {
  let app: INestApplication;
  const prevFallback = process.env.API_THROTTLE_FALLBACK_LIMIT;

  beforeAll(async () => {
    // Unknown credentials share the per-IP fallback bucket — tiny limit so the
    // suite can hit it fast. Valid-credential (plan) limits are exercised in
    // the attribute-definitions suite, which has token infrastructure.
    process.env.API_THROTTLE_FALLBACK_LIMIT = '3';
    app = await createTestApp();
  }, 60000);

  afterAll(async () => {
    if (prevFallback === undefined) {
      Reflect.deleteProperty(process.env, 'API_THROTTLE_FALLBACK_LIMIT');
    } else {
      process.env.API_THROTTLE_FALLBACK_LIMIT = prevFallback;
    }
    await app?.close();
  });

  it('unknown credentials share the per-IP bucket: rotating garbage bearers does not reset it', async () => {
    const call = (bearer: string) =>
      request(app.getHttpServer())
        .get('/v2/projects/any/environments')
        .set('Authorization', `Bearer ${bearer}`);
    // Three different garbage tokens — same IP bucket, all counted together.
    for (let i = 0; i < 3; i++) {
      const res = await call(`utp_garbage_${i}`);
      expect(res.status).not.toBe(429); // 403 invalid key — but counted
    }
    // Fourth request with YET ANOTHER fresh string: still throttled — rotating
    // credentials must not mint fresh buckets.
    const fourth = await call('utp_garbage_fresh');
    expect(fourth.status).toBe(429);
    expect(fourth.body.error?.code).toBe('E1013');
    // Standard RFC 9110 header, not the library's name-suffixed variant —
    // off-the-shelf retry middleware backs off on exactly this.
    expect(Number(fourth.headers['retry-after'])).toBeGreaterThan(0);
    // Standard unsuffixed rate-limit headers — the dashboard for pacing.
    expect(fourth.headers['x-ratelimit-limit']).toBe('3');
    expect(fourth.headers['x-ratelimit-remaining']).toBe('0');
    expect(Number(fourth.headers['x-ratelimit-reset'])).toBeGreaterThan(0);
  });
});

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
