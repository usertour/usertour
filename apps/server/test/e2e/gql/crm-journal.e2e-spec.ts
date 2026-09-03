import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { initialization } from '@/common/initialization/initialization';
import { CrmJournalService } from '@/integrations/crm/crm-journal.service';
import { EncryptionService } from '@/shared/encryption.service';
import { RedisService } from '@/shared/redis.service';
import * as hubspotCrmApi from '@/integrations/crm/hubspot-crm-api';
import * as journalApi from '@/integrations/crm/hubspot-journal-api';

import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';
import { createTestApp } from '../create-test-app';

const OFFSET_KEY = 'crm:hubspot:journal:offset';

/**
 * Journal-driven inbound sync (ADR 0013 §7): subscription reconciliation
 * against the mappings, and the poller applying changed records through the
 * shared pairing path. Provider calls are stubbed at the module boundary.
 */
describe('CRM change journal (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let journal: CrmJournalService;
  let redis: RedisService;
  let projectId: string;
  let environmentId: string;
  let integrationId: string;
  let mappingId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    journal = app.get(CrmJournalService);
    redis = app.get(RedisService);
    const config = app.get(ConfigService);
    config.set('hubspot.clientId', 'client-123');
    config.set('hubspot.clientSecret', 'secret');
    const project = await buildProject(prisma, { name: 'gql-crm-journal' });
    projectId = project.id;
    await initialization(prisma, projectId);
    await buildSubscription(prisma, { projectId, planType: 'growth' });
    const environment = await buildEnvironment(prisma, { projectId });
    environmentId = environment.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
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
        remoteAccountId: '4242',
      },
    });
    integrationId = integration.id;
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
    const mapping = await prisma.integrationObjectMapping.create({
      data: {
        integrationId,
        remoteObject: 'contact',
        localObject: 'user',
        matchStrategy: 'email',
        inboundFields: [{ remote: 'lifecyclestage', local: 'lifecycle_stage' }],
        outboundFields: [],
      },
    });
    mappingId = mapping.id;
    await prisma.bizUser.create({
      data: { environmentId, externalId: 'u_ada', data: { email: 'ada@example.com' } },
    });
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await redis?.del(OFFSET_KEY);
    await app?.close();
  });

  beforeEach(() => {
    jest
      .spyOn(journalApi, 'fetchHubspotAppToken')
      .mockResolvedValue({ accessToken: 'app-token', expiresIn: 1800 });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await redis.del(OFFSET_KEY);
  });

  it('reconciles subscriptions: match field plus inbound fields, per object type', async () => {
    jest.spyOn(journalApi, 'listJournalSubscriptions').mockResolvedValue([
      // Stale contact subscription with a different property set → replaced.
      {
        id: 1,
        appId: 9,
        subscriptionType: 'OBJECT',
        objectTypeId: '0-1',
        portalId: 4242,
        actions: ['UPDATE'],
        properties: ['email'],
      },
      // Company subscription with no company mapping → removed.
      {
        id: 2,
        appId: 9,
        subscriptionType: 'OBJECT',
        objectTypeId: '0-2',
        portalId: 4242,
        actions: ['UPDATE'],
        properties: ['name'],
      },
      // Another account's subscription → untouched.
      {
        id: 3,
        appId: 9,
        subscriptionType: 'OBJECT',
        objectTypeId: '0-1',
        portalId: 1,
        actions: ['UPDATE'],
        properties: ['email'],
      },
    ]);
    const create = jest.spyOn(journalApi, 'createJournalSubscription').mockResolvedValue({
      id: 77,
      appId: 9,
      subscriptionType: 'OBJECT',
      objectTypeId: '0-1',
      portalId: 4242,
      actions: ['CREATE', 'UPDATE', 'MERGE'],
      properties: ['email', 'lifecyclestage'],
    });
    const remove = jest.spyOn(journalApi, 'deleteJournalSubscription').mockResolvedValue();

    await journal.syncSubscriptions(integrationId);

    expect(create).toHaveBeenCalledWith('app-token', {
      portalId: 4242,
      objectTypeId: '0-1',
      actions: ['CREATE', 'UPDATE', 'MERGE'],
      properties: ['email', 'lifecyclestage'],
    });
    expect(remove.mock.calls.map((call) => call[1]).sort()).toEqual([1, 2]);
    const row = await prisma.integration.findUnique({ where: { id: integrationId } });
    expect(
      (row?.remoteState as { journal?: { subscriptions?: Record<string, number> } }).journal,
    ).toEqual({
      subscriptions: { '0-1': 77 },
    });
  });

  it('polls from the latest page first, applies changed records, and remembers the offset', async () => {
    jest.spyOn(journalApi, 'journalLatest').mockResolvedValue({
      url: 'https://journal.test/page-1',
      expiresAt: '',
      currentOffset: 'off-1',
    });
    jest.spyOn(journalApi, 'fetchJournalPage').mockResolvedValue({
      offset: 'off-1',
      journalEvents: [
        {
          type: 'crmObject',
          portalId: 4242,
          occurredAt: '',
          objectTypeId: '0-1',
          objectId: 501,
          action: 'UPDATE',
          propertyChanges: { lifecyclestage: 'customer' },
        },
        {
          type: 'crmObject',
          portalId: 4242,
          occurredAt: '',
          objectTypeId: '0-1',
          objectId: 502,
          action: 'CREATE',
          propertyChanges: { email: 'nobody@example.com' },
        },
        {
          type: 'crmObject',
          portalId: 999,
          occurredAt: '',
          objectTypeId: '0-1',
          objectId: 9,
          action: 'UPDATE',
        },
      ],
    });
    const next = jest.spyOn(journalApi, 'journalNext').mockResolvedValue(null);
    const read = jest.spyOn(hubspotCrmApi, 'batchReadHubspotObjects').mockResolvedValue([
      {
        id: '501',
        properties: { email: 'ada@example.com', lifecyclestage: 'customer' },
        createdAt: '',
        updatedAt: '',
        archived: false,
      },
      {
        id: '502',
        properties: { email: 'nobody@example.com', lifecyclestage: 'lead' },
        createdAt: '',
        updatedAt: '',
        archived: false,
      },
    ]);

    expect(await journal.poll()).toBe(1);
    expect(read).toHaveBeenCalledWith('a', 'contacts', ['501', '502'], ['email', 'lifecyclestage']);
    const ada = await prisma.bizUser.findFirst({ where: { environmentId, externalId: 'u_ada' } });
    expect((ada?.data as Record<string, unknown>).lifecycle_stage).toBe('customer');
    expect(await prisma.integrationObjectLink.findMany({ where: { mappingId } })).toEqual([
      expect.objectContaining({ localId: ada?.id, remoteId: '501' }),
    ]);
    expect(await redis.get(OFFSET_KEY)).toBe('off-1');

    // Second poll continues from the stored offset and finds nothing new.
    expect(await journal.poll()).toBe(0);
    expect(next).toHaveBeenLastCalledWith('app-token', 'off-1');
  });
});
