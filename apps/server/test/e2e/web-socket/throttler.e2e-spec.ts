import { ClientMessageKind } from '@usertour/types';
import { ThrottlerOptions } from '@nestjs/throttler';
import { PrismaService } from 'nestjs-prisma';

import { initialization } from '@/modules/projects/utils/project-initialization.util';
import { WebSocketThrottlerGuard } from '@/web-socket/v2/web-socket-throttler.guard';
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
 * The per-socket rate limit as the client sees it, over a real connection.
 * The limit is read at boot, so the environment is set before the
 * application starts and restored after: the e2e suites share one process.
 *
 * The v2 REST guard has limits of its own; the gateway's guard must not run
 * under those.
 */
describe('WebSocket v2 message rate limit (e2e)', () => {
  const shortLimitSetting = 'WS_THROTTLE_SHORT_LIMIT';
  const previousShortLimit = process.env[shortLimitSetting];
  let app: WebSocketTestApp;
  let prisma: PrismaService;
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

  // BeginBatch is answered `true` and does nothing on the server: a refusal
  // is the only way it is answered `false`.
  const burst = async (client: WebSocketTestClient, count: number): Promise<unknown[]> =>
    await Promise.all(
      Array.from({ length: count }, () => client.sendClientMessage(ClientMessageKind.BEGIN_BATCH)),
    );

  beforeAll(async () => {
    process.env[shortLimitSetting] = '5';
    app = await createWebSocketTestApp();
    prisma = app.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-throttler' });
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
    if (previousShortLimit === undefined) {
      delete process.env[shortLimitSetting];
    } else {
      process.env[shortLimitSetting] = previousShortLimit;
    }
  });

  it("runs under the gateway limits, not the REST guard's", () => {
    const guard = app.app.get(WebSocketThrottlerGuard);
    const throttlers = (guard as unknown as { throttlers: ThrottlerOptions[] }).throttlers;
    expect(throttlers.map(({ name, limit }) => ({ name, limit }))).toEqual([
      { name: 'short', limit: 5 },
      { name: 'medium', limit: 300 },
    ]);
  });

  it('a burst over the limit is refused with `false` beyond the limit, handled within it', async () => {
    const client = await connect('throttler-user-1');
    const acks = await burst(client, 8);
    expect(acks.filter((ack) => ack === true)).toHaveLength(5);
    expect(acks.filter((ack) => ack === false)).toHaveLength(3);
  });

  it('the limit is per socket: another connection is not affected', async () => {
    const client = await connect('throttler-user-2');
    expect(await client.sendClientMessage(ClientMessageKind.BEGIN_BATCH)).toBe(true);
  });

  it('a refused socket is served again once the window has passed', async () => {
    const client = await connect('throttler-user-3');
    const acks = await burst(client, 6);
    expect(acks.filter((ack) => ack === false)).toHaveLength(1);
    await sleep(1500);
    expect(await client.sendClientMessage(ClientMessageKind.BEGIN_BATCH)).toBe(true);
  });
});
