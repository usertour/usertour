import { PrismaService } from 'nestjs-prisma';
import { Socket } from 'socket.io';
import { ClientMessageKind, ContentDataType } from '@usertour/types';

import { SocketDataService } from '@/web-socket/core/socket-data.service';
import { WebSocketV2Service } from '@/web-socket/v2/web-socket-v2.service';
import { buildEnvironment, buildProject } from '../factories';
import { teardownProject } from '../gql/_support';
import {
  WebSocketTestApp,
  connectExpectingError,
  connectWebSocketClient,
  createWebSocketTestApp,
} from './_support';

type HandshakeError = Error & { data?: { code?: string; retryable?: boolean } };

/**
 * The server half of connection recovery (ADR 0018 §2, §3, §6): a handshake
 * rejection says whether the client should retry, a connection whose socket
 * data vanished from the store is rebuilt instead of kicked, and the wait
 * timers a reconnecting SDK declares survive into its socket data.
 */
describe('WebSocket v2 connection recovery (e2e)', () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;
  let environmentToken: string;

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-connection-recovery' });
    projectId = project.id;
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentToken = environment.token;
  }, 60000);

  afterAll(async () => {
    jest.restoreAllMocks();
    if (prisma) {
      await teardownProject(prisma, projectId);
    }
    await harness?.close();
  });

  const socketHandle = (socketId: string) => ({ id: socketId }) as unknown as Socket;

  describe('handshake rejection carries a retry verdict', () => {
    it('an unknown token is the client’s fault: E1018, not retryable', async () => {
      const error = (await connectExpectingError(harness.baseUrl, {
        token: 'no-such-token',
        externalUserId: 'ws-recovery-reject',
      })) as HandshakeError;
      expect(error.data).toEqual({ code: 'E1018', retryable: false });
    });

    it('a server fault during the handshake is retryable: E1014', async () => {
      jest
        .spyOn(harness.app.get(WebSocketV2Service), 'initializeSocketData')
        .mockRejectedValueOnce(new Error('database unavailable'));
      const error = (await connectExpectingError(harness.baseUrl, {
        token: environmentToken,
        externalUserId: 'ws-recovery-fault',
      })) as HandshakeError;
      expect(error.data).toEqual({ code: 'E1014', retryable: true });
    });
  });

  describe('socket data lost under a live connection', () => {
    it('is rebuilt from the handshake and the message is served', async () => {
      const externalUserId = `ws-recovery-rebuild-${Date.now()}`;
      const client = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId,
      });
      const socketDataService = harness.app.get(SocketDataService);
      const handle = socketHandle(client.socket.id as string);

      await socketDataService.delete(handle);
      expect(await socketDataService.get(handle)).toBeNull();

      const ack = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
      expect(ack).toBe(true);
      expect(client.socket.connected).toBe(true);

      const rebuilt = await socketDataService.get(handle);
      expect(rebuilt?.externalUserId).toBe(externalUserId);
      expect(rebuilt?.bizUserId).toEqual(expect.any(String));

      client.disconnect();
    });

    it('disconnects only when the rebuild itself fails', async () => {
      const client = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId: `ws-recovery-rebuild-fail-${Date.now()}`,
      });
      const socketDataService = harness.app.get(SocketDataService);
      await socketDataService.delete(socketHandle(client.socket.id as string));
      jest
        .spyOn(harness.app.get(WebSocketV2Service), 'initializeSocketData')
        .mockResolvedValueOnce(null);

      const disconnected = new Promise<string>((resolve) => {
        client.socket.on('disconnect', (reason) => resolve(reason));
      });
      await client.sendClientMessage(ClientMessageKind.END_BATCH, {}).catch(() => undefined);
      expect(await disconnected).toBe('io server disconnect');
    });
  });

  describe('wait timers declared in the handshake', () => {
    it('are restored into socket data as declared', async () => {
      const waitTimers = [
        {
          contentId: 'content_a',
          contentType: ContentDataType.FLOW,
          versionId: 'version_a',
          waitTime: 30,
        },
        {
          contentId: 'content_b',
          contentType: ContentDataType.CHECKLIST,
          versionId: 'version_b',
          waitTime: 5,
          activated: true,
        },
      ];
      const client = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId: `ws-recovery-timers-${Date.now()}`,
        waitTimers,
      });
      const stored = await harness.app
        .get(SocketDataService)
        .get(socketHandle(client.socket.id as string));
      expect(stored?.waitTimers).toEqual(waitTimers);
      client.disconnect();
    });

    it('default to an empty list when the handshake declares none or not a list', async () => {
      const malformed = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId: `ws-recovery-bad-timers-${Date.now()}`,
        waitTimers: 'nope' as unknown as unknown[],
      });
      const storedMalformed = await harness.app
        .get(SocketDataService)
        .get(socketHandle(malformed.socket.id as string));
      expect(storedMalformed?.waitTimers).toEqual([]);
      malformed.disconnect();

      const client = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId: `ws-recovery-no-timers-${Date.now()}`,
      });
      const stored = await harness.app
        .get(SocketDataService)
        .get(socketHandle(client.socket.id as string));
      expect(stored?.waitTimers).toEqual([]);
      client.disconnect();
    });
  });
});
