import { PrismaService } from 'nestjs-prisma';
import { ClientMessageKind, ServerMessageKind } from '@usertour/types';

import { initialization } from '@/common/initialization/initialization';
import {
  buildContent,
  buildEnvironment,
  buildEvent,
  buildProject,
  buildStep,
  buildVersion,
  publishVersion,
} from '../factories';
import { teardownProject } from '../gql/_support';
import {
  WebSocketTestApp,
  WebSocketTestClient,
  connectWebSocketClient,
  createWebSocketTestApp,
} from './_support';

/**
 * First batch of client-message kinds over a real socket.io connection:
 * user/company upserts, custom event tracking, manual flow start/end and the
 * batch envelope. Every assertion lands on DB state (BizUser / BizCompany /
 * BizUserOnCompany / BizSession / BizEvent) or on a received server-message —
 * acks alone prove nothing.
 *
 * The project runs through `initialization()` so default attributes/events
 * exist exactly as they would for a production project — flow start/end
 * tracking writes FLOW_STARTED / FLOW_ENDED biz events against those
 * definitions.
 */
describe('WebSocket v2 client messages (e2e)', () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let environmentToken: string;
  let client: WebSocketTestClient;

  const externalUserId = `ws-user-${Date.now()}`;
  const externalCompanyId = `ws-company-${Date.now()}`;

  let flowContentId: string;
  let customEventCodeName: string;

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-client-messages' });
    projectId = project.id;
    await initialization(prisma, projectId);
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;
    environmentToken = environment.token;

    const customEvent = await buildEvent(prisma, {
      projectId,
      displayName: 'WS Custom Event',
    });
    customEventCodeName = customEvent.codeName;

    const flowContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-flow',
      type: 'flow',
    });
    flowContentId = flowContent.id;
    const flowVersion = await buildVersion(prisma, {
      contentId: flowContent.id,
      sequence: 1,
      config: {},
      data: [],
    });
    await buildStep(prisma, {
      versionId: flowVersion.id,
      sequence: 0,
      name: 'Step 1',
      data: [],
    });
    await buildStep(prisma, {
      versionId: flowVersion.id,
      sequence: 1,
      name: 'Step 2',
      data: [],
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: flowContent.id,
      versionId: flowVersion.id,
    });

    client = await connectWebSocketClient(harness.baseUrl, {
      token: environmentToken,
      externalUserId,
    });
  }, 60000);

  afterAll(async () => {
    client?.disconnect();
    if (prisma) {
      await teardownProject(prisma, projectId);
    }
    await harness?.close();
  });

  it('UpsertUser merges attributes onto the biz user', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.UPSERT_USER, {
      externalUserId,
      attributes: { plan: 'pro', name: 'Socket Tester' },
    });
    expect(ack).toBe(true);

    const bizUser = await prisma.bizUser.findFirst({
      where: { externalId: externalUserId, environmentId },
    });
    expect(bizUser).not.toBeNull();
    expect((bizUser?.data as Record<string, unknown>).plan).toBe('pro');
    expect((bizUser?.data as Record<string, unknown>).name).toBe('Socket Tester');
  });

  it('UpsertUser rejects a payload for a different user than the socket auth', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.UPSERT_USER, {
      externalUserId: 'someone-else',
      attributes: { plan: 'stolen' },
    });
    expect(ack).toBe(false);

    const strangers = await prisma.bizUser.findMany({
      where: { externalId: 'someone-else', environmentId },
    });
    expect(strangers).toHaveLength(0);
  });

  it('UpsertCompany creates the company and the membership row', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.UPSERT_COMPANY, {
      externalUserId,
      externalCompanyId,
      attributes: { name: 'Socket Corp', subscription: 'pro' },
      membership: { role: 'admin' },
    });
    expect(ack).toBe(true);

    const bizCompany = await prisma.bizCompany.findFirst({
      where: { externalId: externalCompanyId, environmentId },
    });
    expect(bizCompany).not.toBeNull();
    expect((bizCompany?.data as Record<string, unknown>).subscription).toBe('pro');

    const membership = await prisma.bizUserOnCompany.findFirst({
      where: {
        bizCompanyId: bizCompany?.id,
        bizUser: { externalId: externalUserId, environmentId },
      },
    });
    expect(membership).not.toBeNull();
    expect((membership?.data as Record<string, unknown>).role).toBe('admin');
  });

  it('TrackEvent records a biz event against the event definition', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.TRACK_EVENT, {
      name: customEventCodeName,
      attributes: { source: 'ws-e2e' },
    });
    expect(ack).toBe(true);

    const bizEvent = await prisma.bizEvent.findFirst({
      where: {
        event: { codeName: customEventCodeName, projectId },
        bizUser: { externalId: externalUserId, environmentId },
      },
    });
    expect(bizEvent).not.toBeNull();
  });

  it('StartContent starts a flow: session row, flow_started event, SetFlowSession emit', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);

    const setFlowSession = await client.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);
    expect(setFlowSession.payload).toBeTruthy();

    const bizSession = await prisma.bizSession.findFirst({
      where: {
        contentId: flowContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
      },
      include: { bizEvent: { include: { event: true } } },
    });
    expect(bizSession).not.toBeNull();
    expect(bizSession?.state).toBe(0);
    const eventCodeNames = bizSession?.bizEvent.map((bizEvent) => bizEvent.event.codeName) ?? [];
    expect(eventCodeNames).toContain('flow_started');
  });

  it('EndContent ends the flow session and records flow_ended', async () => {
    const bizSession = await prisma.bizSession.findFirst({
      where: {
        contentId: flowContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
        state: 0,
      },
    });
    expect(bizSession).not.toBeNull();

    const ack = await client.sendClientMessage(ClientMessageKind.END_CONTENT, {
      sessionId: bizSession?.id as string,
      endReason: 'user_closed',
    });
    expect(ack).toBe(true);

    const endedSession = await prisma.bizSession.findUnique({
      where: { id: bizSession?.id as string },
      include: { bizEvent: { include: { event: true } } },
    });
    expect(endedSession?.state).not.toBe(0);
    const eventCodeNames = endedSession?.bizEvent.map((bizEvent) => bizEvent.event.codeName) ?? [];
    expect(eventCodeNames).toContain('flow_ended');
  });

  it('BeginBatch / EndBatch round-trips through the batch envelope', async () => {
    const beginAck = await client.sendClientMessage(ClientMessageKind.BEGIN_BATCH, {});
    expect(beginAck).toBe(true);

    const endAck = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
    expect(endAck).toBe(true);
  });
});
