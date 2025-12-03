import { Test, TestingModule } from '@nestjs/testing';
import { DistributedLockService } from './distributed-lock.service';
import { RedisService } from '@/shared/redis.service';

describe('DistributedLockService', () => {
  let service: DistributedLockService;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockRedisClient = {
      set: jest.fn(),
      get: jest.fn(),
      eval: jest.fn(),
      exists: jest.fn(),
      del: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedLockService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<DistributedLockService>(DistributedLockService);
    redisService = module.get(RedisService);
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully', async () => {
      const key = 'test-key';
      const timeoutMs = 10000;
      const mockClient = redisService.getClient();
      (mockClient.set as jest.Mock).mockResolvedValue('OK');

      const result = await service.acquireLock(key, timeoutMs);

      expect(result).toBe(true);
      expect(mockClient.set).toHaveBeenCalledWith(
        `lock:${key}`,
        expect.any(String),
        'PX',
        timeoutMs,
        'NX',
      );
    });

    it('should return false when lock already exists', async () => {
      const key = 'test-key';
      const timeoutMs = 10000;
      const mockClient = redisService.getClient();
      (mockClient.set as jest.Mock).mockResolvedValue(null);

      const result = await service.acquireLock(key, timeoutMs);

      expect(result).toBe(false);
    });

    it('should use custom lock value when provided', async () => {
      const key = 'test-key';
      const timeoutMs = 10000;
      const lockValue = 'custom-lock-value';
      const mockClient = redisService.getClient();
      (mockClient.set as jest.Mock).mockResolvedValue('OK');

      const result = await service.acquireLock(key, timeoutMs, lockValue);

      expect(result).toBe(true);
      expect(mockClient.set).toHaveBeenCalledWith(`lock:${key}`, lockValue, 'PX', timeoutMs, 'NX');
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      const timeoutMs = 10000;
      const mockClient = redisService.getClient();
      (mockClient.set as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await service.acquireLock(key, timeoutMs);

      expect(result).toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('should release lock successfully when value matches', async () => {
      const key = 'test-key';
      const lockValue = 'lock-value-123';
      const mockClient = redisService.getClient();
      (mockClient.eval as jest.Mock).mockResolvedValue(1);
      redisService.get.mockResolvedValue(lockValue);

      const result = await service.releaseLock(key, lockValue);

      expect(result).toBe(true);
      expect(mockClient.eval).toHaveBeenCalled();
    });

    it('should return false when lock value does not match', async () => {
      const key = 'test-key';
      const lockValue = 'lock-value-123';
      const mockClient = redisService.getClient();
      (mockClient.eval as jest.Mock).mockResolvedValue(0);
      redisService.get.mockResolvedValue(lockValue);

      const result = await service.releaseLock(key, 'wrong-value');

      expect(result).toBe(false);
    });

    it('should return false when lock does not exist', async () => {
      const key = 'test-key';
      const lockValue = 'lock-value-123';

      redisService.get.mockResolvedValue(null);

      const result = await service.releaseLock(key, lockValue);

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      const lockValue = 'lock-value-123';

      redisService.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.releaseLock(key, lockValue);

      expect(result).toBe(false);
    });
  });

  describe('isLocked', () => {
    it('should return true when lock exists', async () => {
      const key = 'test-key';
      const mockClient = redisService.getClient();
      (mockClient.exists as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await service.isLocked(key);

      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith(`lock:${key}`);
    });

    it('should return false when lock does not exist', async () => {
      const key = 'test-key';
      const mockClient = redisService.getClient();
      (mockClient.exists as jest.Mock) = jest.fn().mockResolvedValue(0);

      const result = await service.isLocked(key);

      expect(result).toBe(false);
      expect(mockClient.exists).toHaveBeenCalledWith(`lock:${key}`);
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      const mockClient = redisService.getClient();
      (mockClient.exists as jest.Mock) = jest.fn().mockRejectedValue(new Error('Redis error'));

      const result = await service.isLocked(key);

      expect(result).toBe(false);
    });
  });

  describe('getLockValue', () => {
    it('should return lock value when lock exists', async () => {
      const key = 'test-key';
      const lockValue = 'lock-value-123';
      const mockClient = redisService.getClient();
      (mockClient.get as jest.Mock).mockResolvedValue(lockValue);

      const result = await service.getLockValue(key);

      expect(result).toBe(lockValue);
      expect(mockClient.get).toHaveBeenCalledWith(`lock:${key}`);
    });

    it('should return null when lock does not exist', async () => {
      const key = 'test-key';
      const mockClient = redisService.getClient();
      (mockClient.get as jest.Mock).mockResolvedValue(null);

      const result = await service.getLockValue(key);

      expect(result).toBeNull();
      expect(mockClient.get).toHaveBeenCalledWith(`lock:${key}`);
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      const mockClient = redisService.getClient();
      (mockClient.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await service.getLockValue(key);

      expect(result).toBeNull();
    });
  });

  describe('acquireLockWithRetry', () => {
    it('should acquire lock on first attempt', async () => {
      const key = 'test-key';
      const maxRetries = 3;
      const retryDelayMs = 100;
      const mockClient = redisService.getClient();
      (mockClient.set as jest.Mock).mockResolvedValue('OK');

      const result = await service.acquireLockWithRetry(key, maxRetries, retryDelayMs);

      expect(result).toBe(true);
      expect(mockClient.set).toHaveBeenCalledTimes(1);
    });

    it('should retry when lock acquisition fails', async () => {
      const key = 'test-key';
      const maxRetries = 3;
      const retryDelayMs = 100;
      const mockClient = redisService.getClient();
      (mockClient.set as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('OK');

      const result = await service.acquireLockWithRetry(key, maxRetries, retryDelayMs);

      expect(result).toBe(true);
      expect(mockClient.set).toHaveBeenCalledTimes(3);
    });

    it('should return false after max retries', async () => {
      const key = 'test-key';
      const maxRetries = 3;
      const retryDelayMs = 100;
      const mockClient = redisService.getClient();
      (mockClient.set as jest.Mock).mockResolvedValue(null);

      const result = await service.acquireLockWithRetry(key, maxRetries, retryDelayMs);

      expect(result).toBe(false);
      expect(mockClient.set).toHaveBeenCalledTimes(maxRetries);
    });
  });
});
