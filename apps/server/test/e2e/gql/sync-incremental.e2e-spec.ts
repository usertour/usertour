import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { BizService } from '@/biz/biz.service';
import { initialization } from '@/common/initialization/initialization';
import { QUEUE_OBJECT_SYNC } from '@/common/consts/queen';
import { AxiosError } from 'axios';
import {
  SYNC_BACKFILL_JOB,
  DeliverySkippedError,
  ObjectSyncService,
} from '@/integrations/sync/object-sync.service';
import {
  SYNC_OBJECT_UPDATE_TOPIC,
  type SyncObjectUpdateEnvelope,
} from '@/integrations/integrations.types';
import { EncryptionService } from '@/shared/encryption.service';
import * as hubspotCrmApi from '@/integrations/sync/hubspot-crm-api';

import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';
import { createTestApp } from '../create-test-app';

const waitFor = async <T>(
  probe: () => Promise<T | null | undefined | false>,
  timeoutMs = 8000,
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('waitFor: condition not met in time');
};

/**
 * Incremental sync (ADR 0013 §7, §9): an attribute change on a linked user
 * becomes a ledger write-back; a provider-originated change never echoes; a
 * new user is handed to the backfill. The listener is exercised through the
 * real domain event; queue CONSUMPTION is not awaited (a co-located dev
 * server sharing Redis races for the jobs) — delivery and backfill are driven
 * directly on the service with provider calls stubbed.
 */
describe('CRM incremental sync (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let biz: BizService;
  let sync: ObjectSyncService;
  let projectId: string;
  let environmentId: string;
  let integrationId: string;
  let mappingId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    biz = app.get(BizService);
    sync = app.get(ObjectSyncService);
    const project = await buildProject(prisma, { name: 'gql-sync-incremental' });
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
        remoteAccountId: '1',
        // Write-back property already created: keeps the delivery to one provider call.
        remoteState: { properties: { usertour_user_nps: true } },
      },
    });
    integrationId = integration.id;
    await prisma.attribute.createMany({
      data: [
        {
          projectId,
          bizType: AttributeBizTypes.User,
          codeName: 'nps',
          displayName: 'NPS',
          dataType: BizAttributeTypes.Number,
        },
        {
          projectId,
          bizType: AttributeBizTypes.User,
          codeName: 'lifecycle_stage',
          displayName: 'Lifecycle Stage',
          dataType: BizAttributeTypes.String,
          source: 'hubspot',
          sourceId: 'lifecyclestage',
        },
      ],
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

  it('turns a changed outbound attribute into a ledger write-back and delivers it', async () => {
    const update = jest
      .spyOn(hubspotCrmApi, 'updateHubspotObject')
      .mockResolvedValue({ status: 200, body: '{"id":"501"}' });
    const ada = await prisma.bizUser.create({
      data: { environmentId, externalId: 'u_ada', data: { email: 'ada@example.com', nps: 5 } },
    });
    await prisma.integrationObjectLink.create({
      data: { mappingId, localId: ada.id, remoteId: '501', matchedBy: 'email' },
    });

    await biz.withEntityChangeEmit(environmentId, () =>
      biz.upsertBizUsers(prisma, 'u_ada', { nps: 8 }, environmentId),
    );

    const message = await waitFor(() =>
      prisma.outboundMessage.findFirst({
        where: { integrationId, topic: SYNC_OBJECT_UPDATE_TOPIC },
      }),
    );
    const envelope = message.payload as unknown as SyncObjectUpdateEnvelope;
    expect(envelope.data).toMatchObject({
      mappingId,
      localId: ada.id,
      remoteId: '501',
      fields: { usertour_user_nps: '8' },
    });

    // Deliver the ledger payload the way the processor does. The message
    // names the field; the value is read at delivery, so a change made after
    // the message was queued wins over the queued snapshot.
    await prisma.bizUser.update({
      where: { id: ada.id },
      data: { data: { email: 'ada@example.com', nps: 9 } },
    });
    const result = await sync.deliverWriteBack(envelope);
    expect(result.status).toBe(200);
    expect(update).toHaveBeenCalledWith('a', 'contacts', '501', { usertour_user_nps: '9' });

    // The provider record is gone: the delivery settles as skipped and the
    // link is dropped so nothing writes to the dead id again.
    update.mockRejectedValue(
      new AxiosError('Not found', '404', undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        data: '',
        headers: {},
        config: {} as never,
      }),
    );
    await expect(sync.deliverWriteBack(envelope)).rejects.toBeInstanceOf(DeliverySkippedError);
    expect(
      await prisma.integrationObjectLink.count({ where: { mappingId, localId: ada.id } }),
    ).toBe(0);
  });

  it('does not echo a change that came from the provider, nor one outside the outbound fields', async () => {
    const before = await prisma.outboundMessage.count({ where: { integrationId } });
    await biz.withEntityChangeEmit(
      environmentId,
      () => biz.upsertBizUsers(prisma, 'u_ada', { nps: 9 }, environmentId, { origin: 'hubspot' }),
      'hubspot',
    );
    await biz.withEntityChangeEmit(environmentId, () =>
      biz.upsertBizUsers(prisma, 'u_ada', { plan: 'pro' }, environmentId),
    );
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(await prisma.outboundMessage.count({ where: { integrationId } })).toBe(before);
  });

  it('hands a new user to the backfill, which pairs and syncs it from the provider', async () => {
    const syncQueue = app.get<Queue>(getQueueToken(QUEUE_OBJECT_SYNC));
    const enqueue = jest.spyOn(syncQueue, 'add').mockResolvedValue(undefined as never);
    const search = jest.spyOn(hubspotCrmApi, 'searchHubspotObjectsByProperty').mockResolvedValue([
      {
        id: '777',
        properties: { email: 'grace@example.com', lifecyclestage: 'customer' },
        createdAt: '',
        updatedAt: '',
        archived: false,
      },
    ]);
    jest.spyOn(hubspotCrmApi, 'batchUpdateHubspotObjects').mockResolvedValue();

    const grace = await biz.withEntityChangeEmit(environmentId, () =>
      biz.upsertBizUsers(prisma, 'u_grace', { email: 'Grace@Example.com' }, environmentId),
    );
    await waitFor(async () => enqueue.mock.calls.length > 0);
    expect(enqueue).toHaveBeenCalledWith(
      SYNC_BACKFILL_JOB,
      { mappingId, localId: grace?.id },
      expect.objectContaining({ attempts: expect.any(Number) }),
    );

    // Run the backfill the way the worker does.
    await sync.backfillRecord({ mappingId, localId: grace?.id as string });
    const link = await prisma.integrationObjectLink.findFirst({
      where: { mappingId, remoteId: '777' },
    });
    expect(link?.localId).toBe(grace?.id);
    const after = await prisma.bizUser.findUnique({ where: { id: grace?.id } });
    expect((after?.data as Record<string, unknown>).lifecycle_stage).toBe('customer');
    expect(search).toHaveBeenCalledWith(
      'a',
      'contacts',
      expect.objectContaining({ propertyName: 'email', values: ['grace@example.com'] }),
    );
  });
});
