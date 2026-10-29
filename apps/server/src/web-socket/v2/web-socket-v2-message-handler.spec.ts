import { Logger } from '@nestjs/common';
import { ClientMessageKind } from '@usertour/types';
import { Server, Socket } from 'socket.io';
import { DistributedLockService } from '@/modules/delivery/services/distributed-lock.service';
import { ProjectCacheService } from '@/modules/common/services/project-cache.service';
import { WebSocketV2MessageHandler } from './web-socket-v2-message-handler';
import { WebSocketV2Service } from './web-socket-v2.service';

describe('WebSocketV2MessageHandler', () => {
  let error: jest.SpyInstance;
  let log: jest.SpyInstance;

  beforeEach(() => {
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    error.mockRestore();
    log.mockRestore();
  });

  it('logs a failed message without its payload, which is the end user data', async () => {
    const service = {
      getSocketData: async () => ({ bizUserId: 'biz-user-1' }),
      upsertBizUsers: async () => {
        throw new Error('database unavailable');
      },
    } as unknown as WebSocketV2Service;
    const locks = {
      withRetryLock: (_key: string, work: () => Promise<unknown>) => work(),
    } as unknown as DistributedLockService;
    const cache = {
      runInScope: (work: () => Promise<unknown>) => work(),
    } as unknown as ProjectCacheService;
    const handler = new WebSocketV2MessageHandler(service, locks, cache);
    const socket = { id: 'socket-1', data: {} } as unknown as Socket;

    const answer = await handler.handle({} as Server, socket, ClientMessageKind.UPSERT_USER, {
      externalUserId: 'person@example.com',
      attributes: { name: 'Person Name', email: 'person@example.com' },
      token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwZXJzb24ifQ.signature',
    });

    expect(answer).toBe(false);
    expect(error).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(error.mock.calls[0]);
    expect(logged).toContain('UpsertUser');
    expect(logged).toContain('database unavailable');
    expect(logged).toContain('socket-1');
    expect(logged).not.toContain('person@example.com');
    expect(logged).not.toContain('Person Name');
    expect(logged).not.toContain('eyJ');
  });
});
