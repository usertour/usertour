import { PrismaService } from 'nestjs-prisma';
import { ClientMessageKind, ServerMessageKind } from '@usertour/types';

import { initialization } from '@/common/initialization/initialization';
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
 * Resource center message kinds (Open / Close / Click /
 * ListResourceCenterBlockContent) and the announcement feed kinds
 * (ListAnnouncements / GetAnnouncement / MarkAnnouncementsSeen), over a real
 * socket.io connection. Completes the client-message kind coverage.
 *
 * Announcement read state is a dedicated table (BizAnnouncementSeen), not a
 * session event — the feed's `seen` flag, the seen row and the
 * announcement_seen biz event are asserted separately.
 */
describe('WebSocket v2 resource center and announcements (e2e)', () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let environmentToken: string;
  let client: WebSocketTestClient;

  const externalUserId = `ws-resource-user-${Date.now()}`;

  let resourceCenterContentId: string;
  let resourceCenterSessionId: string;
  let listedFlowContentId: string;
  let announcementContentId: string;

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-resource-center' });
    projectId = project.id;
    await initialization(prisma, projectId);
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;
    environmentToken = environment.token;

    // A published flow to appear inside the content-list block.
    const listedFlowContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-listed-flow',
      type: 'flow',
    });
    listedFlowContentId = listedFlowContent.id;
    const listedFlowVersion = await buildVersion(prisma, {
      contentId: listedFlowContent.id,
      sequence: 1,
      config: {},
      data: [],
    });
    await buildStep(prisma, {
      versionId: listedFlowVersion.id,
      sequence: 0,
      name: 'Listed Step',
      data: [],
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: listedFlowContent.id,
      versionId: listedFlowVersion.id,
    });

    const resourceCenterContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-resource-center',
      type: 'resource-center',
    });
    resourceCenterContentId = resourceCenterContent.id;
    const resourceCenterVersion = await buildVersion(prisma, {
      contentId: resourceCenterContent.id,
      sequence: 1,
      config: {},
      data: {
        buttonText: 'Help',
        headerText: 'Resource Center',
        tabs: [
          {
            id: 'tab-1',
            name: 'Main',
            iconSource: 'preset',
            iconType: 'book',
            blocks: [
              {
                id: 'block-1',
                name: [],
                type: 'content-list',
                iconSource: 'preset',
                iconType: 'book',
                flowIconSource: 'preset',
                flowIconType: 'flag',
                checklistIconSource: 'preset',
                checklistIconType: 'check',
                showSearchField: false,
                contentItems: [
                  {
                    contentId: listedFlowContent.id,
                    contentType: 'flow',
                    onlyShowItem: false,
                    onlyShowItemConditions: [],
                  },
                ],
                onlyShowBlock: false,
                onlyShowBlockConditions: [],
              },
            ],
          },
        ],
      },
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: resourceCenterContent.id,
      versionId: resourceCenterVersion.id,
    });

    // Announcement: no scheduledAt on the published version means "visible
    // immediately" for the feed's candidate gate.
    const announcementContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-announcement',
      type: 'announcement',
    });
    announcementContentId = announcementContent.id;
    const announcementVersion = await buildVersion(prisma, {
      contentId: announcementContent.id,
      sequence: 1,
      config: {},
      data: {
        title: 'WS Announcement',
        introContent: [],
      },
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: announcementContent.id,
      versionId: announcementVersion.id,
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

  const findSessionEvent = (sessionId: string, codeName: string) =>
    prisma.bizEvent.findFirst({
      where: { bizSessionId: sessionId, event: { codeName } },
    });

  it('StartContent opens a resource center session and emits SetResourceCenterSession', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: resourceCenterContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    await client.waitForServerMessage(ServerMessageKind.SET_RESOURCE_CENTER_SESSION);

    const bizSession = await prisma.bizSession.findFirst({
      where: {
        contentId: resourceCenterContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
        state: 0,
      },
    });
    expect(bizSession).not.toBeNull();
    resourceCenterSessionId = bizSession?.id as string;
  });

  it('OpenResourceCenter records resource_center_opened', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.OPEN_RESOURCE_CENTER, {
      sessionId: resourceCenterSessionId,
    });
    expect(ack).toBe(true);

    const openedEvent = await findSessionEvent(resourceCenterSessionId, 'resource_center_opened');
    expect(openedEvent).not.toBeNull();
  });

  it('ClickResourceCenter records resource_center_clicked with the block id', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.CLICK_RESOURCE_CENTER, {
      sessionId: resourceCenterSessionId,
      blockId: 'block-1',
    });
    expect(ack).toBe(true);

    const clickedEvent = await findSessionEvent(resourceCenterSessionId, 'resource_center_clicked');
    expect(clickedEvent).not.toBeNull();
    expect((clickedEvent?.data as Record<string, unknown>).resource_center_block_id).toBe(
      'block-1',
    );
  });

  it('ListResourceCenterBlockContent returns the published contents of the block', async () => {
    const items = await client.sendClientMessage(
      ClientMessageKind.LIST_RESOURCE_CENTER_BLOCK_CONTENT,
      {
        sessionId: resourceCenterSessionId,
        blockId: 'block-1',
      },
    );
    expect(Array.isArray(items)).toBe(true);
    const contentIds = (items as Array<{ contentId: string }>).map((item) => item.contentId);
    expect(contentIds).toContain(listedFlowContentId);
  });

  it('CloseResourceCenter records resource_center_closed', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.CLOSE_RESOURCE_CENTER, {
      sessionId: resourceCenterSessionId,
    });
    expect(ack).toBe(true);

    const closedEvent = await findSessionEvent(resourceCenterSessionId, 'resource_center_closed');
    expect(closedEvent).not.toBeNull();
  });

  it('ListAnnouncements returns the published announcement as unseen', async () => {
    const result = await client.sendClientMessage(ClientMessageKind.LIST_ANNOUNCEMENTS, {});
    const announcements = result?.announcements as Array<{
      id: string;
      title?: string;
      seen: boolean;
    }>;
    expect(Array.isArray(announcements)).toBe(true);

    const listed = announcements.find((item) => item.id === announcementContentId);
    expect(listed).toBeDefined();
    expect(listed?.title).toBe('WS Announcement');
    expect(listed?.seen).toBe(false);
  });

  it('GetAnnouncement returns the full detail through the same visibility gate', async () => {
    const detail = await client.sendClientMessage(ClientMessageKind.GET_ANNOUNCEMENT, {
      contentId: announcementContentId,
    });
    expect(detail).not.toBeNull();
    expect(detail.id).toBe(announcementContentId);
    expect(detail.title).toBe('WS Announcement');
  });

  it('MarkAnnouncementsSeen persists the read state and flips the feed flag', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.MARK_ANNOUNCEMENTS_SEEN, {
      items: [{ contentId: announcementContentId }],
    });
    expect(ack).toBe(true);

    const seenRow = await prisma.bizAnnouncementSeen.findFirst({
      where: {
        contentId: announcementContentId,
        bizUser: { externalId: externalUserId, environmentId },
      },
    });
    expect(seenRow).not.toBeNull();

    const seenEvent = await prisma.bizEvent.findFirst({
      where: {
        event: { codeName: 'announcement_seen' },
        bizUser: { externalId: externalUserId, environmentId },
      },
    });
    expect(seenEvent).not.toBeNull();

    const result = await client.sendClientMessage(ClientMessageKind.LIST_ANNOUNCEMENTS, {});
    const listed = (result?.announcements as Array<{ id: string; seen: boolean }>).find(
      (item) => item.id === announcementContentId,
    );
    expect(listed?.seen).toBe(true);
  });
});
