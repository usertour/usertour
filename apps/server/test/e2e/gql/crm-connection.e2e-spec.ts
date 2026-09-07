import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';
import { EncryptionService } from '@/shared/encryption.service';
import { CRM_TX_COOKIE } from '@/utils/cookie';
import * as hubspotApi from '@/integrations/crm/hubspot-api';
import { CrmJournalService } from '@/integrations/crm/crm-journal.service';
import { CrmSyncService } from '@/integrations/crm/crm-sync.service';

import { graphql, gqlData, gqlErrorCode } from '../auth';
import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';
import { createTestApp } from '../create-test-app';

const START_OAUTH = `mutation ($data: StartCrmOAuthInput!) {
  startCrmOAuth(data: $data) { url }
}`;
const DISCONNECT = `mutation ($data: IntegrationIdInput!) {
  disconnectCrmIntegration(data: $data) { id enabled connected remoteAccountId remoteAccountLabel }
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

    const project = await buildProject(prisma, { name: 'gql-crm-connection' });
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
      'https://api.example.test/integrations/hubspot/oauth/callback',
    );
  };

  /**
   * Start the handshake as the browser would: mint the start URL, follow it
   * (which sets the transaction cookie and redirects to the provider), and
   * return the state plus the cookie the callback must carry.
   */
  const beginHandshake = async () => {
    const start = await graphql(app, {
      token,
      query: START_OAUTH,
      variables: { data: { environmentId, provider: 'hubspot' } },
    });
    const startUrl = new URL(gqlData(start).startCrmOAuth.url);
    const state = startUrl.searchParams.get('state') ?? '';
    const res = await request(app.getHttpServer()).get(startUrl.pathname).query({ state });
    const cookie = (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) =>
      c.startsWith(`${CRM_TX_COOKIE}=`),
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

  it('starts the handshake with a signed state bound to the environment', async () => {
    withAppCredentials('client-123');
    const res = await graphql(app, {
      token,
      query: START_OAUTH,
      variables: { data: { environmentId, provider: 'hubspot' } },
    });
    // The mutation hands out OUR start route; the browser lands on the provider from there.
    const url = new URL(gqlData(res).startCrmOAuth.url);
    expect(url.origin + url.pathname).toBe(
      'https://api.example.test/integrations/hubspot/oauth/start',
    );
    const state = url.searchParams.get('state') ?? '';
    const claims = await app
      .get(JwtService, { strict: false })
      .verifyAsync<{ tokenType: string; environmentId: string; projectId: string; sub: string }>(
        state,
      );
    expect(claims).toMatchObject({ tokenType: 'crm-oauth-tx', environmentId, projectId });
    // The state carries the user as `sub`, never `userId`: it must not double as a session token.
    expect(claims).not.toHaveProperty('userId');
    expect(claims.sub).toBeTruthy();
    const asBearer = await graphql(app, {
      token: state,
      query: LIST_INTEGRATIONS,
      variables: { environmentId },
    });
    expect(asBearer.body.data?.listIntegrations ?? null).toBeNull();

    const started = await request(app.getHttpServer()).get(url.pathname).query({ state });
    expect(started.status).toBe(302);
    const target = new URL(started.headers.location);
    expect(target.origin + target.pathname).toBe(hubspotApi.HUBSPOT_AUTHORIZE_URL);
    expect(target.searchParams.get('client_id')).toBe('client-123');
    expect(target.searchParams.get('scope')).toBe(hubspotApi.HUBSPOT_OAUTH_SCOPES.join(' '));
    expect(target.searchParams.get('state')).toBe(state);
    const setCookie = (started.headers['set-cookie'] as unknown as string[]).join(';');
    expect(setCookie).toContain(`${CRM_TX_COOKIE}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
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
      .get('/integrations/hubspot/oauth/callback')
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
      .spyOn(CrmJournalService.prototype, 'removePortalSubscriptions')
      .mockResolvedValue(undefined);
    const syncSubscriptions = jest
      .spyOn(CrmJournalService.prototype, 'syncSubscriptions')
      .mockResolvedValue(undefined);
    const startFullSync = jest
      .spyOn(CrmSyncService.prototype, 'startFullSync')
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
        .get('/integrations/hubspot/oauth/callback')
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
        .get('/integrations/hubspot/oauth/callback')
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
      .get('/integrations/hubspot/oauth/callback')
      .set('Cookie', cookie)
      .query({ error: 'access_denied', state });
    expect(denied.status).toBe(302);
    expect(denied.headers.location).toContain('error=denied');

    const forged = await request(app.getHttpServer())
      .get('/integrations/hubspot/oauth/callback')
      .query({ code: 'code-1', state: 'not-a-jwt' });
    expect(forged.status).toBe(302);
    expect(forged.headers.location).toContain('error=failed');

    // A valid state from another browser (no transaction cookie) is refused:
    // the callback must be completed by the browser that started it.
    const exchange = jest.spyOn(hubspotApi, 'exchangeHubspotCode');
    const unbound = await request(app.getHttpServer())
      .get('/integrations/hubspot/oauth/callback')
      .query({ code: 'code-1', state });
    expect(unbound.status).toBe(302);
    expect(unbound.headers.location).toContain('error=failed');
    expect(exchange).not.toHaveBeenCalled();
    expect(await prisma.integration.count({ where: { environmentId } })).toBe(0);
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
    expect(gqlData(res).disconnectCrmIntegration).toMatchObject({
      id: row.id,
      enabled: false,
      connected: false,
      remoteAccountId: '9',
    });
    expect(revoke).toHaveBeenCalledWith('refresh-9');
    const after = await prisma.integration.findUnique({ where: { id: row.id } });
    expect(after?.oauthCredentials).toBeNull();
  });
});
