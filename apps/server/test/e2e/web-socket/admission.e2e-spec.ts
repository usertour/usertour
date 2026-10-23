import { ClientMessageKind } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { initialization } from '@/modules/projects/utils/project-initialization.util';
import { AdmissionService } from '@/web-socket/core/admission.service';
import { buildEnvironment, buildProject } from '../factories';
import { teardownProject } from '../gql/_support';
import {
  WebSocketTestApp,
  WebSocketTestClient,
  connectExpectingError,
  connectWebSocketClient,
  createWebSocketTestApp,
} from './_support';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The admission gate as the client sees it. The environment is set before
 * the application boots (its config is read at boot) and restored after:
 * the e2e suites share one process.
 */
describe('WebSocket v2 admission gate (e2e)', () => {
  const previous = {
    concurrency: process.env.WS_ADMISSION_CONCURRENCY,
    messageWait: process.env.WS_ADMISSION_MESSAGE_WAIT_MS,
    handshakeRate: process.env.WS_HANDSHAKE_RATE_PER_SECOND,
  };
  let app: WebSocketTestApp;
  let prisma: PrismaService;
  let admission: AdmissionService;
  let projectId: string;
  let environmentToken: string;
  const clients: WebSocketTestClient[] = [];

  const connect = async (externalUserId: string): Promise<WebSocketTestClient> => {
    const client = await connectWebSocketClient(app.baseUrl, {
      token: environmentToken,
      externalUserId,
    });
    clients.push(client);
    return client;
  };

  beforeAll(async () => {
    process.env.WS_ADMISSION_CONCURRENCY = '1';
    process.env.WS_ADMISSION_MESSAGE_WAIT_MS = '400';
    process.env.WS_HANDSHAKE_RATE_PER_SECOND = '3';
    app = await createWebSocketTestApp();
    prisma = app.app.get(PrismaService);
    admission = app.app.get(AdmissionService);

    const project = await buildProject(prisma, { name: 'ws-admission' });
    projectId = project.id;
    await initialization(prisma, projectId);
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentToken = environment.token;
  }, 60000);

  afterAll(async () => {
    for (const client of clients) {
      client.disconnect();
    }
    if (prisma) {
      await teardownProject(prisma, projectId);
    }
    await app?.close();
    for (const [name, value] of [
      ['WS_ADMISSION_CONCURRENCY', previous.concurrency],
      ['WS_ADMISSION_MESSAGE_WAIT_MS', previous.messageWait],
      ['WS_HANDSHAKE_RATE_PER_SECOND', previous.handshakeRate],
    ] as const) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it('a message waits for a slot and is then handled', async () => {
    const client = await connect('admission-user-1');
    // Hold the only slot for a while, as a long handler on another socket would.
    const holder = admission.run(() => sleep(250), 5000, 'test holder');
    await sleep(20);
    const sentAt = Date.now();
    const ack = await client.sendClientMessage(ClientMessageKind.BEGIN_BATCH);
    const waited = Date.now() - sentAt;
    await holder;
    expect(ack).toBe(true);
    expect(waited).toBeGreaterThanOrEqual(200);
  });

  it('a message that cannot get a slot in time is refused with an acknowledgement', async () => {
    const client = await connect('admission-user-2');
    const holder = admission.run(() => sleep(900), 5000, 'test holder');
    await sleep(20);
    const sentAt = Date.now();
    const ack = await client.sendClientMessage(ClientMessageKind.BEGIN_BATCH);
    const waited = Date.now() - sentAt;
    await holder;
    // Refused after the 400 ms wait, long before the holder let go.
    expect(ack).toBe(false);
    expect(waited).toBeLessThan(850);
  });

  it('handshakes over the rate are refused as retryable, and admitted again later', async () => {
    // The rate allows three per second; the two connections above and the
    // refill since are accounted for by connecting well over it at once.
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) =>
        connectWebSocketClient(app.baseUrl, {
          token: environmentToken,
          externalUserId: `admission-burst-${index}`,
        }),
      ),
    );
    const connected = attempts.filter((attempt) => attempt.status === 'fulfilled');
    for (const attempt of connected) {
      if (attempt.status === 'fulfilled') {
        clients.push(attempt.value);
      }
    }
    expect(connected.length).toBeGreaterThanOrEqual(1);
    expect(connected.length).toBeLessThan(8);

    const refused = await connectExpectingError(app.baseUrl, {
      token: environmentToken,
      externalUserId: 'admission-burst-refused',
    });
    expect((refused as Error & { data?: { code: string; retryable: boolean } }).data).toEqual({
      code: 'E1014',
      retryable: true,
    });

    await sleep(1100);
    const later = await connect('admission-burst-later');
    expect(later.socket.connected).toBe(true);
  });
});
