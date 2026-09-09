import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { BizEvents, EventAttributes } from '@usertour/types';
import { initialization } from '@/common/initialization/initialization';
import { EncryptionService } from '@/shared/encryption.service';
import { ObjectSyncListener } from '@/integrations/sync/object-sync.listener';
import { DeliverySkippedError, ObjectSyncService } from '@/integrations/sync/object-sync.service';
import * as timelineApi from '@/integrations/sync/hubspot-timeline-api';
import type { IntegrationMessageEnvelope } from '@/integrations/integrations.types';

import { graphql, gqlData } from '../auth';
import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';
import { createTestApp } from '../create-test-app';

const UPDATE_EVENTS = `mutation ($data: UpdateIntegrationEventsInput!) {
  updateIntegrationEvents(data: $data) { id config }
}`;

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
 * Events out (ADR 0013 §8): the selection setting, the listener that turns a
 * tracked event into a timeline message for linked users, and the delivery
 * that writes it to the contact and its company in one batch. The provider
 * call is stubbed at the module boundary.
 */
describe('Sync timeline events (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let listener: ObjectSyncListener;
  let sync: ObjectSyncService;
  let projectId: string;
  let environmentId: string;
  let integrationId: string;
  let token: string;
  let linkedUserId: string;
  let unlinkedUserId: string;
  let flowStartedEventId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    listener = app.get(ObjectSyncListener);
    sync = app.get(ObjectSyncService);
    const project = await buildProject(prisma, { name: 'gql-sync-events' });
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
        config: { events: { enabled: true, codeNames: [BizEvents.FLOW_STARTED] } },
      },
    });
    integrationId = integration.id;
    const contactMapping = await prisma.integrationObjectMapping.create({
      data: {
        integrationId,
        remoteObject: 'contact',
        localObject: 'user',
        matchStrategy: 'email',
        inboundFields: [],
        outboundFields: [],
      },
    });
    const companyMapping = await prisma.integrationObjectMapping.create({
      data: {
        integrationId,
        remoteObject: 'company',
        localObject: 'company',
        matchStrategy: 'remoteField',
        matchRemoteField: 'usertour_company_id',
        inboundFields: [],
        outboundFields: [],
      },
    });
    const company = await prisma.bizCompany.create({
      data: { environmentId, externalId: 'acme', data: {} },
    });
    const linked = await prisma.bizUser.create({
      data: {
        environmentId,
        externalId: 'u_linked',
        data: { email: 'linked@example.com' },
        bizCompanyId: company.id,
      },
    });
    linkedUserId = linked.id;
    const unlinked = await prisma.bizUser.create({
      data: { environmentId, externalId: 'u_unlinked', data: {} },
    });
    unlinkedUserId = unlinked.id;
    await prisma.integrationObjectLink.createMany({
      data: [
        { mappingId: contactMapping.id, localId: linked.id, remoteId: 'c-501', matchedBy: 'email' },
        {
          mappingId: companyMapping.id,
          localId: company.id,
          remoteId: 'co-9',
          matchedBy: 'remoteField',
        },
      ],
    });
    const flowStarted = await prisma.event.findFirstOrThrow({
      where: { projectId, codeName: BizEvents.FLOW_STARTED },
    });
    flowStartedEventId = flowStarted.id;
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

  const trackFlowStarted = async (bizUserId: string, bizCompanyId?: string) =>
    prisma.bizEvent.create({
      data: {
        eventId: flowStartedEventId,
        bizUserId,
        bizCompanyId: bizCompanyId ?? null,
        data: {
          [EventAttributes.FLOW_NAME]: 'Onboarding',
          [EventAttributes.FLOW_VERSION_NUMBER]: 3,
          [EventAttributes.PAGE_URL]: 'https://app.example.com/home',
        },
      },
    });

  it('saves the selection: every milestone when the switch goes on, only known events otherwise', async () => {
    const on = await graphql(app, {
      token,
      query: UPDATE_EVENTS,
      variables: { data: { id: integrationId, enabled: true, codeNames: [] } },
    });
    expect(gqlData(on).updateIntegrationEvents.config.events).toEqual({
      enabled: true,
      codeNames: [],
    });
    const unknown = await graphql(app, {
      token,
      query: UPDATE_EVENTS,
      variables: { data: { id: integrationId, codeNames: ['page_viewed'] } },
    });
    expect(unknown.body.errors?.[0]?.message).toContain('page_viewed');
    const some = await graphql(app, {
      token,
      query: UPDATE_EVENTS,
      variables: {
        data: {
          id: integrationId,
          codeNames: [BizEvents.FLOW_STARTED, BizEvents.FLOW_STARTED, BizEvents.QUESTION_ANSWERED],
        },
      },
    });
    expect(gqlData(some).updateIntegrationEvents.config.events).toEqual({
      enabled: true,
      codeNames: [BizEvents.FLOW_STARTED, BizEvents.QUESTION_ANSWERED],
    });
  });

  it('writes a tracked event of a linked user to the contact and its company in one batch', async () => {
    const send = jest
      .spyOn(timelineApi, 'sendHubspotTimelineEvents')
      .mockResolvedValue({ status: 200, body: '' });
    const linkedCompany = await prisma.bizUser.findUniqueOrThrow({ where: { id: linkedUserId } });
    const bizEvent = await trackFlowStarted(linkedUserId, linkedCompany.bizCompanyId ?? undefined);
    await listener.onBizEventTracked({ environmentId, bizEventIds: [bizEvent.id] });

    const message = await waitFor(() =>
      prisma.outboundMessage.findFirst({
        where: { integrationId, topic: `event.tracked.${BizEvents.FLOW_STARTED}` },
      }),
    );
    await waitFor(async () => send.mock.calls.length > 0);
    const [, inputs] = send.mock.calls[0];
    expect(inputs).toEqual([
      expect.objectContaining({
        eventTypeName: 'flow_started_contact',
        objectId: 'c-501',
        id: message.id,
        properties: expect.objectContaining({
          flow_name: 'Onboarding',
          flow_version: 3,
          usertour_user_id: 'u_linked',
          page_url: 'https://app.example.com/home',
        }),
      }),
      expect.objectContaining({
        eventTypeName: 'flow_started_company',
        objectId: 'co-9',
        id: `${message.id}-company`,
      }),
    ]);
    expect(inputs[0].timestamp).toBe(
      (message.payload as unknown as IntegrationMessageEnvelope).createdAt,
    );
  });

  it('writes nothing for an unlinked user or an unselected event', async () => {
    const send = jest
      .spyOn(timelineApi, 'sendHubspotTimelineEvents')
      .mockResolvedValue({ status: 200, body: '' });
    const before = await prisma.outboundMessage.count({ where: { integrationId } });
    const unlinked = await trackFlowStarted(unlinkedUserId);
    const questionAnswered = await prisma.event.findFirstOrThrow({
      where: { projectId, codeName: BizEvents.CHECKLIST_STARTED },
    });
    const unselected = await prisma.bizEvent.create({
      data: { eventId: questionAnswered.id, bizUserId: linkedUserId, data: {} },
    });
    await listener.onBizEventTracked({ environmentId, bizEventIds: [unlinked.id, unselected.id] });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await prisma.outboundMessage.count({ where: { integrationId } })).toBe(before);
    expect(send).not.toHaveBeenCalled();
  });

  it('settles a queued event whose selection was withdrawn instead of delivering it', async () => {
    const message = await prisma.outboundMessage.findFirstOrThrow({
      where: { integrationId, topic: `event.tracked.${BizEvents.FLOW_STARTED}` },
    });
    await prisma.integration.update({
      where: { id: integrationId },
      data: { config: { events: { enabled: true, codeNames: [BizEvents.QUESTION_ANSWERED] } } },
    });
    try {
      await expect(
        sync.deliverTimelineEvent(
          integrationId,
          message.payload as unknown as IntegrationMessageEnvelope,
        ),
      ).rejects.toBeInstanceOf(DeliverySkippedError);
    } finally {
      await prisma.integration.update({
        where: { id: integrationId },
        data: { config: { events: { enabled: true, codeNames: [BizEvents.FLOW_STARTED] } } },
      });
    }
  });
});
