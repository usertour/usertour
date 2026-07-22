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
    // Magnitude matters: Retry-After/Reset are SECONDS within the window.
    // A string-typed TTL froze Reset at a 12-digit epoch-like number (window
    // never reset); a double /1000 froze it at 1. Both must stay impossible.
    const retryAfter = Number(fourth.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(61);
    expect(fourth.headers['x-ratelimit-limit']).toBe('3');
    expect(fourth.headers['x-ratelimit-remaining']).toBe('0');
    const reset = Number(fourth.headers['x-ratelimit-reset']);
    expect(reset).toBeGreaterThan(0);
    expect(reset).toBeLessThanOrEqual(61);
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

describe('API v2 rate limit window reset (e2e)', () => {
  let app: INestApplication;
  const prevFallback = process.env.API_THROTTLE_FALLBACK_LIMIT;
  const prevTtl = process.env.API_THROTTLE_TTL;

  beforeAll(async () => {
    // Deliberately STRINGS (process.env always is): this is the exact shape
    // that turned `Date.now() + ttl` into string concatenation and made the
    // window immortal — quotas became lifetime totals.
    process.env.API_THROTTLE_FALLBACK_LIMIT = '2';
    process.env.API_THROTTLE_TTL = '2000';
    app = await createTestApp();
  }, 60000);

  afterAll(async () => {
    if (prevFallback === undefined)
      Reflect.deleteProperty(process.env, 'API_THROTTLE_FALLBACK_LIMIT');
    else process.env.API_THROTTLE_FALLBACK_LIMIT = prevFallback;
    if (prevTtl === undefined) Reflect.deleteProperty(process.env, 'API_THROTTLE_TTL');
    else process.env.API_THROTTLE_TTL = prevTtl;
    await app?.close();
  });

  it('the quota comes back after the window elapses (per minute, not per lifetime)', async () => {
    const call = () => request(app.getHttpServer()).get('/v2/projects/any/environments');
    await call();
    await call();
    const blocked = await call();
    expect(blocked.status).toBe(429);
    // Reset must be within the 2s window, not an epoch-sized number.
    expect(Number(blocked.headers['x-ratelimit-reset'])).toBeLessThanOrEqual(3);

    await new Promise((r) => setTimeout(r, 2500)); // let the window expire
    const revived = await call();
    expect(revived.status).not.toBe(429); // fresh quota — the window DID reset
  }, 15000);
});
