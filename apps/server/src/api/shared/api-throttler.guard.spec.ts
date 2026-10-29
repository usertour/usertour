import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerOptions, ThrottlerStorageService } from '@nestjs/throttler';
import { PrismaService } from 'nestjs-prisma';
import { ApiThrottlerGuard } from './api-throttler.guard';

describe('ApiThrottlerGuard', () => {
  const compileGuard = async (settings: Record<string, string>): Promise<TestingModule> =>
    await Test.createTestingModule({
      providers: [
        ApiThrottlerGuard,
        ThrottlerStorageService,
        { provide: ConfigService, useValue: { get: (key: string) => settings[key] } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

  // The testing module compiles without running lifecycle hooks; the guard
  // reads its throttler list in one.
  const throttlersOf = async (
    module: TestingModule,
  ): Promise<Array<Pick<ThrottlerOptions, 'name' | 'ttl' | 'limit'>>> => {
    const guard = module.get(ApiThrottlerGuard);
    await (guard as unknown as { onModuleInit: () => Promise<void> }).onModuleInit();
    const throttlers = (guard as unknown as { throttlers: ThrottlerOptions[] }).throttlers;
    return throttlers.map(({ name, ttl, limit }) => ({ name, ttl, limit }));
  };

  it('runs under its own window and limit, read from the environment', async () => {
    const module = await compileGuard({ API_THROTTLE_TTL: '2000', API_THROTTLE_LIMIT: '5' });
    try {
      expect(await throttlersOf(module)).toEqual([{ name: 'api', ttl: 2000, limit: 5 }]);
    } finally {
      await module.close();
    }
  });

  it('falls back to the defaults when a setting is unset or not a positive number', async () => {
    for (const settings of [{}, { API_THROTTLE_TTL: '0', API_THROTTLE_LIMIT: ' ' }]) {
      const module = await compileGuard(settings);
      try {
        expect(await throttlersOf(module)).toEqual([{ name: 'api', ttl: 60_000, limit: 1000 }]);
      } finally {
        await module.close();
      }
    }
  });
});
