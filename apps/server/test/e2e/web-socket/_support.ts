import { INestApplication } from '@nestjs/common';
import { AddressInfo } from 'node:net';
import { Socket as ClientSocket, io } from 'socket.io-client';

import { createTestApp } from '../create-test-app';

export interface WebSocketTestApp {
  app: INestApplication;
  baseUrl: string;
  close: () => Promise<void>;
}

/**
 * Boots the full application on an ephemeral port so socket.io clients can
 * perform a real websocket handshake against the v2 gateway (`/v2`
 * namespace). The HTTP e2e harness (createTestApp + supertest) never listens
 * on a port; websocket specs need a live server. Uses the default in-process
 * socket.io adapter — the RedisIoAdapter is only wired in main.ts and a
 * single-instance test doesn't need cross-instance fan-out.
 */
export async function createWebSocketTestApp(): Promise<WebSocketTestApp> {
  const app = await createTestApp();
  await app.listen(0);
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
    const waiters: Array<{ kind: string; resolve: (message: ServerMessage) => void }> = [];

    // The server delivers sessions via emitWithAck and waits for the client's
    // acknowledgment — a client that never acks would stall every emit until
    // its timeout. Record and ack everything.
    socket.on('server-message', (message: ServerMessage, ack?: (ok: boolean) => void) => {
      serverMessages.push(message);
      if (typeof ack === 'function') {
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
