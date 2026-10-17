import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'nestjs-prisma';
import { RedisService } from '@/modules/common/services/redis.service';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';

// The readiness check answers ok only when the database and Redis answer
// from this process, within a bound; otherwise 503 naming what is down, with
// the reason kept out of the public body.
const buildController = async (
  databasePing: () => Promise<unknown>,
  redisPing: () => Promise<string>,
) => {
  const prisma = { $queryRaw: jest.fn(databasePing) };
  const redis = { getClient: jest.fn(() => ({ ping: redisPing })) };
  const module = await Test.createTestingModule({
    imports: [TerminusModule.forRoot({ logger: false })],
    controllers: [HealthController],
    providers: [
      DatabaseHealthIndicator,
      RedisHealthIndicator,
      { provide: PrismaService, useValue: prisma },
      { provide: RedisService, useValue: redis },
    ],
  }).compile();
  return { controller: module.get(HealthController), prisma, redis };
};

const unavailableResponse = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    return (error as ServiceUnavailableException).getResponse() as {
      status: string;
      error: Record<string, { status: string; message?: string }>;
    };
  }
  throw new Error('expected the check to reject');
};

describe('HealthController.live', () => {
  it('answers ok without consulting any dependency', async () => {
    const { controller, prisma, redis } = await buildController(
      async () => {
        throw new Error('must not be called');
      },
      async () => {
        throw new Error('must not be called');
      },
    );

    expect(await controller.live()).toMatchObject({ status: 'ok' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(redis.getClient).not.toHaveBeenCalled();
  });
});

describe('HealthController.ready', () => {
  it('logs the reason a dependency is down and keeps it out of the body', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { controller } = await buildController(
      async () => {
        throw new Error("Can't reach database server at db.internal:6432");
      },
      async () => 'PONG',
    );

    const response = await unavailableResponse(() => controller.ready());

    expect(JSON.stringify(response)).not.toContain('db.internal');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('db.internal:6432'));
    warn.mockRestore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('answers ok when the database and Redis answer', async () => {
    const { controller } = await buildController(
      async () => [{ '?column?': 1 }],
      async () => 'PONG',
    );

    const result = await controller.ready();

    expect(result.status).toBe('ok');
    expect(result.info).toMatchObject({ database: { status: 'up' }, redis: { status: 'up' } });
  });

  it('answers 503 naming the database when its ping fails', async () => {
    const { controller } = await buildController(
      async () => {
        throw new Error("Can't reach database server");
      },
      async () => 'PONG',
    );

    const response = await unavailableResponse(() => controller.ready());

    expect(response.status).toBe('error');
    expect(response.error).toEqual({ database: { status: 'down' } });
  });

  it('answers 503 naming Redis when its client is not available', async () => {
    const { controller, redis } = await buildController(
      async () => [{ '?column?': 1 }],
      async () => 'PONG',
    );
    redis.getClient.mockImplementation(() => {
      throw new Error('Redis client not available');
    });

    const response = await unavailableResponse(() => controller.ready());

    expect(response.error).toEqual({ redis: { status: 'down' } });
  });

  it('answers 503 when the Redis ping does not answer within the bound', async () => {
    const { controller } = await buildController(
      async () => [{ '?column?': 1 }],
      () => new Promise<string>(() => {}),
    );
    jest.useFakeTimers();

    const pending = unavailableResponse(() => controller.ready());
    await jest.advanceTimersByTimeAsync(3_000);
    const response = await pending;

    expect(response.error).toEqual({ redis: { status: 'down' } });
  });
});
