import { createHash, randomBytes } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { OAUTH_TOKEN_PREFIX, hashApiTokenSecret } from '@/api-token/api-token.crypto';

import { buildEnvironment, buildMembership, buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Real-DB e2e for the OAuth 2.1 authorization server backing the MCP endpoint:
 * Dynamic Client Registration → authorize (PKCE) → consent → token exchange →
 * an MCP call with the issued `uto_` token → refresh rotation + reuse rejection
 * → revoke. Plus the DCR redirect-URI allowlist.
 */
describe('OAuth 2.1 AS for MCP (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let envMain: string;
  let ownerUserId: string;
  let projectId: string;
  let clientId: string;

  const redirectUri = 'http://127.0.0.1:51999/callback';
  const verifier = randomBytes(40).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    projectId = (await buildProject(prisma, { name: 'oauth-e2e' })).id;
    envMain = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      if (clientId) {
        await prisma.oAuthAuthorizationCode.deleteMany({ where: { clientId } });
        await prisma.oAuthGrant.deleteMany({ where: { clientId } });
        await prisma.oAuthClient.deleteMany({ where: { id: clientId } });
      }
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  it('exposes protected-resource + authorization-server metadata', async () => {
    const prm = await http().get('/.well-known/oauth-protected-resource').expect(200);
    expect(prm.body.resource).toMatch(/\/mcp$/);
    expect(prm.body.authorization_servers).toHaveLength(1);

    const as = await http().get('/.well-known/oauth-authorization-server').expect(200);
    expect(as.body.code_challenge_methods_supported).toEqual(['S256']);
    expect(as.body.grant_types_supported).toContain('authorization_code');
  });

  it('rejects a non-allowlisted DCR redirect_uri', async () => {
    await http()
      .post('/oauth/register')
      .send({ client_name: 'Evil', redirect_uris: ['https://evil.example.com/cb'] })
      .expect(400);
  });

  it('registers a public client (DCR)', async () => {
    const res = await http()
      .post('/oauth/register')
      .send({
        client_name: 'E2E MCP',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
      })
      .expect(201);
    expect(res.body.client_id).toBeTruthy();
    expect(res.body.token_endpoint_auth_method).toBe('none');
    clientId = res.body.client_id;
  });

  it('reads a client registration with a case-insensitive bearer scheme (RFC 7235)', async () => {
    const reg = await http()
      .post('/oauth/register')
      .send({
        client_name: 'E2E bearer-case',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
      })
      .expect(201);
    const cid = reg.body.client_id as string;
    const rat = reg.body.registration_access_token as string;
    expect(rat).toBeTruthy();

    // Lowercase `bearer` is spec-valid (RFC 7235 §2.1) and must be accepted — it
    // returned 401 before the fix.
    const lower = await http().get(`/oauth/register/${cid}`).set('Authorization', `bearer ${rat}`);
    expect(lower.status).toBe(200);
    expect(lower.body.client_id).toBe(cid);

    // Canonical `Bearer` still works.
    const upper = await http().get(`/oauth/register/${cid}`).set('Authorization', `Bearer ${rat}`);
    expect(upper.status).toBe(200);
  });

  it('requires PKCE on authorize and redirects to consent when valid', async () => {
    await http()
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'content:read',
      })
      .expect(400); // no PKCE

    const res = await http()
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'content:read content:create',
        state: 'st1',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      })
      .expect(302);
    expect(res.headers.location).toContain('/oauth-consent?transaction=');
  });

  it('runs the full consent → token → MCP → refresh → revoke flow', async () => {
    // authorize → transaction
    const auth = await http()
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'content:read content:create',
        state: 'st1',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      })
      .expect(302);
    const transaction = new URL(auth.headers.location).searchParams.get('transaction') as string;

    // consent-info (authenticated user) lists the grantable project + scopes
    const info = await http()
      .get('/oauth/consent-info')
      .query({ transaction })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(info.body.projects.some((p: { id: string }) => p.id === projectId)).toBe(true);

    // approve → authorization code
    const consent = await http()
      .post('/oauth/authorize/consent')
      .set('Authorization', `Bearer ${ownerToken}`)
      // Full-role grant includes env-targeted scopes — environments must be named now.
      .send({ transaction, projectId, approved: true, environmentIds: [envMain] })
      .expect(201);
    const redirect = new URL(consent.body.redirect);
    expect(redirect.searchParams.get('state')).toBe('st1');
    const code = redirect.searchParams.get('code') as string;
    expect(code).toBeTruthy();

    // token exchange (PKCE)
    const tok = await http()
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier,
      })
      .expect(200);
    expect(tok.body.access_token).toMatch(/^uto_/);
    expect(tok.body.refresh_token).toMatch(/^utr_/);
    expect(tok.body.scope).toContain('content:read');

    // the issued token is accepted by the unchanged MCP guard (not 401)
    const mcp = await http()
      .post('/mcp')
      .set('Authorization', `Bearer ${tok.body.access_token}`)
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(mcp.status).not.toBe(401);

    // a single-use code can't be replayed
    await http()
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier,
      })
      .expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));

    // refresh rotates
    const refreshed = await http()
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: tok.body.refresh_token,
        client_id: clientId,
      })
      .expect(200);
    expect(refreshed.body.access_token).toMatch(/^uto_/);
    expect(refreshed.body.refresh_token).not.toBe(tok.body.refresh_token);

    // the old refresh token is now rejected (rotation / reuse detection)
    await http()
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: tok.body.refresh_token,
        client_id: clientId,
      })
      .expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));

    // revoke the access token → MCP now 401
    await http().post('/oauth/revoke').send({ token: refreshed.body.access_token }).expect(201);
    const after = await http()
      .post('/mcp')
      .set('Authorization', `Bearer ${refreshed.body.access_token}`)
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(after.status).toBe(401);
  });

  // Run authorize (PKCE) → consent → token exchange for a client and return the
  // token response. `tokenExtra` carries a confidential client's `client_secret`.
  async function runFlow(cid: string, tokenExtra: Record<string, string> = {}) {
    const auth = await http()
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: cid,
        redirect_uri: redirectUri,
        scope: 'content:read',
        state: 'st',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      })
      .expect(302);
    const transaction = new URL(auth.headers.location).searchParams.get('transaction') as string;
    const consent = await http()
      .post('/oauth/authorize/consent')
      .set('Authorization', `Bearer ${ownerToken}`)
      // Full-role grant includes env-targeted scopes — environments must be named now.
      .send({ transaction, projectId, approved: true, environmentIds: [envMain] })
      .expect(201);
    const code = new URL(consent.body.redirect).searchParams.get('code') as string;
    const tok = await http()
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: cid,
        code_verifier: verifier,
        ...tokenExtra,
      })
      .expect(200);
    return tok.body;
  }

  it('revoking a REFRESH token kills the grant (RFC 7009 refresh path)', async () => {
    // Own client so this doesn't disturb the module client's grant (saveToken's
    // replace-semantics would revoke a sibling grant for the same user+client).
    const reg = await http()
      .post('/oauth/register')
      .send({
        client_name: 'Revoke-refresh',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
      })
      .expect(201);
    const cid = reg.body.client_id as string;
    try {
      const tokens = await runFlow(cid);
      // Revoke the REFRESH token (not the access token). The grant's refresh hash is
      // over the FULL `utr_…` string, so revoke must hash it whole to find the grant —
      // the old prefix-stripping made this a silent no-op.
      await http().post('/oauth/revoke').send({ token: tokens.refresh_token }).expect(201);
      // The refresh token can no longer mint tokens…
      await http()
        .post('/oauth/token')
        .type('form')
        .send({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: cid })
        .expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));
      // …and the grant's access token is dead too (revokeGrant deactivated it).
      const mcp = await http()
        .post('/mcp')
        .set('Authorization', `Bearer ${tokens.access_token}`)
        .set('Accept', 'application/json, text/event-stream')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
      expect(mcp.status).toBe(401);
    } finally {
      await prisma.oAuthGrant.deleteMany({ where: { clientId: cid } });
      await prisma.oAuthAuthorizationCode.deleteMany({ where: { clientId: cid } });
      await prisma.oAuthClient.deleteMany({ where: { id: cid } });
    }
  });

  it('re-authorizing supersedes the prior grant atomically — old dead, new live', async () => {
    // A fresh authorization for the same (user, client, project) revokes the prior
    // grant AND issues the new one in ONE transaction, so a mid-way failure can\'t
    // leave the user with neither. Own client to avoid disturbing the module grant.
    const reg = await http()
      .post('/oauth/register')
      .send({
        client_name: 'Re-authorize',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
      })
      .expect(201);
    const cid = reg.body.client_id as string;
    try {
      const first = await runFlow(cid);
      const second = await runFlow(cid); // supersedes `first`

      // New access token works…
      const live = await http()
        .post('/mcp')
        .set('Authorization', `Bearer ${second.access_token}`)
        .set('Accept', 'application/json, text/event-stream')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
      expect(live.status).not.toBe(401);

      // …the old access token is dead (its grant was revoked in the same tx)…
      const dead = await http()
        .post('/mcp')
        .set('Authorization', `Bearer ${first.access_token}`)
        .set('Accept', 'application/json, text/event-stream')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
      expect(dead.status).toBe(401);

      // …and the old refresh token no longer mints (its grant hash was cleared).
      await http()
        .post('/oauth/token')
        .type('form')
        .send({ grant_type: 'refresh_token', refresh_token: first.refresh_token, client_id: cid })
        .expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));

      // Exactly one live grant remains for the pair.
      const active = await prisma.oAuthGrant.count({
        where: { clientId: cid, revokedAt: null },
      });
      expect(active).toBe(1);
    } finally {
      await prisma.oAuthGrant.deleteMany({ where: { clientId: cid } });
      await prisma.oAuthAuthorizationCode.deleteMany({ where: { clientId: cid } });
      await prisma.oAuthClient.deleteMany({ where: { id: cid } });
    }
  });

  it('a confidential client MUST present its secret on refresh (RFC 6749 §6)', async () => {
    const reg = await http()
      .post('/oauth/register')
      .send({
        client_name: 'Confidential',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'client_secret_post',
      })
      .expect(201);
    const cid = reg.body.client_id as string;
    const secret = reg.body.client_secret as string;
    expect(secret).toBeTruthy();
    try {
      // Code exchange authenticates with the secret.
      const tokens = await runFlow(cid, { client_secret: secret });
      // Refresh WITHOUT the secret is rejected — the hole this closes (an attacker
      // holding only the refresh token can't mint new ones).
      await http()
        .post('/oauth/token')
        .type('form')
        .send({
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
          client_id: cid,
        })
        .expect((r) => expect(r.status).toBeGreaterThanOrEqual(400));
      // Refresh WITH the correct secret still works.
      const ok = await http()
        .post('/oauth/token')
        .type('form')
        .send({
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
          client_id: cid,
          client_secret: secret,
        })
        .expect(200);
      expect(ok.body.access_token).toMatch(/^uto_/);
    } finally {
      await prisma.oAuthGrant.deleteMany({ where: { clientId: cid } });
      await prisma.oAuthAuthorizationCode.deleteMany({ where: { clientId: cid } });
      await prisma.oAuthClient.deleteMany({ where: { id: cid } });
    }
  });

  it('grants the full role when the client requests no scope', async () => {
    const reg = await http()
      .post('/oauth/register')
      .send({
        client_name: 'No-Scope MCP',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
      })
      .expect(201);
    const cid = reg.body.client_id as string;
    const v = randomBytes(40).toString('base64url');
    const ch = createHash('sha256').update(v).digest('base64url');

    const auth = await http()
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: cid,
        redirect_uri: redirectUri,
        code_challenge: ch,
        code_challenge_method: 'S256',
      })
      .expect(302); // note: NO scope param
    const transaction = new URL(auth.headers.location).searchParams.get('transaction') as string;

    const consent = await http()
      .post('/oauth/authorize/consent')
      .set('Authorization', `Bearer ${ownerToken}`)
      // Full-role grant includes env-targeted scopes — environments must be named now.
      .send({ transaction, projectId, approved: true, environmentIds: [envMain] })
      .expect(201);
    const code = new URL(consent.body.redirect).searchParams.get('code') as string;

    const tok = await http()
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: cid,
        code_verifier: v,
      })
      .expect(200);
    // No requested scope → the OWNER's full role is granted (many capabilities).
    expect(tok.body.scope).toBeTruthy();
    expect(tok.body.scope.split(' ').length).toBeGreaterThan(1);
    expect(tok.body.scope).toContain('content:read');

    await prisma.oAuthAuthorizationCode.deleteMany({ where: { clientId: cid } });
    await prisma.oAuthGrant.deleteMany({ where: { clientId: cid } });
    await prisma.oAuthClient.deleteMany({ where: { id: cid } });
  });

  it('ignores unrecognized scope tokens (RFC 6749 §3.3) instead of dead-ending consent', async () => {
    const reg = await http()
      .post('/oauth/register')
      .send({
        client_name: 'OIDC-Default MCP',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
      })
      .expect(201);
    const cid = reg.body.client_id as string;

    // A generic client's OIDC default (`openid profile email`) names no scope we
    // issue. Before the fix this reached consent with requested ∩ role = ∅ —
    // nothing grantable, approve permanently disabled. Now the unknown tokens
    // are dropped at authorize time and the flow behaves like "no scope
    // requested": full role offered, user consents.
    const v1 = randomBytes(40).toString('base64url');
    const ch1 = createHash('sha256').update(v1).digest('base64url');
    const auth1 = await http()
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: cid,
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        code_challenge: ch1,
        code_challenge_method: 'S256',
      })
      .expect(302);
    const tx1 = new URL(auth1.headers.location).searchParams.get('transaction') as string;

    const info = await http()
      .get('/oauth/consent-info')
      .query({ transaction: tx1 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(info.body.requestedScopes).toEqual([]); // unknowns filtered out

    const consent1 = await http()
      .post('/oauth/authorize/consent')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ transaction: tx1, projectId, approved: true, environmentIds: [envMain] })
      .expect(201);
    const code1 = new URL(consent1.body.redirect).searchParams.get('code') as string;
    const tok1 = await http()
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: code1,
        redirect_uri: redirectUri,
        client_id: cid,
        code_verifier: v1,
      })
      .expect(200);
    expect(tok1.body.scope.split(' ').length).toBeGreaterThan(1); // full role
    expect(tok1.body.scope).not.toContain('openid');

    // Mixed request: the known capability survives, the OIDC noise is dropped —
    // the grant stays EXACTLY what was recognized (no widening to full role).
    const v2 = randomBytes(40).toString('base64url');
    const ch2 = createHash('sha256').update(v2).digest('base64url');
    const auth2 = await http()
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: cid,
        redirect_uri: redirectUri,
        scope: 'openid content:read',
        code_challenge: ch2,
        code_challenge_method: 'S256',
      })
      .expect(302);
    const tx2 = new URL(auth2.headers.location).searchParams.get('transaction') as string;
    const consent2 = await http()
      .post('/oauth/authorize/consent')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ transaction: tx2, projectId, approved: true })
      .expect(201);
    const code2 = new URL(consent2.body.redirect).searchParams.get('code') as string;
    const tok2 = await http()
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: code2,
        redirect_uri: redirectUri,
        client_id: cid,
        code_verifier: v2,
      })
      .expect(200);
    expect(tok2.body.scope).toBe('content:read');

    await prisma.oAuthAuthorizationCode.deleteMany({ where: { clientId: cid } });
    await prisma.oAuthGrant.deleteMany({ where: { clientId: cid } });
    await prisma.oAuthClient.deleteMany({ where: { id: cid } });
  });

  it('consent with environmentIds → the issued OAuth token + grant are env-scoped', async () => {
    const env = await buildEnvironment(prisma, { projectId });
    const reg = await http()
      .post('/oauth/register')
      .send({
        client_name: 'Env MCP',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
      })
      .expect(201);
    const cid = reg.body.client_id as string;
    const v = randomBytes(40).toString('base64url');
    const ch = createHash('sha256').update(v).digest('base64url');

    const auth = await http()
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: cid,
        redirect_uri: redirectUri,
        scope: 'content:read content:publish',
        code_challenge: ch,
        code_challenge_method: 'S256',
      })
      .expect(302);
    const transaction = new URL(auth.headers.location).searchParams.get('transaction') as string;

    // consent-info now exposes each project's environments + capabilities + the requested scopes.
    const info = await http()
      .get('/oauth/consent-info')
      .query({ transaction })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const proj = info.body.projects.find((p: { id: string }) => p.id === projectId);
    expect(proj.environments.some((e: { id: string }) => e.id === env.id)).toBe(true);
    expect(proj.capabilities).toContain('content:publish');
    expect(info.body.requestedScopes).toContain('content:publish');

    // approve, scoped to ONLY the new environment
    const consent = await http()
      .post('/oauth/authorize/consent')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transaction,
        projectId,
        approved: true,
        scopes: ['content:read', 'content:publish'],
        environmentIds: [env.id],
      })
      .expect(201);
    const code = new URL(consent.body.redirect).searchParams.get('code') as string;

    const tok = await http()
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: cid,
        code_verifier: v,
      })
      .expect(200);
    expect(tok.body.access_token).toMatch(/^uto_/);

    // the env scope rode consent → code → grant → issued ApiToken
    const row = await prisma.apiToken.findFirst({ where: { clientId: cid } });
    expect(row?.allowedEnvironmentIds).toEqual([env.id]);
    const grant = await prisma.oAuthGrant.findFirst({ where: { clientId: cid } });
    expect(grant?.allowedEnvironmentIds).toEqual([env.id]);

    // Connected apps surfaces the granted environment by name (null = all).
    const conns = await http()
      .post('/graphql')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ query: '{ oauthConnections { clientName environmentNames } }' })
      .expect(200);
    const conn = conns.body.data.oauthConnections.find(
      (c: { clientName: string }) => c.clientName === 'Env MCP',
    );
    expect(conn.environmentNames).toEqual([env.name]);

    await prisma.apiToken.deleteMany({ where: { clientId: cid } });
    await prisma.oAuthAuthorizationCode.deleteMany({ where: { clientId: cid } });
    await prisma.oAuthGrant.deleteMany({ where: { clientId: cid } });
    await prisma.oAuthClient.deleteMany({ where: { id: cid } });
  });

  it('reports lastUsedAt from the grant column after its token rows are pruned', async () => {
    // The durable rollup: an idle OAuth connection's short-lived token rows get
    // deleted by the hourly expiry cleanup, which first rolls their max lastUsedAt
    // onto the grant. listConnections must then read it from the grant column,
    // not show the connection as "never used".
    const client = await prisma.oAuthClient.create({
      data: {
        name: 'Rollup MCP',
        redirectUris: [redirectUri],
        clientType: 'public',
        grantTypes: ['authorization_code', 'refresh_token'],
      },
    });
    const used = new Date('2026-07-09T12:34:56Z');
    await prisma.oAuthGrant.create({
      data: {
        userId: ownerUserId,
        clientId: client.id,
        projectId,
        scopes: ['content:read'],
        lastUsedAt: used, // rolled up; NO live apiToken rows for this grant
      },
    });

    const conns = await http()
      .post('/graphql')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ query: '{ oauthConnections { clientName lastUsedAt } }' })
      .expect(200);
    const conn = conns.body.data.oauthConnections.find(
      (c: { clientName: string }) => c.clientName === 'Rollup MCP',
    );
    expect(conn).toBeDefined();
    expect(new Date(conn.lastUsedAt).toISOString()).toBe(used.toISOString());

    await prisma.oAuthGrant.deleteMany({ where: { clientId: client.id } });
    await prisma.oAuthClient.deleteMany({ where: { id: client.id } });
  });

  it('lists and revokes the connection over GraphQL', async () => {
    const list = await http()
      .post('/graphql')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ query: '{ oauthConnections { id clientName projectName scopes } }' })
      .expect(200);
    const conns = list.body.data.oauthConnections as { id: string; clientName: string }[];
    expect(conns.length).toBeGreaterThanOrEqual(1);

    const id = conns[0].id;
    const rev = await http()
      .post('/graphql')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ query: `mutation { revokeOAuthConnection(id: "${id}") }` })
      .expect(200);
    expect(rev.body.data.revokeOAuthConnection).toBe(true);
  });

  // An OAuth (`uto_`) token is validated by the same guard/authority as a personal
  // token, so live membership + role∩scope apply identically. These assert it for
  // the OAuth surface directly (the v2 spec covers it for `utp_`). Uses an isolated
  // project + a fixture `uto_` token so mutating role/membership can't affect the
  // other tests.
  describe('live authority on an OAuth (uto_) token', () => {
    let secProjectId: string;
    let utoToken: string;

    beforeAll(async () => {
      secProjectId = (await buildProject(prisma, { name: 'oauth-authz' })).id;
      await buildEnvironment(prisma, { projectId: secProjectId });
      await buildMembership(prisma, {
        userId: ownerUserId,
        projectId: secProjectId,
        role: 'ADMIN' as never,
      });
      const secret = randomBytes(32).toString('base64url');
      await prisma.apiToken.create({
        data: {
          userId: ownerUserId,
          name: 'OAuth authz test',
          prefix: OAUTH_TOKEN_PREFIX,
          hashedSecret: hashApiTokenSecret(secret),
          partialKey: secret.slice(-4),
          scopes: ['content:read', 'content:create'],
          clientId: 'authz-test-client',
          isActive: true,
          projects: { create: [{ projectId: secProjectId }] },
        },
      });
      utoToken = `${OAUTH_TOKEN_PREFIX}${secret}`;
    });

    afterAll(async () => {
      await teardownProject(prisma, secProjectId);
    });

    it('reads the project as ADMIN', async () => {
      await http()
        .get(`/v2/projects/${secProjectId}/content`)
        .set('Authorization', `Bearer ${utoToken}`)
        .expect(200);
    });

    it('respects live role: after downgrade to VIEWER, read works but write is denied', async () => {
      await prisma.userOnProject.updateMany({
        where: { userId: ownerUserId, projectId: secProjectId },
        data: { role: 'VIEWER' as never },
      });
      // VIEWER keeps content:read
      await http()
        .get(`/v2/projects/${secProjectId}/content`)
        .set('Authorization', `Bearer ${utoToken}`)
        .expect(200);
      // VIEWER lacks content:create — the guard rejects before body validation
      const write = await http()
        .post(`/v2/projects/${secProjectId}/content`)
        .set('Authorization', `Bearer ${utoToken}`)
        .send({});
      expect(write.status).toBe(403);
      expect(write.body.error.code).toBe('E1012');
    });

    it('is cut off entirely when the user loses project membership', async () => {
      await prisma.userOnProject.deleteMany({
        where: { userId: ownerUserId, projectId: secProjectId },
      });
      const res = await http()
        .get(`/v2/projects/${secProjectId}/content`)
        .set('Authorization', `Bearer ${utoToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1011');
    });
  });
});
