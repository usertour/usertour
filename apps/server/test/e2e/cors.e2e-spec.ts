import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './create-test-app';

/**
 * CORS is owned by the Nest app (enableCors in configure-app.ts), not the
 * reverse proxy — so it runs in THIS pipeline and is testable here (nginx is
 * absent in e2e). These pin the browser-MCP-critical facts:
 *  - the OAuth token/register endpoints (the browser OAuth flow's last steps)
 *    and /mcp + discovery carry `Access-Control-Allow-Origin`;
 *  - /mcp exposes `WWW-Authenticate` so a browser MCP client can read the 401
 *    challenge that bootstraps OAuth;
 *  - OPTIONS preflight is answered (204) by the app, from the same layer as the
 *    real response — no proxy/app drift.
 */
describe('CORS (app-owned, e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const ORIGIN = 'https://mcp.example.com';

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  it('answers an OPTIONS preflight (204) with Allow-Origin — from the app, not a proxy', async () => {
    const res = await http()
      .options('/oauth/token')
      .set('Origin', ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    // Reflected preflight headers cover whatever the client asked for (so the
    // MCP Mcp-* headers need no explicit allow-list).
    expect(res.headers['access-control-allow-headers']?.toLowerCase()).toContain('content-type');
  });

  it('sets Allow-Origin on the ACTUAL OAuth token response (the CORS gap this replaces)', async () => {
    // A bad grant still returns a normal (4xx) response the browser must be able
    // to read — the header must be on the real response, not only the preflight.
    const res = await http()
      .post('/oauth/token')
      .set('Origin', ORIGIN)
      .type('form')
      .send({ grant_type: 'authorization_code', code: 'nope' });
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('sets Allow-Origin on the OAuth DCR (register) response', async () => {
    const res = await http()
      .post('/oauth/register')
      .set('Origin', ORIGIN)
      .send({ redirect_uris: ['http://127.0.0.1:51999/cb'] });
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('exposes WWW-Authenticate on /mcp so a browser MCP client can read the 401 challenge', async () => {
    const res = await http()
      .post('/mcp')
      .set('Origin', ORIGIN)
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-expose-headers']).toMatch(/WWW-Authenticate/i);
  });

  it('sets Allow-Origin on the OAuth discovery metadata', async () => {
    const res = await http()
      .get('/.well-known/oauth-authorization-server')
      .set('Origin', ORIGIN)
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
