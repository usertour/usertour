import { PrismaService } from 'nestjs-prisma';
import { Socket } from 'socket.io';

import { SocketDataService } from '@/web-socket/core/socket-data.service';
import { buildEnvironment, buildProject } from '../factories';
import { teardownProject } from '../gql/_support';
import {
  WebSocketTestApp,
  connectExpectingError,
  connectWebSocketClient,
  createWebSocketTestApp,
} from './_support';

/**
 * Connection lifecycle e2e for the v2 gateway: handshake auth against the
 * environment token, biz-user provisioning as a connection side effect, and
 * socket-data cleanup on disconnect. Runs over a real socket.io connection.
 */
describe('WebSocket v2 connection lifecycle (e2e)', () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let environmentToken: string;

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-connection' });
    projectId = project.id;
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;
    environmentToken = environment.token;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
    }
    await harness?.close();
  });

  it('authenticates with a valid environment token and provisions the biz user', async () => {
    const externalUserId = `ws-user-${Date.now()}`;
    const client = await connectWebSocketClient(harness.baseUrl, {
      token: environmentToken,
      externalUserId,
    });

    const bizUser = await prisma.bizUser.findFirst({
      where: { externalId: externalUserId, environmentId },
    });
    expect(bizUser).not.toBeNull();

    client.disconnect();
  });

  it('rejects a handshake without a token', async () => {
    const error = await connectExpectingError(harness.baseUrl, {
      externalUserId: 'ws-user-no-token',
    });
    expect(error).toBeInstanceOf(Error);
  });

  it('rejects a handshake with an unknown token', async () => {
    const error = await connectExpectingError(harness.baseUrl, {
      token: 'not-a-real-environment-token',
      externalUserId: 'ws-user-bad-token',
    });
    expect(error).toBeInstanceOf(Error);
  });

  it('rejects a handshake without an externalUserId', async () => {
    const error = await connectExpectingError(harness.baseUrl, {
      token: environmentToken,
    });
    expect(error).toBeInstanceOf(Error);
  });

  it('cleans up stored socket data on disconnect', async () => {
    const client = await connectWebSocketClient(harness.baseUrl, {
      token: environmentToken,
      externalUserId: `ws-user-cleanup-${Date.now()}`,
    });
    const socketId = client.socket.id as string;
    const socketDataService = harness.app.get(SocketDataService);
    const socketHandle = { id: socketId } as unknown as Socket;

    const storedWhileConnected = await socketDataService.get(socketHandle);
    expect(storedWhileConnected).not.toBeNull();

    client.disconnect();

    // handleDisconnect runs asynchronously after the transport closes.
    let storedAfterDisconnect = storedWhileConnected;
    for (let attempt = 0; attempt < 20 && storedAfterDisconnect !== null; attempt += 1) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
      storedAfterDisconnect = await socketDataService.get(socketHandle);
    }
    expect(storedAfterDisconnect).toBeNull();
  });
});
