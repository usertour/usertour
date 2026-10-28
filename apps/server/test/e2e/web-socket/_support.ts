import { INestApplication } from '@nestjs/common';
import { AddressInfo } from 'node:net';
import { Socket as ClientSocket, io } from 'socket.io-client';

import { createTestApp } from '../create-test-app';
import { RedisClusterTestAdapter } from './redis-cluster-adapter';

export interface WebSocketTestApp {
  app: INestApplication;
  baseUrl: string;
  close: () => Promise<void>;
}

export interface WebSocketTestAppOptions {
  /**
   * Run the socket.io server on a Redis adapter, as production does, under
   * this channel prefix (see RedisClusterTestAdapter). Apps created with the
   * same prefix form one cluster. Without it the app runs the in-process
   * adapter: one server, no cross-server traffic.
   */
  redisAdapterKey?: string;
}

/**
 * Boots the full application on an ephemeral port so socket.io clients can
 * perform a real websocket handshake against the v2 gateway (`/v2`
 * namespace). createTestApp listens on an ephemeral port for every suite;
 * websocket specs read it back for a real handshake. A single-instance spec
 * runs the default in-process socket.io adapter; a cluster spec passes a
 * Redis adapter key and boots several apps under it.
 */
export async function createWebSocketTestApp(
  options: WebSocketTestAppOptions = {},
): Promise<WebSocketTestApp> {
  const { redisAdapterKey } = options;
  // The application closes the adapter with itself: its socket.io server
  // first, then (dispose) the adapter's own Redis connections.
  const app = await createTestApp(undefined, async (created) => {
    if (!redisAdapterKey) {
      return;
    }
    const adapter = new RedisClusterTestAdapter(created, redisAdapterKey);
    await adapter.connectToRedis();
    created.useWebSocketAdapter(adapter);
  });
  const address = app.getHttpServer().address() as AddressInfo;
  return {
    app,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await app.close();
    },
  };
}

export interface ServerMessage {
  kind: string;
  payload: any;
  messageId?: string;
}

export interface WebSocketTestClient {
  socket: ClientSocket;
  /** Every server-message received, in arrival order. */
  serverMessages: ServerMessage[];
  /**
   * The server-messages that asked for a receipt. The server pushes without
   * one, so this stays empty; a push that waits on the client shows up here.
   */
  receiptRequests: ServerMessage[];
  /** Send a client-message and resolve with the server's ack value. */
  sendClientMessage: (kind: string, payload?: Record<string, unknown>) => Promise<any>;
  /** Resolve with the first (recorded or future) server-message of `kind`. */
  waitForServerMessage: (kind: string, timeoutMs?: number) => Promise<ServerMessage>;
  disconnect: () => void;
}

export interface WebSocketAuth {
  token?: string;
  externalUserId?: string;
  externalCompanyId?: string;
  identityToken?: string;
  clientContext?: Record<string, unknown>;
  clientConditions?: unknown[];
  waitTimers?: unknown[];
  sdkVersion?: unknown;
  // Session-recovery handshake: ids of sessions the SDK held before a
  // reconnect, restored server-side into the new connection's socket data.
  flowSessionId?: string;
  checklistSessionId?: string;
  bannerSessionId?: string;
  resourceCenterSessionId?: string;
  launchers?: string[];
}

const DEFAULT_CLIENT_CONTEXT = {
  pageUrl: 'https://example.test/app',
  viewportWidth: 1280,
  viewportHeight: 800,
};

export function connectWebSocketClient(
  baseUrl: string,
  auth: WebSocketAuth,
): Promise<WebSocketTestClient> {
  return new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/v2`, {
      transports: ['websocket'],
      reconnection: false,
      auth: { clientContext: DEFAULT_CLIENT_CONTEXT, ...auth },
    });

    const serverMessages: ServerMessage[] = [];
    const receiptRequests: ServerMessage[] = [];
    const waiters: Array<{ kind: string; resolve: (message: ServerMessage) => void }> = [];

    // The server pushes its messages without asking for a receipt, so `ack`
    // is absent; it is answered if a message ever carries one. Everything
    // received is recorded.
    socket.on('server-message', (message: ServerMessage, ack?: (ok: boolean) => void) => {
      serverMessages.push(message);
      if (typeof ack === 'function') {
        receiptRequests.push(message);
        ack(true);
      }
      for (let index = waiters.length - 1; index >= 0; index -= 1) {
        if (waiters[index].kind === message.kind) {
          const [waiter] = waiters.splice(index, 1);
          waiter.resolve(message);
        }
      }
    });

    socket.on('connect', () => {
      resolve({
        socket,
        serverMessages,
        receiptRequests,
        sendClientMessage: async (kind, payload = {}) =>
          await socket.timeout(10_000).emitWithAck('client-message', { kind, payload }),
        waitForServerMessage: (kind, timeoutMs = 5_000) => {
          const existing = serverMessages.find((message) => message.kind === kind);
          if (existing) {
            return Promise.resolve(existing);
          }
          return new Promise<ServerMessage>((resolveWait, rejectWait) => {
            const timer = setTimeout(() => {
              rejectWait(new Error(`Timed out waiting for server-message kind=${kind}`));
            }, timeoutMs);
            waiters.push({
              kind,
              resolve: (message) => {
                clearTimeout(timer);
                resolveWait(message);
              },
            });
          });
        },
        disconnect: () => {
          socket.disconnect();
        },
      });
    });

    socket.on('connect_error', (error: Error) => {
      socket.close();
      reject(error);
    });
  });
}

/** Attempt a connection that is expected to be rejected during the handshake. */
export function connectExpectingError(baseUrl: string, auth: WebSocketAuth): Promise<Error> {
  return new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/v2`, {
      transports: ['websocket'],
      reconnection: false,
      auth: { clientContext: DEFAULT_CLIENT_CONTEXT, ...auth },
    });
    socket.on('connect', () => {
      socket.disconnect();
      reject(new Error('Expected the connection to be rejected, but it connected'));
    });
    socket.on('connect_error', (error: Error) => {
      socket.close();
      resolve(error);
    });
  });
}
