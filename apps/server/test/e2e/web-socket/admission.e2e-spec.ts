import { ClientMessageKind } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { initialization } from '@/modules/projects/utils/project-initialization.util';
import { AdmissionService } from '@/web-socket/core/admission.service';
import { buildEnvironment, buildProject } from '../factories';
import { teardownProject } from '../gql/_support';
import {
  WebSocketTestApp,
  WebSocketTestClient,
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
    const ack = await client.sendClientMessage(ClientMessageKind.END_BATCH);
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
    const ack = await client.sendClientMessage(ClientMessageKind.END_BATCH);
    const waited = Date.now() - sentAt;
    await holder;
    // Refused after the 400 ms wait, long before the holder let go.
    expect(ack).toBe(false);
    expect(waited).toBeLessThan(850);
  });

  it('a refused write goes unanswered, so the SDK replays it later', async () => {
    const client = await connect('admission-user-3');
    const holder = admission.run(() => sleep(900), 5000, 'test holder');
    await sleep(20);
    // No acknowledgement within the 400 ms refusal plus margin: the client's
    // own timeout is what ends the wait, as for a lost message.
    await expect(
      client.socket.timeout(700).emitWithAck('client-message', {
        kind: ClientMessageKind.UPSERT_USER,
        payload: { externalUserId: 'admission-user-3', attributes: { plan: 'pro' } },
      }),
    ).rejects.toThrow('operation has timed out');
    await holder;
  });

  it('BeginBatch is answered without taking a slot', async () => {
    const client = await connect('admission-user-4');
    const holder = admission.run(() => sleep(300), 5000, 'test holder');
    await sleep(20);
    const sentAt = Date.now();
    const ack = await client.sendClientMessage(ClientMessageKind.BEGIN_BATCH);
    expect(ack).toBe(true);
    expect(Date.now() - sentAt).toBeLessThan(200);
    await holder;
  });

  it('handshakes over the rate are refused as retryable, and admitted again later', async () => {
    // Three per second are allowed; a burst of eight at once must see both
    // outcomes, whatever the refill since the connections above.
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) =>
        connectWebSocketClient(app.baseUrl, {
          token: environmentToken,
          externalUserId: `admission-burst-${index}`,
        }),
      ),
    );
    const connected: WebSocketTestClient[] = [];
    const refusals: Array<{ code: string; retryable: boolean } | undefined> = [];
    for (const attempt of attempts) {
      if (attempt.status === 'fulfilled') {
        connected.push(attempt.value);
      } else {
        refusals.push(
          (attempt.reason as Error & { data?: { code: string; retryable: boolean } }).data,
        );
      }
    }
    clients.push(...connected);
    expect(connected.length).toBeGreaterThanOrEqual(1);
    expect(refusals.length).toBeGreaterThanOrEqual(1);
    for (const refusal of refusals) {
      expect(refusal).toEqual({ code: 'E1014', retryable: true });
    }

    await sleep(1100);
    const later = await connect('admission-burst-later');
    expect(later.socket.connected).toBe(true);
  });
});
