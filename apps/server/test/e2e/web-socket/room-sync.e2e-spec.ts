import { ClientMessageKind, ServerMessageKind } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { initialization } from '@/modules/projects/utils/project-initialization.util';
import { SocketMessageQueueService } from '@/web-socket/core/socket-message-queue.service';
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
  WebSocketClientOptions,
  WebSocketTestApp,
  WebSocketTestClient,
  connectWebSocketClient,
  createWebSocketTestApp,
} from './_support';

/**
 * One user, several connections (tabs). What one tab starts or ends shows up
 * on the others, and the tab that sent the message never waits for them: a
 * tab that does not acknowledge costs the sender nothing, although the
 * server's emit to it waits out a two-second timeout.
 */
describe("WebSocket v2 room sync between a user's connections (e2e)", () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let environmentToken: string;
  let flowContentId: string;
  let firstStepCvid: string;
  let secondStepId: string;
  let first: WebSocketTestClient;
  let second: WebSocketTestClient;

  const externalUserId = `ws-room-sync-user-${Date.now()}`;
  const clients: WebSocketTestClient[] = [];

  const connect = async (options?: WebSocketClientOptions): Promise<WebSocketTestClient> => {
    const client = await connectWebSocketClient(
      harness.baseUrl,
      { token: environmentToken, externalUserId },
      options,
    );
    clients.push(client);
    return client;
  };

  const activeSessionId = async (): Promise<string | undefined> => {
    const session = await prisma.bizSession.findFirst({
      where: {
        contentId: flowContentId,
        bizUser: { externalId: externalUserId, environmentId },
        deleted: false,
        state: 0,
      },
      orderBy: { createdAt: 'desc' },
    });
    return session?.id;
  };

  const countOf = (client: WebSocketTestClient, kind: string): number =>
    client.serverMessages.filter((message) => message.kind === kind).length;

  const waitForCount = async (
    client: WebSocketTestClient,
    kind: string,
    count: number,
    timeoutMs = 5_000,
  ): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (countOf(client, kind) < count) {
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for ${count} server-message kind=${kind}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  const startFlow = async (client: WebSocketTestClient) =>
    await client.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-room-sync' });
    projectId = project.id;
    await initialization(prisma, projectId);
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;
    environmentToken = environment.token;

    // A manual flow: started by StartContent, never by auto-start rules, so a
    // tab's own re-evaluation can only show it by resuming a live session.
    // Three steps, so moving to the middle one keeps the flow open.
    const content = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-room-sync-flow',
      type: 'flow',
    });
    flowContentId = content.id;
    const version = await buildVersion(prisma, {
      contentId: content.id,
      sequence: 1,
      config: {},
      data: [],
    });
    firstStepCvid = (
      await buildStep(prisma, { versionId: version.id, sequence: 0, name: 'Step 1', data: [] })
    ).cvid;
    secondStepId = (
      await buildStep(prisma, { versionId: version.id, sequence: 1, name: 'Step 2', data: [] })
    ).id;
    await buildStep(prisma, { versionId: version.id, sequence: 2, name: 'Step 3', data: [] });
    await publishVersion(prisma, { environmentId, contentId: content.id, versionId: version.id });

    first = await connect();
    second = await connect();
  }, 60000);

  afterAll(async () => {
    for (const client of clients) {
      client.disconnect();
    }
    if (prisma) {
      await teardownProject(prisma, projectId);
    }
    await harness?.close();
  });

  it('a flow started on one connection is set on the other, as the same session', async () => {
    expect(await startFlow(first)).toBe(true);
    const sessionId = await activeSessionId();
    expect(sessionId).toBeDefined();

    const onFirst = await first.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);
    const onSecond = await second.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);
    expect(onFirst.payload.id).toBe(sessionId);
    expect(onSecond.payload.id).toBe(sessionId);
  });

  it('a flow ended on one connection is unset on the other, which does not bring it back', async () => {
    const sessionId = await activeSessionId();
    expect(sessionId).toBeDefined();

    const ack = await first.sendClientMessage(ClientMessageKind.END_CONTENT, {
      sessionId,
      endReason: 'user_closed',
    });
    expect(ack).toBe(true);
    await second.waitForServerMessage(ServerMessageKind.UNSET_FLOW_SESSION);

    // The other tab's own evaluation finds no live session to resume.
    const setsBefore = countOf(second, ServerMessageKind.SET_FLOW_SESSION);
    expect(await second.sendClientMessage(ClientMessageKind.END_BATCH, {})).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(countOf(second, ServerMessageKind.SET_FLOW_SESSION)).toBe(setsBefore);
    expect(await activeSessionId()).toBeUndefined();
  });

  it('a connection that never acknowledges does not delay the sender', async () => {
    const silent = await connect({ acknowledge: false });
    const setsOnSecond = countOf(second, ServerMessageKind.SET_FLOW_SESSION);

    const startedAt = Date.now();
    expect(await startFlow(first)).toBe(true);
    const elapsed = Date.now() - startedAt;

    // The emit to the silent connection waits out the server's two-second
    // timeout on that connection's own queue, never inside the sender's
    // handler: the sender's acknowledgement arrives well before it.
    expect(elapsed).toBeLessThan(2000);

    await waitForCount(second, ServerMessageKind.SET_FLOW_SESSION, setsOnSecond + 1);
    await silent.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);
  });

  it('a sync that lands after the user moved on does not write the start step back', async () => {
    const active = await activeSessionId();
    if (active) {
      await first.sendClientMessage(ClientMessageKind.END_CONTENT, {
        sessionId: active,
        endReason: 'user_closed',
      });
    }

    // Hold the other connection's queue, so its sync runs only after the
    // sender's user has already moved to the second step.
    const queue = harness.app.get(SocketMessageQueueService);
    void queue.executeInOrder(
      second.socket.id,
      () => new Promise((resolve) => setTimeout(resolve, 1500)),
    );
    const setsOnSecond = countOf(second, ServerMessageKind.SET_FLOW_SESSION);

    expect(await startFlow(first)).toBe(true);
    const sessionId = await activeSessionId();
    expect(sessionId).toBeDefined();
    const ack = await first.sendClientMessage(ClientMessageKind.GO_TO_STEP, {
      sessionId,
      stepId: secondStepId,
    });
    expect(ack).toBe(true);

    await waitForCount(second, ServerMessageKind.SET_FLOW_SESSION, setsOnSecond + 1);
    const stored = await prisma.bizSession.findUnique({ where: { id: sessionId } });
    expect(stored?.currentStepId).toBe(secondStepId);
  });

  it('starting the same flow again on the sender, at the step it was started at, leaves the stored step alone', async () => {
    // Continues from the previous case: the session is at the second step,
    // while the sender's own snapshot still holds the first. A repeated start
    // at that first step is "no change" for the sender, so it is not forced
    // back to the first step and the stored step must not be written back
    // either. The toggle that follows every start then re-emits the session
    // at the stored step, which must still be the second.
    const sessionId = await activeSessionId();
    expect(sessionId).toBeDefined();
    const forcedOnFirst = countOf(first, ServerMessageKind.FORCE_GO_TO_STEP);
    const setsOnFirst = countOf(first, ServerMessageKind.SET_FLOW_SESSION);

    const ack = await first.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      stepCvid: firstStepCvid,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(countOf(first, ServerMessageKind.FORCE_GO_TO_STEP)).toBe(forcedOnFirst);
    const reEmitted = first.serverMessages
      .filter((message) => message.kind === ServerMessageKind.SET_FLOW_SESSION)
      .slice(setsOnFirst);
    for (const message of reEmitted) {
      expect(message.payload.currentStep.id).toBe(secondStepId);
    }
    const stored = await prisma.bizSession.findUnique({ where: { id: sessionId } });
    expect(stored?.currentStepId).toBe(secondStepId);
  });
});
