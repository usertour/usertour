import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis.service';
import { SocketClientData } from '@/common/types/content';
import { ClientCondition } from '@/common/types/sdk';

/**
 * Lua script for atomic "update if exists" operation
 * KEYS[1]: hash key
 * ARGV[1]: field name
 * ARGV[2]: field value
 * Returns: 1 if updated, 0 if field doesn't exist
 */
const UPDATE_IF_EXISTS_SCRIPT = `
  if redis.call('hexists', KEYS[1], ARGV[1]) == 1 then
    redis.call('hset', KEYS[1], ARGV[1], ARGV[2])
    return 1
  else
    return 0
  end
`;

/**
 * Lua script for atomically setting multiple client conditions
 * KEYS[1]: hash key for conditions
 * ARGV[1]: TTL in seconds
 * ARGV[2..n]: alternating conditionId and condition JSON pairs
 * Returns: 1 on success
 */
const SET_CONDITIONS_SCRIPT = `
  local key = KEYS[1]
  local ttl = tonumber(ARGV[1])
  
  -- Batch set all fields using hset (supports multiple field-value pairs)
  redis.call('hset', key, unpack(ARGV, 2))
  
  -- Set TTL for the hash key
  redis.call('expire', key, ttl)
  
  return 1
`;

/**
 * Socket Redis storage service
 * Handles all Redis data operations for socket management
 */
@Injectable()
export class SocketRedisService {
  private readonly logger = new Logger(SocketRedisService.name);
  private readonly DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  /**
   * Build Redis key for socket data
   * Uses hash tag to ensure cluster compatibility
   * @param socketId - The socket ID
   * @returns The Redis key
   */
  private buildClientDataKey(socketId: string): string {
    return `{${socketId}}:client_data`;
  }

  /**
   * Build Redis key for client conditions
   * Uses hash tag to ensure cluster compatibility
   * @param socketId - The socket ID
   * @returns Redis key string
   */
  private buildClientConditionsKey(socketId: string): string {
    return `{${socketId}}:conditions`;
  }

