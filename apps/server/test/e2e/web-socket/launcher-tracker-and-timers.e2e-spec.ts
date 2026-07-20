import { PrismaService } from 'nestjs-prisma';
import { ClientMessageKind, ServerMessageKind } from '@usertour/types';

import { initialization } from '@/common/initialization/initialization';
import {
  buildContent,
  buildEnvironment,
  buildEvent,
  buildProject,
  buildSegment,
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
 * Launcher lifecycle, tracker events, the auto-start wait-timer handshake and
 * the client-condition guard, over a real socket.io connection.
 *
 * The wait-timer scenario exercises the full deferred auto-start pipeline:
 * EndBatch announces the timer (StartConditionWaitTimer) instead of starting
 * the flow, FireConditionWaitTimer marks it elapsed, and the next EndBatch
 * actually creates the session.
 */
describe('WebSocket v2 launcher, tracker and timers (e2e)', () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let environmentToken: string;
  let client: WebSocketTestClient;

  const externalUserId = `ws-launcher-user-${Date.now()}`;

  let launcherContentId: string;
  let launcherSessionId: string;
  let trackerContentId: string;
  let trackerVersionId: string;
  let trackerEventCodeName: string;
  let waitFlowContentId: string;
  let waitFlowVersionId: string;

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-launcher-tracker' });
    projectId = project.id;
    await initialization(prisma, projectId);
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;
    environmentToken = environment.token;

    // Launchers are auto-start driven: the batch path filters on actived
    // auto-start rules even for an explicit contentId, so the launcher
    // carries an always-on segment rule and is started via EndBatch.
    const allUsersSegment = await buildSegment(prisma, {
      projectId,
      environmentId,
      bizType: 1,
      dataType: 1,
    });
    const alwaysOnAutoStartConfig = {
      enabledAutoStartRules: true,
      autoStartRules: [
        {
          type: 'segment',
          operators: 'and',
          data: { segmentId: allUsersSegment.id, logic: 'is' },
        },
      ],
    };

    const launcherContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-launcher',
      type: 'launcher',
    });
    launcherContentId = launcherContent.id;
    const launcherVersion = await buildVersion(prisma, {
      contentId: launcherContent.id,
      sequence: 1,
      config: { ...alwaysOnAutoStartConfig, autoStartRulesSetting: { wait: 0 } },
      data: {},
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: launcherContent.id,
      versionId: launcherVersion.id,
    });

    // Tracker: version.data.eventId names the target event definition.
    const trackerEvent = await buildEvent(prisma, {
      projectId,
      displayName: 'WS Tracker Target Event',
    });
    trackerEventCodeName = trackerEvent.codeName;
    const trackerContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-tracker',
      type: 'tracker',
    });
    trackerContentId = trackerContent.id;
    const trackerVersion = await buildVersion(prisma, {
      contentId: trackerContent.id,
      sequence: 1,
      config: {},
      data: { eventId: trackerEvent.id },
    });
    trackerVersionId = trackerVersion.id;
    await publishVersion(prisma, {
      environmentId,
      contentId: trackerContent.id,
      versionId: trackerVersion.id,
    });

    // Auto-start flow with a wait timer, gated on the same always-on segment
    // so the rules are actived and only the timer defers the start.
    const waitFlowContent = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-wait-flow',
      type: 'flow',
    });
    waitFlowContentId = waitFlowContent.id;
    const waitFlowVersion = await buildVersion(prisma, {
      contentId: waitFlowContent.id,
      sequence: 1,
      config: { ...alwaysOnAutoStartConfig, autoStartRulesSetting: { wait: 60 } },
      data: [],
    });
    waitFlowVersionId = waitFlowVersion.id;
    await buildStep(prisma, {
      versionId: waitFlowVersion.id,
      sequence: 0,
      name: 'Wait Step 1',
      data: [],
    });
    await publishVersion(prisma, {
      environmentId,
      contentId: waitFlowContent.id,
      versionId: waitFlowVersion.id,
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

  const findWaitFlowSession = () =>
    prisma.bizSession.findFirst({
      where: {
        contentId: waitFlowContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
      },
    });

  it('EndBatch distributes the launcher without persisting a session', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
    expect(ack).toBe(true);
    await client.waitForServerMessage(ServerMessageKind.ADD_LAUNCHER);

    // Launcher sessions are created lazily: the batch distribution emits
    // AddLauncher for the SDK to render, but no BizSession row exists until
    // the user interacts and the SDK starts the launcher by contentId.
    const bizSession = await prisma.bizSession.findFirst({
      where: {
        contentId: launcherContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
      },
    });
    expect(bizSession).toBeNull();
  });

  it('StartContent persists the launcher session', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: launcherContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);

    const bizSession = await prisma.bizSession.findFirst({
      where: {
        contentId: launcherContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
        state: 0,
      },
    });
    expect(bizSession).not.toBeNull();
    launcherSessionId = bizSession?.id as string;
  });

  it('ActivateLauncher records launcher_activated', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.ACTIVATE_LAUNCHER, {
      sessionId: launcherSessionId,
    });
    expect(ack).toBe(true);

    const activatedEvent = await findSessionEvent(launcherSessionId, 'launcher_activated');
    expect(activatedEvent).not.toBeNull();
  });

  it('DismissLauncher ends the launcher session', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.DISMISS_LAUNCHER, {
      sessionId: launcherSessionId,
      endReason: 'user_closed',
    });
    expect(ack).toBe(true);

    const endedSession = await prisma.bizSession.findUnique({
      where: { id: launcherSessionId },
    });
    expect(endedSession?.state).not.toBe(0);

    const dismissedEvent = await findSessionEvent(launcherSessionId, 'launcher_dismissed');
    expect(dismissedEvent).not.toBeNull();
  });

  it('TrackTrackerEvent records the tracker target event and dedups within the window', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.TRACK_TRACKER_EVENT, {
      contentId: trackerContentId,
      versionId: trackerVersionId,
    });
    expect(ack).toBe(true);

    const trackedEvents = await prisma.bizEvent.findMany({
      where: {
        contentId: trackerContentId,
        versionId: trackerVersionId,
        event: { codeName: trackerEventCodeName },
        bizUser: { externalId: externalUserId, environmentId },
      },
    });
    expect(trackedEvents).toHaveLength(1);

    // A second report inside the 3s dedup window must not create another row.
    const dedupAck = await client.sendClientMessage(ClientMessageKind.TRACK_TRACKER_EVENT, {
      contentId: trackerContentId,
      versionId: trackerVersionId,
    });
    expect(dedupAck).toBe(true);
    const afterDedup = await prisma.bizEvent.count({
      where: {
        contentId: trackerContentId,
        versionId: trackerVersionId,
        event: { codeName: trackerEventCodeName },
        bizUser: { externalId: externalUserId, environmentId },
      },
    });
    expect(afterDedup).toBe(1);
  });

  it('EndBatch defers a wait-timer flow and FireConditionWaitTimer releases it', async () => {
    const firstBatchAck = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
    expect(firstBatchAck).toBe(true);

    await client.waitForServerMessage(ServerMessageKind.START_CONDITION_WAIT_TIMER);
    expect(await findWaitFlowSession()).toBeNull();

    const fireAck = await client.sendClientMessage(ClientMessageKind.FIRE_CONDITION_WAIT_TIMER, {
      versionId: waitFlowVersionId,
    });
    expect(fireAck).toBe(true);

    const secondBatchAck = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
    expect(secondBatchAck).toBe(true);

    const waitFlowSession = await findWaitFlowSession();
    expect(waitFlowSession).not.toBeNull();
    expect(waitFlowSession?.state).toBe(0);
  });

  it('ToggleClientCondition rejects a condition the server never tracked', async () => {
    const ack = await client.sendClientMessage(ClientMessageKind.TOGGLE_CLIENT_CONDITION, {
      contentId: waitFlowContentId,
      contentType: 'flow',
      versionId: waitFlowVersionId,
      conditionId: 'condition-that-does-not-exist',
      activated: true,
    });
    expect(ack).toBe(false);
  });
});
