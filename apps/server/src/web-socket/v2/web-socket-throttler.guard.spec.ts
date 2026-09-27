import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { WebSocketThrottlerGuard } from './web-socket-throttler.guard';

describe('WebSocketThrottlerGuard', () => {
  let guard: WebSocketThrottlerGuard;

  const createMockSocket = (id?: string, address?: string) => ({
    id,
    handshake: { address: address ?? '127.0.0.1' },
  });

  const createMockContext = (socket: unknown): ExecutionContext =>
    ({
      switchToWs: () => ({
        getClient: () => socket,
      }),
      getType: () => 'ws',
      getClass: () => ({ name: 'TestClass' }),
      getHandler: () => ({ name: 'testHandler' }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          setHeaders: false,
          throttlers: [{ name: 'test', ttl: 1000, limit: 10 }],
        }),
      ],
      providers: [WebSocketThrottlerGuard],
    }).compile();

    guard = module.get<WebSocketThrottlerGuard>(WebSocketThrottlerGuard);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });

  describe('a message over the limit', () => {
    it('is marked on the socket for the handler to answer, not thrown', async () => {
      // The testing module compiles without running lifecycle hooks; the
      // guard reads its throttler list in one.
      await (guard as unknown as { onModuleInit: () => Promise<void> }).onModuleInit();
      const socket = { id: 'over-limit', handshake: { address: '127.0.0.1' }, data: {} };
      const context = createMockContext(socket);
      for (let i = 0; i < 10; i++) {
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(WebSocketThrottlerGuard.consumeRefusal(socket as never)).toBe(false);
      }
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(WebSocketThrottlerGuard.consumeRefusal(socket as never)).toBe(true);
      // Consumed once: the next message starts clean.
      expect(WebSocketThrottlerGuard.consumeRefusal(socket as never)).toBe(false);
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
