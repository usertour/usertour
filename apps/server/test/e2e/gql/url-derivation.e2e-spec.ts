// Env MUST be pinned before any import pulls in config.ts: the config object
// is evaluated once at module load, and every app booted in this jest process
// shares that snapshot — setting process.env inside a test changes nothing.
// ts-jest preserves this statements-before-imports order; do not convert these
// to an import-time helper or let a formatter move them below the imports.
// API_URL empty exercises the derive branch on apiUrl; MCP_SERVER_URL pinned
// exercises the config-wins branch on mcpServerUrl — both contracts, one app.
process.env.API_URL = '';
process.env.MCP_SERVER_URL = 'https://pinned.example/mcp';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { gqlData } from '../auth';
import { createTestApp } from '../create-test-app';

/**
 * The URL-derivation contract (resolveOrigin / resolveMcpResource) through the
 * real GraphQL pipeline: with no API_URL configured the URLs self-derive from
 * the request — scheme from X-Forwarded-Proto (the loopback peer is a trusted
 * hop under the default TRUST_PROXY), host AND PORT from the Host header (the
 * port half regressed once: nginx's $host strips it) — while a configured URL
 * always wins over whatever the request claims.
 */
describe('globalConfig URL derivation contract (e2e)', () => {
  let app: INestApplication;
  const QUERY = 'query { globalConfig { apiUrl mcpServerUrl } }';

  const fetchConfig = async (host: string, proto: string) => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Host', host)
      .set('X-Forwarded-Proto', proto)
      .send({ query: QUERY });
    return gqlData(res).globalConfig;
  };

  beforeAll(async () => {
    app = await createTestApp();
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  it('with API_URL unset, apiUrl derives from the request — scheme, host AND port', async () => {
    const config = await fetchConfig('example.test:8443', 'https');
    expect(config.apiUrl).toBe('https://example.test:8443');
  });

  it('derivation follows each request, not a cached first answer', async () => {
    const config = await fetchConfig('other.test', 'http');
    expect(config.apiUrl).toBe('http://other.test');
  });

  it('a configured URL wins over the request (MCP_SERVER_URL pinned here)', async () => {
    const config = await fetchConfig('example.test:8443', 'https');
    expect(config.mcpServerUrl).toBe('https://pinned.example/mcp');
  });
});
