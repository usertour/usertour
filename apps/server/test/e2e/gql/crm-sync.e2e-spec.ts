import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { BizService } from '@/biz/biz.service';
import { AttributeBizType } from '@/attributes/models/attribute.model';
import { initialization } from '@/common/initialization/initialization';
import { CrmSyncService } from '@/integrations/crm/crm-sync.service';
import { EncryptionService } from '@/shared/encryption.service';
import * as hubspotCrmApi from '@/integrations/crm/hubspot-crm-api';

import { graphql, gqlErrorCode } from '../auth';
import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';
import { createTestApp } from '../create-test-app';

const RUN_SYNC = `mutation ($data: IntegrationObjectMappingIdInput!) {
  runIntegrationObjectMappingSync(data: $data) { id fullSyncStartedAt }
}`;

/**
 * Full-sync rounds (ADR 0013 §5-7) driven directly through the service: page
 * pairing, links, provider-owned inbound writes, write-back batches, round
 * bookkeeping, and the ownership guard on SDK/API writes. Provider calls are
 * stubbed at the module boundary.
 */
describe('CRM full sync (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sync: CrmSyncService;
  let biz: BizService;
  let projectId: string;
  let environmentId: string;
  let integrationId: string;
  let mappingId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    sync = app.get(CrmSyncService);
    biz = app.get(BizService);
    const project = await buildProject(prisma, { name: 'gql-crm-sync' });
    projectId = project.id;
    await initialization(prisma, projectId);
    await buildSubscription(prisma, { projectId, planType: 'growth' });
    const environment = await buildEnvironment(prisma, { projectId });
    environmentId = environment.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);

    const integration = await prisma.integration.create({
      data: {
        environmentId,
        provider: 'hubspot',
        key: '',
        enabled: true,
        oauthCredentials: app.get(EncryptionService).encrypt(
          JSON.stringify({
            accessToken: 'a',
            refreshToken: 'r',
            expiresAt: Date.now() + 3_600_000,
          }),
        ),
        remoteAccountId: '1',
      },
    });
    integrationId = integration.id;
    // Provider-owned inbound attribute + a Usertour-owned write-back attribute.
    await prisma.attribute.create({
      data: {
        projectId,
        bizType: AttributeBizTypes.User,
        codeName: 'lifecycle_stage',
        displayName: 'Lifecycle Stage',
        dataType: BizAttributeTypes.String,
        source: 'hubspot',
        sourceId: 'lifecyclestage',
      },
    });
    await prisma.attribute.create({
      data: {
        projectId,
        bizType: AttributeBizTypes.User,
        codeName: 'nps',
        displayName: 'NPS',
        dataType: BizAttributeTypes.Number,
      },
    });
    const mapping = await prisma.integrationObjectMapping.create({
      data: {
        integrationId,
        remoteObject: 'contact',
        localObject: 'user',
        matchStrategy: 'email',
        inboundFields: [{ remote: 'lifecyclestage', local: 'lifecycle_stage' }],
        outboundFields: [{ local: 'nps', remote: 'usertour_user_nps' }],
      },
    });
    mappingId = mapping.id;
    await prisma.bizUser.createMany({
      data: [
        { environmentId, externalId: 'u_ada', data: { email: 'Ada@Example.com', nps: 9 } },
        { environmentId, externalId: 'u_bob', data: { email: 'bob@example.com' } },
      ],
    });
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pairs by email, applies inbound fields as the provider, writes back, and closes the round', async () => {
    jest.spyOn(hubspotCrmApi, 'listHubspotObjectsPage').mockResolvedValue({
      results: [
        {
          id: '101',
          properties: { email: 'ada@example.com', lifecyclestage: 'customer' },
          createdAt: '',
          updatedAt: '',
          archived: false,
        },
        {
          id: '102',
          properties: { email: 'nobody@example.com', lifecyclestage: 'lead' },
          createdAt: '',
          updatedAt: '',
          archived: false,
        },
        {
          id: '103',
          properties: { email: '', lifecyclestage: 'lead' },
          createdAt: '',
          updatedAt: '',
          archived: false,
        },
      ],
    });
    const group = jest.spyOn(hubspotCrmApi, 'ensureHubspotPropertyGroup').mockResolvedValue();
    const property = jest.spyOn(hubspotCrmApi, 'ensureHubspotProperty').mockResolvedValue();
    const update = jest.spyOn(hubspotCrmApi, 'batchUpdateHubspotObjects').mockResolvedValue();

    await prisma.integrationObjectMapping.update({
      where: { id: mappingId },
      data: { fullSyncSessionId: 's1', fullSyncStartedAt: new Date() },
    });
    await sync.processPage({ mappingId, sessionId: 's1', page: 1 });

    const ada = await prisma.bizUser.findFirst({ where: { environmentId, externalId: 'u_ada' } });
    expect((ada?.data as Record<string, unknown>).lifecycle_stage).toBe('customer');
    const links = await prisma.integrationObjectLink.findMany({ where: { mappingId } });
    expect(links).toEqual([
      expect.objectContaining({ localId: ada?.id, remoteId: '101', matchedBy: 'email' }),
    ]);

    expect(group).toHaveBeenCalledWith('a', 'contacts', { name: 'usertour', label: 'Usertour' });
    expect(property).toHaveBeenCalledWith(
      'a',
      'contacts',
      expect.objectContaining({ name: 'usertour_user_nps', type: 'number', groupName: 'usertour' }),
    );
    expect(update).toHaveBeenCalledWith('a', 'contacts', [
      { id: '101', properties: { usertour_user_nps: '9' } },
    ]);

    const mapping = await prisma.integrationObjectMapping.findUnique({ where: { id: mappingId } });
    expect(mapping).toMatchObject({ matchedCount: 1, unresolvedCount: 2, fullSyncStartedAt: null });
    expect(mapping?.lastFullSyncAt).not.toBeNull();
    const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
    expect((integration?.remoteState as { properties?: Record<string, true> }).properties).toEqual({
      usertour_user_nps: true,
    });
  });

  it('chains pages through the cursor and moves a link when the remote record re-pairs', async () => {
    const list = jest
      .spyOn(hubspotCrmApi, 'listHubspotObjectsPage')
      .mockResolvedValueOnce({
        results: [
          {
            id: '101',
            properties: { email: 'bob@example.com', lifecyclestage: 'lead' },
            createdAt: '',
            updatedAt: '',
            archived: false,
          },
        ],
        paging: { next: { after: 'cursor-2' } },
      })
      .mockResolvedValueOnce({ results: [] });
    jest.spyOn(hubspotCrmApi, 'batchUpdateHubspotObjects').mockResolvedValue();

    await prisma.integrationObjectMapping.update({
      where: { id: mappingId },
      data: {
        fullSyncSessionId: 's2',
        fullSyncStartedAt: new Date(),
        matchedCount: 0,
        unresolvedCount: 0,
      },
    });
    await sync.processPage({ mappingId, sessionId: 's2', page: 1 });
    // The processor would run page 2 from the queue; drive it directly here.
    await sync.processPage({ mappingId, sessionId: 's2', page: 2, after: 'cursor-2' });
    expect(list).toHaveBeenLastCalledWith(
      'a',
      'contacts',
      expect.objectContaining({ after: 'cursor-2' }),
    );

    const bob = await prisma.bizUser.findFirst({ where: { environmentId, externalId: 'u_bob' } });
    const links = await prisma.integrationObjectLink.findMany({ where: { mappingId } });
    expect(links).toEqual([expect.objectContaining({ localId: bob?.id, remoteId: '101' })]);
    expect((bob?.data as Record<string, unknown>).lifecycle_stage).toBe('lead');
  });

  it('ignores a page from a superseded round', async () => {
    const list = jest.spyOn(hubspotCrmApi, 'listHubspotObjectsPage');
    await sync.processPage({ mappingId, sessionId: 'stale', page: 1 });
    expect(list).not.toHaveBeenCalled();
  });

  it('claims one round at a time and refuses a manual start while one runs', async () => {
    const started = await graphql(app, {
      token,
      query: RUN_SYNC,
      variables: { data: { integrationId, id: mappingId } },
    });
    expect(started.body.data?.runIntegrationObjectMappingSync.fullSyncStartedAt).not.toBeNull();
    const again = await graphql(app, {
      token,
      query: RUN_SYNC,
      variables: { data: { integrationId, id: mappingId } },
    });
    expect(again.body.errors?.[0]?.message).toContain('already in progress');
    await prisma.integrationObjectMapping.update({
      where: { id: mappingId },
      data: { fullSyncStartedAt: null },
    });
  });

  it('gates the manual start on the plan', async () => {
    await prisma.subscription.updateMany({ where: { projectId }, data: { planType: 'starter' } });
    try {
      const res = await graphql(app, {
        token,
        query: RUN_SYNC,
        variables: { data: { integrationId, id: mappingId } },
      });
      expect(gqlErrorCode(res)).toBe('E0043');
    } finally {
      await prisma.subscription.updateMany({ where: { projectId }, data: { planType: 'growth' } });
    }
  });

  it('drops SDK writes to provider-owned attributes and refuses them on the strict API path', async () => {
    const before = await prisma.bizUser.findFirst({
      where: { environmentId, externalId: 'u_ada' },
    });
    await prisma.bizUser.update({
      where: { id: before?.id },
      data: { data: { ...(before?.data as Record<string, unknown>), lifecycle_stage: 'customer' } },
    });
    await biz.withEntityChangeEmit(environmentId, () =>
      biz.upsertBizUsers(prisma, 'u_ada', { lifecycle_stage: 'hacked', nps: 7 }, environmentId),
    );
    const ada = await prisma.bizUser.findFirst({ where: { environmentId, externalId: 'u_ada' } });
    expect((ada?.data as Record<string, unknown>).lifecycle_stage).toBe('customer');
    expect((ada?.data as Record<string, unknown>).nps).toBe(7);

    await expect(
      biz.assertAttributeValueTypes(environmentId, AttributeBizType.USER, {
        lifecycle_stage: 'x',
      }),
      // House errors carry their text in messageDict, not Error.message.
    ).rejects.toMatchObject({ messageDict: { en: expect.stringContaining('owned by hubspot') } });
  });
});
