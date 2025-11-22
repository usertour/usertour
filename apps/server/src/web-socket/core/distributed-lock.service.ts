import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis.service';

// ============================================================================
// Distributed Lock Service
// ============================================================================

/**
 * Distributed lock service using Redis
 * Provides atomic locking capabilities for preventing concurrent operations
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private readonly redisService: RedisService) {}

  // ============================================================================
  // Private Helper Methods - Key Management
  // ============================================================================

  /**
   * Build the Redis key for a lock
   * @param key - The original key
   * @returns The Redis key with prefix
   */
  private buildLockKey(key: string): string {
    return `lock:${key}`;
  }

  /**
   * Utility method to create a delay
   * @param ms - Delay in milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Public API Methods - Basic Lock Operations
  // ============================================================================

  /**
   * Acquire a distributed lock
   * @param key - The lock key (should be unique for the resource)
   * @param timeoutMs - Lock timeout in milliseconds (default: 10000ms)
   * @param lockValue - Optional custom lock value for identification
   * @returns Promise<boolean> - True if lock was acquired successfully
   */
  async acquireLock(key: string, timeoutMs = 10000, lockValue?: string): Promise<boolean> {
    const lockKey = this.buildLockKey(key);
    const value = lockValue || `${Date.now()}-${Math.random()}`;

    try {
      const client = this.redisService.getClient();

      // Try to acquire lock with expiration using SET with NX and PX options
      const result = await client.set(lockKey, value, 'PX', timeoutMs, 'NX');

      if (result === 'OK') {
        this.logger.debug(`Acquired lock: ${key}`);
        return true;
      }

      this.logger.debug(`Failed to acquire lock (already locked): ${key}`);
      return false;
    } catch (error) {
      this.logger.error(`Error acquiring lock for ${key}:`, error);
      return false;
    }
  }

  /**
   * Release a distributed lock
   * @param key - The lock key
   * @param lockValue - Optional lock value to verify ownership
   * @returns Promise<boolean> - True if lock was released successfully
   */
  async releaseLock(key: string, lockValue?: string): Promise<boolean> {
    const lockKey = this.buildLockKey(key);

    try {
      const client = this.redisService.getClient();

      // If lockValue is provided, use Lua script to ensure we only release our own lock
      if (lockValue) {
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const result = await client.eval(luaScript, 1, lockKey, lockValue);
        const released = (result as number) > 0;
        this.logger.debug(`Released lock (with verification): ${key}, success: ${released}`);
        return released;
      }

      // Simple delete without ownership verification
      const result = await client.del(lockKey);
      const released = result > 0;
      this.logger.debug(`Released lock: ${key}, success: ${released}`);
      return released;
    } catch (error) {
      this.logger.error(`Error releasing lock for ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a lock exists
   * @param key - The lock key
   * @returns Promise<boolean> - True if lock exists
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = this.buildLockKey(key);

    try {
      const client = this.redisService.getClient();

      const result = await client.exists(lockKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking lock for ${key}:`, error);
      return false;
    }
  }

  /**
   * Get the current lock value
   * @param key - The lock key
   * @returns Promise<string | null> - The lock value or null if not locked
   */
  async getLockValue(key: string): Promise<string | null> {
    const lockKey = this.buildLockKey(key);

    try {
      const client = this.redisService.getClient();

      const result = await client.get(lockKey);
      return result ?? null;
    } catch (error) {
      this.logger.error(`Error getting lock value for ${key}:`, error);
      return null;
    }
  }

  // ============================================================================
  // Public API Methods - Advanced Lock Operations
  // ============================================================================

  /**
   * Try to acquire a lock with retry mechanism
   * @param key - The lock key
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param retryDelayMs - Delay between retries in milliseconds (default: 1000ms)
   * @param timeoutMs - Lock timeout in milliseconds (default: 10000ms)
   * @returns Promise<boolean> - True if lock was acquired successfully
   */
  async acquireLockWithRetry(
    key: string,
    maxRetries = 3,
    retryDelayMs = 1000,
    timeoutMs = 10000,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const acquired = await this.acquireLock(key, timeoutMs);
      if (acquired) {
        return true;
      }

      if (attempt < maxRetries) {
        this.logger.debug(
          `Lock acquisition attempt ${attempt} failed for ${key}, retrying in ${retryDelayMs}ms`,
        );
        await this.delay(retryDelayMs);
      }
    }

    this.logger.warn(`Failed to acquire lock for ${key} after ${maxRetries} attempts`);
    return false;
  }

  /**
   * Execute a function with a distributed lock
   * @param key - The lock key
   * @param fn - The function to execute while holding the lock
   * @param timeoutMs - Lock timeout in milliseconds (default: 10000ms)
   * @returns Promise<T | null> - The result of the function execution, or null if lock could not be acquired
   */
  async withLock<T>(key: string, fn: () => Promise<T>, timeoutMs = 10000): Promise<T | null> {
    // Check if already locked
    if (await this.isLocked(key)) {
      this.logger.debug(`Resource ${key} is already locked, skipping operation`);
      return null;
    }

    // Try to acquire lock
    const lockValue = `${Date.now()}-${Math.random()}`;
    const lockAcquired = await this.acquireLock(key, timeoutMs, lockValue);
    if (!lockAcquired) {
      this.logger.debug(`Failed to acquire lock for ${key}, skipping operation`);
      return null;
    }

    try {
      // Execute the function while holding the lock
      return await fn();
    } finally {
      // Always release the lock
      await this.releaseLock(key, lockValue);
    }
  }

  /**
   * Execute a function with a distributed lock and retry mechanism
   * @param key - The lock key
   * @param fn - The function to execute while holding the lock
   * @param maxRetries - Maximum number of retry attempts (default: 5)
   * @param retryDelayMs - Delay between retries in milliseconds (default: 1000ms)
   * @param timeoutMs - Lock timeout in milliseconds (default: 10000ms)
   * @returns Promise<T | null> - The result of the function execution, or null if lock could not be acquired
   */
  async withRetryLock<T>(
    key: string,
    fn: () => Promise<T>,
    maxRetries = 5,
    retryDelayMs = 1000,
    timeoutMs = 10000,
  ): Promise<T | null> {
    // Try to acquire lock with retry mechanism
    const lockAcquired = await this.acquireLockWithRetry(key, maxRetries, retryDelayMs, timeoutMs);

    if (!lockAcquired) {
      this.logger.warn(`Failed to acquire lock for ${key} after ${maxRetries} attempts`);
      return null;
    }

    try {
      // Execute the function while holding the lock
      return await fn();
    } finally {
      // Always release the lock
      await this.releaseLock(key);
    }
  }
}
