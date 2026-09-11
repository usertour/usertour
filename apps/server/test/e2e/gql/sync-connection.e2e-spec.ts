import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';
import { EncryptionService } from '@/shared/encryption.service';
import { INTEGRATION_TX_COOKIE } from '@/utils/cookie';
import * as hubspotApi from '@/integrations/sync/hubspot-api';
import { HubspotJournalService } from '@/integrations/sync/hubspot-journal.service';
import { ObjectSyncService } from '@/integrations/sync/object-sync.service';

import { graphql, gqlData, gqlErrorCode } from '../auth';
import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';
import { createTestApp } from '../create-test-app';

const START_OAUTH = `mutation ($data: StartIntegrationOAuthInput!) {
  startIntegrationOAuth(data: $data) { url }
}`;
const DISCONNECT = `mutation ($data: IntegrationIdInput!) {
  disconnectIntegrationOAuth(data: $data) { id enabled connected remoteAccountId remoteAccountLabel }
}`;
const UPSERT_INTEGRATION = `mutation ($data: UpsertIntegrationInput!) {
  upsertIntegration(data: $data) { id }
}`;
const LIST_INTEGRATIONS = `query ($environmentId: String!) {
  listIntegrations(environmentId: $environmentId) { id provider enabled connected remoteAccountId remoteAccountLabel }
}`;

/**
 * CRM connection lifecycle (ADR 0013 §2-3) over GraphQL plus the HubSpot
 * OAuth callback route. Provider HTTP calls are stubbed at the module
 * boundary — the handshake's wire format is HubSpot's, not ours to test.
 */
