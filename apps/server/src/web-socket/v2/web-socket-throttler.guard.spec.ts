import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerOptions, ThrottlerStorageService } from '@nestjs/throttler';
import { WebSocketThrottlerGuard } from './web-socket-throttler.guard';

describe('WebSocketThrottlerGuard', () => {
  let module: TestingModule;
  let guard: WebSocketThrottlerGuard;

  // The gateway's own settings, as the environment would give them.
  const environment: Record<string, string> = {
    WS_THROTTLE_SHORT_TTL: '1000',
    WS_THROTTLE_SHORT_LIMIT: '10',
  };

  const compileGuard = async (settings: Record<string, string>): Promise<TestingModule> =>
    await Test.createTestingModule({
      providers: [
        WebSocketThrottlerGuard,
        ThrottlerStorageService,
        { provide: ConfigService, useValue: { get: (key: string) => settings[key] } },
      ],
    }).compile();

  // The testing module compiles without running lifecycle hooks; the guard
  // reads its throttler list in one.
  const throttlersOf = async (instance: WebSocketThrottlerGuard): Promise<ThrottlerOptions[]> => {
    await (instance as unknown as { onModuleInit: () => Promise<void> }).onModuleInit();
    return (instance as unknown as { throttlers: ThrottlerOptions[] }).throttlers;
  };

  const createMockSocket = (id?: string, address?: string) => ({
    id,
    handshake: { address: address ?? '127.0.0.1' },
  });

  const createMockContext = (socket: unknown, message: unknown = {}): ExecutionContext =>
    ({
      switchToWs: () => ({
        getClient: () => socket,
        getData: () => message,
      }),
      getType: () => 'ws',
      getClass: () => ({ name: 'TestClass' }),
      getHandler: () => ({ name: 'testHandler' }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    module = await compileGuard(environment);
    guard = module.get<WebSocketThrottlerGuard>(WebSocketThrottlerGuard);
  });

  // The storage arms one timer per hit for the length of the window (60 s
  // for the medium limit); closing the module clears them, or they keep the
  // test process alive for that long after the last test.
  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('runs under its own two limits, read from the environment, with defaults', async () => {
      const throttlers = await throttlersOf(guard);
      expect(throttlers.map(({ name, ttl, limit }) => ({ name, ttl, limit }))).toEqual([
        { name: 'short', ttl: 1000, limit: 10 },
        { name: 'medium', ttl: 60000, limit: 300 },
      ]);
    });

    it('falls back to the default for a setting that is not a positive number', async () => {
      const other = await compileGuard({
        WS_THROTTLE_SHORT_LIMIT: '0',
        WS_THROTTLE_MEDIUM_TTL: ' ',
        WS_THROTTLE_MEDIUM_LIMIT: 'many',
      });
      try {
        const throttlers = await throttlersOf(other.get(WebSocketThrottlerGuard));
        expect(throttlers.map(({ name, ttl, limit }) => ({ name, ttl, limit }))).toEqual([
          { name: 'short', ttl: 1000, limit: 30 },
          { name: 'medium', ttl: 60000, limit: 300 },
        ]);
      } finally {
        await other.close();
      }
    });
  });

  describe('a message over the limit', () => {
    it('is marked on the message for the handler to answer, not thrown', async () => {
      // The testing module compiles without running lifecycle hooks; the
      // guard reads its throttler list in one.
      await (guard as unknown as { onModuleInit: () => Promise<void> }).onModuleInit();
      const socket = { id: 'over-limit', handshake: { address: '127.0.0.1' } };
      for (let i = 0; i < 10; i++) {
        const allowed = { kind: 'x', payload: { i } };
        await expect(guard.canActivate(createMockContext(socket, allowed))).resolves.toBe(true);
        expect(WebSocketThrottlerGuard.consumeRefusal(allowed)).toBe(false);
      }
      const over = { kind: 'x', payload: { i: 10 } };
      const another = { kind: 'x', payload: { i: 11 } };
      await expect(guard.canActivate(createMockContext(socket, over))).resolves.toBe(true);
      // The mark belongs to that message, not to its socket or its neighbours.
      expect(WebSocketThrottlerGuard.consumeRefusal(another)).toBe(false);
      expect(WebSocketThrottlerGuard.consumeRefusal(over)).toBe(true);
      // Consumed once.
      expect(WebSocketThrottlerGuard.consumeRefusal(over)).toBe(false);
    });
  });

  describe('getTracker', () => {
    const callGetTracker = (g: WebSocketThrottlerGuard, socket: unknown) =>
      (g as unknown as { getTracker: (req: unknown) => Promise<string> }).getTracker(socket);

    it('should use socket.id as tracker when available', async () => {
      const socket = createMockSocket('test-socket-id');
      const tracker = await callGetTracker(guard, socket);
      expect(tracker).toBe('ws:test-socket-id');
    });

    it('should fallback to IP when socket.id is missing', async () => {
      const socket = createMockSocket(undefined, '192.168.1.100');
      const tracker = await callGetTracker(guard, socket);
      expect(tracker).toBe('ws:ip:192.168.1.100');
    });

    it('should use generic key when both id and IP are missing', async () => {
      const socket = { handshake: {} };
      const tracker = await callGetTracker(guard, socket);
      expect(tracker).toBe('ws:unknown');
    });
  });

  describe('getRequestResponse', () => {
    const callGetRequestResponse = (g: WebSocketThrottlerGuard, ctx: ExecutionContext) =>
      (
        g as unknown as {
          getRequestResponse: (c: ExecutionContext) => { req: unknown; res: unknown };
        }
      ).getRequestResponse(ctx);

    it('should extract socket from WebSocket context', () => {
      const socket = createMockSocket('socket-123');
      const context = createMockContext(socket);

      const { req, res } = callGetRequestResponse(guard, context);

      expect(req).toBe(socket);
      expect(res).toEqual({});
    });
  });
});
