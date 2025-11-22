import { Test, TestingModule } from '@nestjs/testing';
import { SocketDataService } from './socket-data.service';
import { RedisService } from '@/shared/redis.service';
import { SocketData, Environment } from '@/common/types';
import { ClientContext } from '@usertour/types';

describe('SocketDataService', () => {
  let service: SocketDataService;
  let redisService: jest.Mocked<RedisService>;

  const createMockEnvironment = (): Environment => ({
    id: 'env-1',
    projectId: 'project-1',
    name: 'Test Environment',
    token: 'test-token',
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createMockClientContext = (): ClientContext => ({
    pageUrl: 'https://example.com/test',
    viewportWidth: 1920,
    viewportHeight: 1080,
  });

  const createMockSocketData = (): SocketData => ({
    environment: createMockEnvironment(),
    externalUserId: 'user-1',
    externalCompanyId: 'company-1',
    clientContext: createMockClientContext(),
    clientConditions: [],
    waitTimers: [],
  });

  beforeEach(async () => {
    const mockRedisService = {
      get: jest.fn(),
      setex: jest.fn(),
      getClient: jest.fn().mockReturnValue({
        del: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketDataService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<SocketDataService>(SocketDataService);
    redisService = module.get(RedisService);
  });

  describe('set', () => {
    it('should set socket data successfully', async () => {
      const socketId = 'socket-1';
      const socketData = createMockSocketData();

      redisService.setex.mockResolvedValue(undefined);

      const result = await service.set(socketId, socketData);

      expect(result).toBe(true);
      expect(redisService.setex).toHaveBeenCalled();
    });

    it('should merge with existing data when exists=true', async () => {
      const socketId = 'socket-1';
      const existingData = createMockSocketData();
      const partialData: Partial<SocketData> = {
        clientConditions: [{ conditionId: 'condition-1', type: 'page' } as any],
      };

      redisService.get.mockResolvedValue(JSON.stringify(existingData));
      redisService.setex.mockResolvedValue(undefined);

      const result = await service.set(socketId, partialData, true);

      expect(result).toBe(true);
      expect(redisService.get).toHaveBeenCalled();
      expect(redisService.setex).toHaveBeenCalled();
    });

    it('should return false when exists=true but no existing data', async () => {
      const socketId = 'socket-1';
      const partialData: Partial<SocketData> = {
        clientConditions: [{ conditionId: 'condition-1', type: 'page' } as any],
      };

      redisService.get.mockResolvedValue(null);

      const result = await service.set(socketId, partialData, true);

      expect(result).toBe(false);
      expect(redisService.setex).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const socketId = 'socket-1';
      const socketData = createMockSocketData();

      redisService.setex.mockRejectedValue(new Error('Redis error'));

      const result = await service.set(socketId, socketData);

      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should get socket data successfully', async () => {
      const socketId = 'socket-1';
      const socketData = createMockSocketData();
      const storedData = {
        ...socketData,
        lastUpdated: Date.now(),
        socketId,
      };

      redisService.get.mockResolvedValue(JSON.stringify(storedData));

      const result = await service.get(socketId);

      expect(result).not.toBeNull();
      // JSON.parse converts Date objects to strings, so we need to compare accordingly
      expect(result?.environment).toEqual(
        expect.objectContaining({
          ...socketData.environment,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      expect(new Date(result!.environment.createdAt).getTime()).toBe(
        socketData.environment.createdAt.getTime(),
      );
      expect(new Date(result!.environment.updatedAt).getTime()).toBe(
        socketData.environment.updatedAt.getTime(),
      );
      expect(result?.externalUserId).toBe(socketData.externalUserId);
      expect(redisService.get).toHaveBeenCalled();
    });

    it('should return null when data does not exist', async () => {
      const socketId = 'socket-1';

      redisService.get.mockResolvedValue(null);

      const result = await service.get(socketId);

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      const socketId = 'socket-1';

      redisService.get.mockResolvedValue('invalid json');

      const result = await service.get(socketId);

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      const socketId = 'socket-1';

      redisService.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get(socketId);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete socket data successfully', async () => {
      const socketId = 'socket-1';
      const mockClient = redisService.getClient();
      (mockClient.del as jest.Mock).mockResolvedValue(1);

      const result = await service.delete(socketId);

      expect(result).toBe(true);
      expect(mockClient.del).toHaveBeenCalled();
    });

    it('should return true when deletion succeeds (even if key did not exist)', async () => {
      const socketId = 'socket-1';
      const mockClient = redisService.getClient();
      (mockClient.del as jest.Mock).mockResolvedValue(0);

      const result = await service.delete(socketId);

      // Redis DEL returns 0 if key doesn't exist, but service still returns true
      expect(result).toBe(true);
    });

    it('should handle Redis errors gracefully', async () => {
      const socketId = 'socket-1';
      const mockClient = redisService.getClient();
      (mockClient.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await service.delete(socketId);

      expect(result).toBe(false);
    });
  });
});