describe('GraphQL CRM connections (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let configService: ConfigService;
  let projectId: string;
  let environmentId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    configService = app.get(ConfigService);

    const project = await buildProject(prisma, { name: 'gql-sync-connection' });
    projectId = project.id;
    // CRM integrations are Growth+ on cloud (ADR 0013 §10).
    await buildSubscription(prisma, { projectId, planType: 'growth' });
    const environment = await buildEnvironment(prisma, { projectId });
    environmentId = environment.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.integration.deleteMany({ where: { environmentId } });
  });

  const withAppCredentials = (clientId: string | null) => {
    configService.set('hubspot.clientId', clientId ?? '');
    configService.set('hubspot.clientSecret', clientId ? 'secret' : '');
    configService.set(
      'hubspot.callbackUrl',
      'https://api.example.test/api/integrations/hubspot/oauth/callback',
    );
  };

  /**
   * Start the handshake as the browser would: run the mutation and keep the
   * state from the authorize URL plus the transaction cookie its response set.
   */
  const beginHandshake = async (returnUrl?: string) => {
    const start = await graphql(app, {
      token,
      query: START_OAUTH,
      variables: {
        data: { environmentId, provider: 'hubspot', ...(returnUrl ? { returnUrl } : {}) },
      },
    });
    const state = new URL(gqlData(start).startIntegrationOAuth.url).searchParams.get('state') ?? '';
    const cookie = (start.headers['set-cookie'] as unknown as string[] | undefined)?.find(
      (header) => header.startsWith(`${INTEGRATION_TX_COOKIE}=`),
    );
    return { state, cookie: cookie?.split(';')[0] ?? '' };
  };

  it('rejects the key-based upsert for a CRM provider', async () => {
    const res = await graphql(app, {
      token,
      query: UPSERT_INTEGRATION,
      variables: { data: { environmentId, provider: 'hubspot', key: 'x' } },
    });
    expect(res.body.errors?.[0]?.message).toContain('OAuth');
  });

  it('refuses to start when the server has no app credentials', async () => {
    withAppCredentials(null);
    const res = await graphql(app, {
      token,
      query: START_OAUTH,
      variables: { data: { environmentId, provider: 'hubspot' } },
    });
    expect(res.body.errors?.[0]?.message).toContain('not configured');
  });

  it('starts the handshake: authorize URL out, transaction cookie on the authenticated response', async () => {
    withAppCredentials('client-123');
    const res = await graphql(app, {
      token,
      query: START_OAUTH,
      variables: { data: { environmentId, provider: 'hubspot' } },
    });
    const url = new URL(gqlData(res).startIntegrationOAuth.url);
    expect(url.origin + url.pathname).toBe(hubspotApi.HUBSPOT_AUTHORIZE_URL);
    expect(url.searchParams.get('client_id')).toBe('client-123');
    expect(url.searchParams.get('scope')).toBe(hubspotApi.HUBSPOT_OAUTH_SCOPES.join(' '));
    const state = url.searchParams.get('state') ?? '';
    const claims = await app
      .get(JwtService, { strict: false })
      .verifyAsync<{ tokenType: string; environmentId: string; projectId: string; sub: string }>(
        state,
      );
    expect(claims).toMatchObject({ tokenType: 'integration-oauth-tx', environmentId, projectId });
    // The state carries the user as `sub`, never `userId`: it must not double as a session token.
    expect(claims).not.toHaveProperty('userId');
    expect(claims.sub).toBeTruthy();
    const asBearer = await graphql(app, {
      token: state,
      query: LIST_INTEGRATIONS,
      variables: { environmentId },
    });
    expect(asBearer.body.data?.listIntegrations ?? null).toBeNull();

    // The cookie rides the mutation's own response — the one thing a forwarded
    // link cannot carry — scoped to the callback path.
    const setCookie = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(setCookie).toContain(`${INTEGRATION_TX_COOKIE}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/api/integrations/hubspot/oauth');
  });

  it('gates the handshake on the plan', async () => {
    withAppCredentials('client-123');
    await prisma.subscription.updateMany({ where: { projectId }, data: { planType: 'starter' } });
    try {
      const res = await graphql(app, {
        token,
        query: START_OAUTH,
        variables: { data: { environmentId, provider: 'hubspot' } },
      });
      expect(gqlErrorCode(res)).toBe('E0043');
    } finally {
      await prisma.subscription.updateMany({ where: { projectId }, data: { planType: 'growth' } });
    }
  });

  it('completes the callback: creates the connected row and lands on the settings page', async () => {
    withAppCredentials('client-123');
    jest.spyOn(hubspotApi, 'exchangeHubspotCode').mockResolvedValue({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      expires_in: 1800,
    });
    jest.spyOn(hubspotApi, 'fetchHubspotTokenInfo').mockResolvedValue({
      hub_id: 424242,
      hub_domain: 'acme.hubspot.com',
      app_id: 1,
      user: 'ada@example.com',
      user_id: 7,
      scopes: [],
    });
    const { state, cookie } = await beginHandshake();

    const res = await request(app.getHttpServer())
      .get('/api/integrations/hubspot/oauth/callback')
      .set('Cookie', cookie)
      .query({ code: 'code-1', state });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(`/project/${projectId}/settings/integrations/hubspot`);
    expect(res.headers.location).toContain('connected=1');

    const row = await prisma.integration.findUnique({
      where: { environmentId_provider: { environmentId, provider: 'hubspot' } },
    });
    expect(row?.enabled).toBe(true);
    expect(row?.remoteAccountId).toBe('424242');
    expect(row?.key).toBe('');
    expect(row?.oauthCredentials).not.toContain('refresh-1'); // encrypted at rest
    const credentials = JSON.parse(app.get(EncryptionService).decrypt(row?.oauthCredentials ?? ''));
    expect(credentials.refreshToken).toBe('refresh-1');

    const list = await graphql(app, {
      token,
      query: LIST_INTEGRATIONS,
      variables: { environmentId },
    });
    expect(gqlData(list).listIntegrations).toEqual([
      expect.objectContaining({
        provider: 'hubspot',
        connected: true,
        remoteAccountId: '424242',
        remoteAccountLabel: 'acme.hubspot.com',
      }),
    ]);
  });

  it('reconnecting to a different account drops the old links and restarts syncing', async () => {
    withAppCredentials('client-123');
    // Self-contained: a row already connected to account 424242.
    const row = await prisma.integration.upsert({
      where: { environmentId_provider: { environmentId, provider: 'hubspot' } },
      create: {
        environmentId,
        provider: 'hubspot',
        key: '',
        keyTail: '',
        enabled: true,
        oauthCredentials: app
          .get(EncryptionService)
          .encrypt(JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: 0 })),
        remoteAccountId: '424242',
        remoteState: { account: { domain: 'acme.hubspot.com' } },
      },
      update: { remoteAccountId: '424242', enabled: true },
    });
    const mapping = await prisma.integrationObjectMapping.create({
      data: {
        integrationId: row.id,
        remoteObject: 'contact',
        localObject: 'user',
        matchStrategy: 'email',
        inboundFields: [],
        outboundFields: [],
        matchedCount: 5,
        unresolvedCount: 2,
        lastFullSyncAt: new Date(),
      },
    });
    await prisma.integrationObjectLink.create({
      data: { mappingId: mapping.id, localId: 'user-1', remoteId: 'old-1', matchedBy: 'email' },
    });
    const removePortal = jest
      .spyOn(HubspotJournalService.prototype, 'removePortalSubscriptions')
      .mockResolvedValue(undefined);
    const syncSubscriptions = jest
      .spyOn(HubspotJournalService.prototype, 'syncSubscriptions')
      .mockResolvedValue(undefined);
    const startFullSync = jest
      .spyOn(ObjectSyncService.prototype, 'startFullSync')
      .mockResolvedValue(null as never);
    jest.spyOn(hubspotApi, 'exchangeHubspotCode').mockResolvedValue({
      access_token: 'access-2',
      refresh_token: 'refresh-2',
      expires_in: 1800,
    });
    jest.spyOn(hubspotApi, 'fetchHubspotTokenInfo').mockResolvedValue({
      hub_id: 555555,
      hub_domain: 'other.hubspot.com',
      app_id: 1,
      user: 'ada@example.com',
      user_id: 7,
      scopes: [],
    });
    try {
      const { state, cookie } = await beginHandshake();
      const res = await request(app.getHttpServer())
        .get('/api/integrations/hubspot/oauth/callback')
        .set('Cookie', cookie)
        .query({ code: 'code-2', state });
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('connected=1');

      const after = await prisma.integration.findUniqueOrThrow({ where: { id: row.id } });
      expect(after.remoteAccountId).toBe('555555');
      expect(await prisma.integrationObjectLink.count({ where: { mappingId: mapping.id } })).toBe(
        0,
      );
      const reset = await prisma.integrationObjectMapping.findUniqueOrThrow({
        where: { id: mapping.id },
      });
      expect(reset).toMatchObject({ matchedCount: 0, unresolvedCount: 0, lastFullSyncAt: null });
      expect(removePortal).toHaveBeenCalledWith('424242');
      expect(syncSubscriptions).toHaveBeenCalledWith(row.id);
      expect(startFullSync).toHaveBeenCalledWith(mapping.id, { manual: false });
    } finally {
      removePortal.mockRestore();
      syncSubscriptions.mockRestore();
      startFullSync.mockRestore();
      await prisma.integrationObjectMapping.delete({ where: { id: mapping.id } });
    }
  });

  it('refuses an account that another environment already holds', async () => {
    withAppCredentials('client-123');
    const other = await buildEnvironment(prisma, { projectId });
    const held = await prisma.integration.create({
      data: {
        environmentId: other.id,
        provider: 'hubspot',
        key: '',
        keyTail: '',
        enabled: true,
        oauthCredentials: app
          .get(EncryptionService)
          .encrypt(JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: 0 })),
        remoteAccountId: '424242',
      },
    });
    jest.spyOn(hubspotApi, 'exchangeHubspotCode').mockResolvedValue({
      access_token: 'access-3',
      refresh_token: 'refresh-3',
      expires_in: 1800,
    });
    jest.spyOn(hubspotApi, 'fetchHubspotTokenInfo').mockResolvedValue({
      hub_id: 424242,
      hub_domain: 'acme.hubspot.com',
      app_id: 1,
      user: 'ada@example.com',
      user_id: 7,
      scopes: [],
    });
    try {
      const { state, cookie } = await beginHandshake();
      const res = await request(app.getHttpServer())
        .get('/api/integrations/hubspot/oauth/callback')
        .set('Cookie', cookie)
        .query({ code: 'code-3', state });
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('error=inUse');
      expect(await prisma.integration.count({ where: { environmentId } })).toBe(0);
    } finally {
      await prisma.integration.delete({ where: { id: held.id } });
    }
  });

  it('turns a declined consent and a bad state into error redirects, never a 500', async () => {
    withAppCredentials('client-123');
    const { state, cookie } = await beginHandshake();

    const denied = await request(app.getHttpServer())
      .get('/api/integrations/hubspot/oauth/callback')
      .set('Cookie', cookie)
      .query({ error: 'access_denied', state });
    expect(denied.status).toBe(302);
    expect(denied.headers.location).toContain('error=denied');

    const forged = await request(app.getHttpServer())
      .get('/api/integrations/hubspot/oauth/callback')
      .query({ code: 'code-1', state: 'not-a-jwt' });
    expect(forged.status).toBe(302);
    expect(forged.headers.location).toContain('error=failed');

    // A valid state from another browser (no transaction cookie) is refused:
    // the callback must be completed by the browser that ran the mutation.
    // And there is no public route that would hand that browser a cookie.
    const forwarded = await request(app.getHttpServer())
      .get('/api/integrations/hubspot/oauth/start')
      .query({ state });
    expect(forwarded.status).toBe(404);
    const exchange = jest.spyOn(hubspotApi, 'exchangeHubspotCode');
    const unbound = await request(app.getHttpServer())
      .get('/api/integrations/hubspot/oauth/callback')
      .query({ code: 'code-1', state });
    expect(unbound.status).toBe(302);
    expect(unbound.headers.location).toContain('error=failed');
    expect(exchange).not.toHaveBeenCalled();
    expect(await prisma.integration.count({ where: { environmentId } })).toBe(0);
  });

  describe('marketplace-initiated install', () => {
    const RETURN_URL = 'https://app.hubspot.com/oauth/authorize/finish?portalId=424242';
    const INSTALL_PAGE = '/integrations/hubspot/install';
    const CALLBACK = '/api/integrations/hubspot/oauth/callback';

    const mockProvider = () => {
      withAppCredentials('client-123');
      jest.spyOn(hubspotApi, 'exchangeHubspotCode').mockResolvedValue({
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expires_in: 1800,
      });
      jest.spyOn(hubspotApi, 'fetchHubspotTokenInfo').mockResolvedValue({
        hub_id: 424242,
        hub_domain: 'acme.hubspot.com',
        app_id: 1,
        user: 'ada@example.com',
        user_id: 7,
        scopes: [],
      });
    };

    it('first leg: sends the browser to the install page with the returnUrl, dropping a foreign one', async () => {
      const res = await request(app.getHttpServer())
        .get(CALLBACK)
        .query({ step: 'authorize', returnUrl: RETURN_URL });
      expect(res.status).toBe(302);
      const location = new URL(res.headers.location);
      expect(location.pathname).toBe(INSTALL_PAGE);
      expect(location.searchParams.get('returnUrl')).toBe(RETURN_URL);

      const foreign = await request(app.getHttpServer())
        .get(CALLBACK)
        .query({ step: 'authorize', returnUrl: 'https://evil.example/hubspot' });
      const dropped = new URL(foreign.headers.location);
      expect(dropped.pathname).toBe(INSTALL_PAGE);
      expect(dropped.searchParams.get('returnUrl')).toBeNull();
      expect(dropped.searchParams.get('error')).toBe('failed');
    });

    it('the mutation hands the state to HubSpot on its returnUrl — and only to HubSpot', async () => {
      withAppCredentials('client-123');
      const start = await graphql(app, {
        token,
        query: START_OAUTH,
        variables: { data: { environmentId, provider: 'hubspot', returnUrl: RETURN_URL } },
      });
      const url = new URL(gqlData(start).startIntegrationOAuth.url);
      expect(`${url.origin}${url.pathname}`).toBe('https://app.hubspot.com/oauth/authorize/finish');
      expect(url.searchParams.get('portalId')).toBe('424242');
      const state = url.searchParams.get('state') ?? '';
      await expect(
        app.get(JwtService, { strict: false }).verifyAsync(state),
      ).resolves.toMatchObject({ environmentId, projectId });
      const cookie = (start.headers['set-cookie'] as unknown as string[] | undefined)?.find(
        (header) => header.startsWith(`${INTEGRATION_TX_COOKIE}=`),
      );
      expect(cookie).toContain(state);

      const foreign = await graphql(app, {
        token,
        query: START_OAUTH,
        variables: {
          data: { environmentId, provider: 'hubspot', returnUrl: 'https://evil.example/x' },
        },
      });
      expect(foreign.body.errors?.[0]?.message).toContain('not a HubSpot address');
    });

    it("last leg: finalize arrives in HubSpot's frame without our cookie, completes once, lands back on HubSpot", async () => {
      mockProvider();
      const { state } = await beginHandshake(RETURN_URL);
      // HubSpot's frame: a cross-site navigation, so no transaction cookie.
      const res = await request(app.getHttpServer())
        .get(CALLBACK)
        .set('Sec-Fetch-Dest', 'iframe')
        .query({ step: 'finalize', code: 'code-1', state, returnUrl: RETURN_URL });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(RETURN_URL);
      const row = await prisma.integration.findUnique({
        where: { environmentId_provider: { environmentId, provider: 'hubspot' } },
      });
      expect(row?.enabled).toBe(true);
      expect(row?.remoteAccountId).toBe('424242');

      // The state is spent: a captured callback URL does not connect again.
      const replay = await request(app.getHttpServer())
        .get(CALLBACK)
        .query({ step: 'finalize', code: 'code-1b', state, returnUrl: RETURN_URL });
      expect(replay.headers.location).toContain('error=failed');

      // A returnUrl that is not HubSpot's is ignored: the connection completes
      // and the browser lands on the settings page instead.
      const second = await beginHandshake(RETURN_URL);
      const settled = await request(app.getHttpServer())
        .get(CALLBACK)
        .set('Cookie', second.cookie)
        .query({
          step: 'finalize',
          code: 'code-2',
          state: second.state,
          returnUrl: 'https://evil.example/after',
        });
      expect(settled.headers.location).toContain(
        `/project/${projectId}/settings/integrations/hubspot`,
      );
      expect(settled.headers.location).toContain('connected=1');
    });

    it('a finalize without our state cannot complete and says so on the install page', async () => {
      const res = await request(app.getHttpServer())
        .get(CALLBACK)
        .query({ step: 'finalize', code: 'code-x', returnUrl: RETURN_URL });
      expect(res.status).toBe(302);
      const location = new URL(res.headers.location);
      expect(location.pathname).toBe(INSTALL_PAGE);
      expect(location.searchParams.get('error')).toBe('failed');
      expect(location.searchParams.get('returnUrl')).toBeNull();
    });
  });

  it('disconnects: revokes the grant, drops the credentials, keeps the row', async () => {
    withAppCredentials('client-123');
    const encryption = app.get(EncryptionService);
    const row = await prisma.integration.create({
      data: {
        environmentId,
        provider: 'hubspot',
        key: '',
        enabled: true,
        oauthCredentials: encryption.encrypt(
          JSON.stringify({
            accessToken: 'a',
            refreshToken: 'refresh-9',
            expiresAt: Date.now() + 60000,
          }),
        ),
        remoteAccountId: '9',
        remoteState: { account: { domain: 'nine.hubspot.com' } },
      },
    });
    const revoke = jest.spyOn(hubspotApi, 'revokeHubspotRefreshToken').mockResolvedValue();

    const res = await graphql(app, {
      token,
      query: DISCONNECT,
      variables: { data: { id: row.id } },
    });
    // The account id stays (bookkeeping for the next connect); the grant is gone.
    expect(gqlData(res).disconnectIntegrationOAuth).toMatchObject({
      id: row.id,
      enabled: false,
      connected: false,
      remoteAccountId: '9',
    });
    expect(revoke).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: expect.any(String) }),
      'refresh-9',
    );
    const after = await prisma.integration.findUnique({ where: { id: row.id } });
    expect(after?.oauthCredentials).toBeNull();
  });
});