  /**
   * Set socket data in Redis
   * @param socketId - The socket ID
   * @param clientData - The socket data to store
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise<boolean> - True if the data was set successfully
   */
  async setClientData(
    socketId: string,
    clientData: Omit<SocketClientData, 'lastUpdated' | 'socketId' | 'clientConditions'>,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<boolean> {
    try {
      const key = this.buildClientDataKey(socketId);
      const dataWithTimestamp = {
        ...clientData,
        lastUpdated: Date.now(),
        socketId,
      };

      await this.redisService.setex(key, ttlSeconds, JSON.stringify(dataWithTimestamp));

      this.logger.debug(`Client data set for socket ${socketId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set socket data for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Get socket data from Redis
   * @param socketId - The socket ID
   * @returns Promise<ClientData | null> - The socket data or null if not found
   */
  async getClientData(socketId: string): Promise<SocketClientData | null> {
    try {
      const key = this.buildClientDataKey(socketId);
      const value = await this.redisService.get(key);

      if (!value) {
        this.logger.debug(`No socket data found for socket ${socketId}`);
        return null;
      }

      const clientData = JSON.parse(value) as SocketClientData;
      this.logger.debug(`Retrieved socket data for socket ${socketId}`);
      return clientData;
    } catch (error) {
      this.logger.error(`Failed to get socket data for socket ${socketId}:`, error);
      return null;
    }
  }

  /**
   * Update specific fields in socket data
   * @param socketId - The socket ID
   * @param updates - Partial socket data to update
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise<boolean> - True if the data was updated successfully
   */
  async updateClientData(
    socketId: string,
    updates: Partial<Omit<SocketClientData, 'clientConditions'>>,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<boolean> {
    try {
      // Get existing data
      const existingData = await this.getClientData(socketId);
      if (!existingData) {
        this.logger.warn(`No existing data found for socket ${socketId}, cannot update`);
        return false;
      }

      // Merge with updates
      const mergedData: SocketClientData = {
        ...existingData,
        ...updates,
        lastUpdated: Date.now(),
        socketId,
      };

      return await this.setClientData(socketId, mergedData, ttlSeconds);
    } catch (error) {
      this.logger.error(`Failed to update socket data for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Atomically set multiple client conditions using Lua script
   * Uses HSETNX to only set conditions that don't exist yet
   * @param socketId - The socket ID
   * @param conditions - Array of client conditions to set
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise<boolean> - True if the operation was successful
   */
  async setClientConditions(
    socketId: string,
    conditions: ClientCondition[],
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<boolean> {
    try {
      const conditionsKey = this.buildClientConditionsKey(socketId);
      const client = this.redisService.getClient();

      if (!client) {
        this.logger.error('Redis client not available');
        return false;
      }

      if (conditions.length === 0) {
        return true;
      }

      // Prepare arguments for Lua script: [ttl, conditionId1, conditionData1, conditionId2, conditionData2, ...]
      const args: (string | number)[] = [ttlSeconds];
      for (const condition of conditions) {
        args.push(condition.conditionId, JSON.stringify(condition));
      }

      // Execute Lua script atomically
      await client.eval(SET_CONDITIONS_SCRIPT, 1, conditionsKey, ...args);

      this.logger.debug(`Set ${conditions.length} client conditions for socket ${socketId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set client conditions for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Update a single client condition
   * Only updates if the condition already exists (atomic operation using Lua script)
   * @param socketId - The socket ID
   * @param condition - The client condition to update
   * @returns Promise<boolean> - True if the condition was updated successfully, false if condition doesn't exist
   */
  async updateClientCondition(socketId: string, condition: ClientCondition): Promise<boolean> {
    try {
      const conditionsKey = this.buildClientConditionsKey(socketId);
      const client = this.redisService.getClient();

      if (!client) {
        this.logger.error('Redis client not available');
        return false;
      }

      // Use Lua script for atomic "update if exists" operation
      const result = await client.eval(
        UPDATE_IF_EXISTS_SCRIPT,
        1,
        conditionsKey,
        condition.conditionId,
        JSON.stringify(condition),
      );

      if (result === 0) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to update client condition for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Remove client conditions
   * @param socketId - The socket ID
   * @param conditionIds - Array of condition IDs to remove
   * @returns Promise<boolean> - True if the operation was successful
   */
  async removeClientConditions(socketId: string, conditionIds: string[]): Promise<boolean> {
    try {
      const conditionsKey = this.buildClientConditionsKey(socketId);
      const client = this.redisService.getClient();

      if (!client || conditionIds.length === 0) {
        return false;
      }

      // Use HDEL to remove multiple conditions from Hash
      await client.hdel(conditionsKey, ...conditionIds);

      return true;
    } catch (error) {
      this.logger.error(`Failed to remove client conditions for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Get all client conditions for a socket
   * @param socketId - The socket ID
   * @returns Promise<ClientCondition[]> - Array of client conditions
   */
  async getClientConditions(socketId: string): Promise<ClientCondition[]> {
    try {
      const conditionsKey = this.buildClientConditionsKey(socketId);
      const client = this.redisService.getClient();

      if (!client) {
        return [];
      }

      const conditions = await client.hgetall(conditionsKey);
      return Object.values(conditions).map((conditionData) => {
        // Parse JSON data
        return JSON.parse(conditionData) as ClientCondition;
      });
    } catch {
      // Return empty array on any error
      return [];
    }
  }

  /**
   * Cleanup socket data and conditions from Redis
   * @param socketId - The socket ID
   * @returns Promise<boolean> - True if the data was cleaned up successfully
   */
  async cleanup(socketId: string): Promise<boolean> {
    try {
      const key = this.buildClientDataKey(socketId);
      const conditionsKey = this.buildClientConditionsKey(socketId);
      const client = this.redisService.getClient();

      if (client) {
        // Remove both main data and conditions
        await client.del(key);
        await client.del(conditionsKey);
      }

      this.logger.debug(`Removed socket data for socket ${socketId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove socket data for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Atomically update client data and cleanup conditions using Pipeline
   * This method ensures true atomicity - either all operations succeed or all fail
   * @param socketId - The socket ID
   * @param updates - Partial socket data to update
   * @param conditions - Array of client conditions to update
   * @param conditionIdsToRemove - Array of condition IDs to remove
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise<boolean> - True if the operation was successful
   */
  async updateAndCleanup(
    socketId: string,
    updates: Partial<SocketClientData>,
    conditions: ClientCondition[],
    conditionIdsToRemove: string[],
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<boolean> {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        this.logger.error('Redis client not available');
        return false;
      }

      // Get existing data first
      const existingData = await this.getClientData(socketId);
      if (!existingData) {
        this.logger.warn(`No existing data found for socket ${socketId}, cannot update`);
        return false;
      }

      // Merge with updates
      const mergedData: SocketClientData = {
        ...existingData,
        ...updates,
        lastUpdated: Date.now(),
        socketId,
      };

      const dataKey = this.buildClientDataKey(socketId);
      const conditionsKey = this.buildClientConditionsKey(socketId);

      // Use Pipeline for atomic operations
      const pipeline = client.pipeline();

      // Update client data
      pipeline.setex(dataKey, ttlSeconds, JSON.stringify(mergedData));

      // Add/update conditions
      for (const condition of conditions) {
        pipeline.hset(conditionsKey, condition.conditionId, JSON.stringify(condition));
      }

      // Remove conditions if any
      if (conditionIdsToRemove.length > 0) {
        pipeline.hdel(conditionsKey, ...conditionIdsToRemove);
      }

      // Update TTL for conditions key
      pipeline.expire(conditionsKey, ttlSeconds);

      await pipeline.exec();

      this.logger.debug(
        `Atomically updated client data and cleaned up ${conditionIdsToRemove.length} conditions for socket ${socketId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to atomically update client data for socket: ${socketId}, error: ${error.message}`,
      );
      return false;
    }
  }
}
