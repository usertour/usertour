import { ClientMessageKind, ServerMessageKind } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import type { Namespace } from 'socket.io';

import { initialization } from '@/modules/projects/utils/project-initialization.util';
import { WebSocketV2Gateway } from '@/web-socket/v2/web-socket-v2.gateway';
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
 * One user, two connections on two servers of one cluster (two application
 * instances on the Redis adapter, under a channel prefix of their own). What
 * one connection starts or ends reaches the other through the servers'
 * side channel, and the sender never waits for it.
 */
describe("WebSocket v2 room sync across a cluster's servers (e2e)", () => {
  let first: WebSocketTestApp;
  let second: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let environmentToken: string;
  let flowContentId: string;
  let onFirst: WebSocketTestClient;
  let onSecond: WebSocketTestClient;

  const externalUserId = `ws-cluster-user-${Date.now()}`;
  const clients: WebSocketTestClient[] = [];

  const connect = async (server: WebSocketTestApp): Promise<WebSocketTestClient> => {
    const client = await connectWebSocketClient(server.baseUrl, {
      token: environmentToken,
      externalUserId,
    });
    clients.push(client);
    return client;
  };

  const serverCountSeenBy = async (server: WebSocketTestApp): Promise<number> => {
    const namespace = server.app.get(WebSocketV2Gateway).server as unknown as Namespace;
    return await namespace.adapter.serverCount();
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

  beforeAll(async () => {
    const redisAdapterKey = `socket.io-e2e-${Date.now()}`;
    first = await createWebSocketTestApp({ redisAdapterKey });
    second = await createWebSocketTestApp({ redisAdapterKey });
    prisma = first.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-room-sync-cluster' });
    projectId = project.id;
    await initialization(prisma, projectId);
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;
    environmentToken = environment.token;

    const content = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'ws-cluster-flow',
      type: 'flow',
    });
    flowContentId = content.id;
    const version = await buildVersion(prisma, {
      contentId: content.id,
      sequence: 1,
      config: {},
      data: [],
    });
    await buildStep(prisma, { versionId: version.id, sequence: 0, name: 'Step 1', data: [] });
    await buildStep(prisma, { versionId: version.id, sequence: 1, name: 'Step 2', data: [] });
    await publishVersion(prisma, { environmentId, contentId: content.id, versionId: version.id });

    onFirst = await connect(first);
    onSecond = await connect(second);
  }, 90000);

  afterAll(async () => {
    for (const client of clients) {
      client.disconnect();
    }
    // The emit to the silent connection is still waiting out its two-second
    // timeout on the second server; let it end before the servers close, or
    // the close logs the timeout and a lock released on a closed connection.
    await new Promise((resolve) => setTimeout(resolve, 2500));
    if (prisma) {
      await teardownProject(prisma, projectId);
    }
    await second?.close();
    await first?.close();
  });

  it('the two servers see each other as one cluster', async () => {
    expect(await serverCountSeenBy(first)).toBe(2);
    expect(await serverCountSeenBy(second)).toBe(2);
  });

  it('a flow started on one server is set on the connection held by the other', async () => {
    const ack = await onFirst.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });
    expect(ack).toBe(true);
    const sessionId = await activeSessionId();
    expect(sessionId).toBeDefined();

    const here = await onFirst.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);
    const there = await onSecond.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);
    expect(here.payload.id).toBe(sessionId);
    expect(there.payload.id).toBe(sessionId);
  });

  it('a flow ended on one server is unset on the connection held by the other', async () => {
    const sessionId = await activeSessionId();
    expect(sessionId).toBeDefined();

    const ack = await onFirst.sendClientMessage(ClientMessageKind.END_CONTENT, {
      sessionId,
      endReason: 'user_closed',
    });
    expect(ack).toBe(true);
    await onSecond.waitForServerMessage(ServerMessageKind.UNSET_FLOW_SESSION);
    expect(await activeSessionId()).toBeUndefined();
  });

  it('the sender does not wait for a connection on the other server', async () => {
    const other = await connect(second);

    const startedAt = Date.now();
    const ack = await onFirst.sendClientMessage(ClientMessageKind.START_CONTENT, {
      contentId: flowContentId,
      startReason: 'start_from_manual',
    });
    const elapsed = Date.now() - startedAt;
    expect(ack).toBe(true);

    // The other server takes the session on that connection's own queue;
    // nothing in the sender's handler waits for it, or for any receipt.
    expect(elapsed).toBeLessThan(2000);
    await other.waitForServerMessage(ServerMessageKind.SET_FLOW_SESSION);
  });
});
