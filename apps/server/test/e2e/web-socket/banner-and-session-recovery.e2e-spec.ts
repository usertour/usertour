import { PrismaService } from 'nestjs-prisma';
import { Socket } from 'socket.io';
import { ClientMessageKind, ServerMessageKind } from '@usertour/types';

import { initialization } from '@/common/initialization/initialization';
import { SocketDataService } from '@/web-socket/core/socket-data.service';
import {
  buildContent,
  buildEnvironment,
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
 * Banner content lifecycle (the last content type without websocket e2e) and
 * the session-recovery handshake: a reconnecting SDK passes its known session
 * ids in the socket.io auth payload and the server restores them into the
 * connection's socket data.
 */
describe('WebSocket v2 banner and session recovery (e2e)', () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let environmentToken: string;
  let client: WebSocketTestClient;

  const externalUserId = `ws-banner-user-${Date.now()}`;

  let bannerContentId: string;
  let bannerSessionId: string;
  let flowContentId: string;

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-banner-recovery' });
    projectId = project.id;
    await initialization(prisma, projectId);
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;
    environmentToken = environment.token;

    const bannerContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-banner',
      type: 'banner',
    });
    bannerContentId = bannerContent.id;
    const bannerVersion = await buildVersion(prisma, {
      contentId: bannerContent.id,
      sequence: 1,
      config: {},
      data: {
        embedPlacement: 'top-of-page',
        overlayEmbedOverAppContent: false,
        stickToTopOfViewport: true,
        allowUsersToDismissEmbed: true,
        animateWhenEmbedAppears: false,
        contents: [],
      },
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: bannerContent.id,
      versionId: bannerVersion.id,
    });

    const flowContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-recovery-flow',
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
      name: 'Recovery Step',
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

  const getSocketData = (socketId: string) =>
    harness.app.get(SocketDataService).get({ id: socketId } as unknown as Socket);

  it('StartContent opens a banner session and emits SetBannerSession', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: bannerContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    await client.waitForServerMessage(ServerMessageKind.SET_BANNER_SESSION);

    const bizSession = await prisma.bizSession.findFirst({
      where: {
        contentId: bannerContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
        state: 0,
      },
    });
    expect(bizSession).not.toBeNull();
    bannerSessionId = bizSession?.id as string;
  });

  it('EndContent dismisses the banner session and records banner_dismissed', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.END_CONTENT, {
      sessionId: bannerSessionId,
      endReason: 'user_closed',
    });
    expect(ack).toBe(true);

    const endedSession = await prisma.bizSession.findUnique({
      where: { id: bannerSessionId },
      include: { bizEvent: { include: { event: true } } },
    });
    expect(endedSession?.state).not.toBe(0);
    const eventCodeNames = endedSession?.bizEvent.map((bizEvent) => bizEvent.event.codeName) ?? [];
    expect(eventCodeNames).toContain('banner_dismissed');
  });

  it('restores an active flow session passed as flowSessionId in the reconnect handshake', async () => {
    const startAck = await client.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });
    expect(startAck).toBe(true);
    const flowSession = await prisma.bizSession.findFirst({
      where: {
        contentId: flowContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
        state: 0,
      },
    });
    expect(flowSession).not.toBeNull();

    // Simulate the SDK reconnecting after a page reload: same user, session id
    // carried in the auth payload.
    const reconnected = await connectWebSocketClient(harness.baseUrl, {
      token: environmentToken,
      externalUserId,
      flowSessionId: flowSession?.id as string,
    });

    const socketData = await getSocketData(reconnected.socket.id as string);
    expect(socketData?.flowSession?.id).toBe(flowSession?.id);
    expect(socketData?.flowSession?.content?.id).toBe(flowContentId);

    reconnected.disconnect();
  });

  it('ignores an unknown session id in the reconnect handshake', async () => {
    const reconnected = await connectWebSocketClient(harness.baseUrl, {
      token: environmentToken,
      externalUserId,
      flowSessionId: 'session-that-does-not-exist',
    });

    const socketData = await getSocketData(reconnected.socket.id as string);
    expect(socketData?.flowSession).toBeUndefined();

    reconnected.disconnect();
  });
});
