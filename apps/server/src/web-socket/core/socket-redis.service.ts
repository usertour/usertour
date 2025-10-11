import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis.service';
import { SocketClientData } from '@/common/types/content';
import { ClientCondition } from '@/common/types/sdk';

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
   * @param socketId - The socket ID
   * @returns The Redis key
   */
  private buildClientDataKey(socketId: string): string {
    return `client_data:${socketId}`;
  }

  /**
   * Build Redis key for client condition reports
   * @param socketId - The socket ID
   * @returns Redis key string
   */
  private buildClientConditionReportsKey(socketId: string): string {
    return `socket:reports:${socketId}`;
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
    clientData: Omit<SocketClientData, 'lastUpdated' | 'socketId'>,
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
    updates: Partial<SocketClientData>,
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
   * Atomically set multiple client conditions using Redis Hash
   * @param socketId - The socket ID
   * @param conditions - Array of client conditions to set
   * @param removeConditions - Array of condition IDs to remove
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise<boolean> - True if the update was successful
   */
  async setClientConditions(
    socketId: string,
    conditions: ClientCondition[],
    removeConditions: string[] = [],
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<boolean> {
    try {
      const reportsKey = this.buildClientConditionReportsKey(socketId);
      const client = this.redisService.getClient();

      if (!client) {
        this.logger.error('Redis client not available');
        return false;
      }

      // Use Redis Pipeline for atomic operations
      const pipeline = client.pipeline();

      // Add/update conditions
      for (const condition of conditions) {
        pipeline.hset(reportsKey, condition.conditionId, JSON.stringify(condition));
      }

      // Remove specified conditions
      if (removeConditions.length > 0) {
        pipeline.hdel(reportsKey, ...removeConditions);
      }

      pipeline.expire(reportsKey, ttlSeconds);

      await pipeline.exec();

      return true;
    } catch (error) {
      this.logger.error(`Failed to set client conditions for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Update a single client condition
   * @param socketId - The socket ID
   * @param condition - The client condition to update
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise<boolean> - True if the condition was updated successfully, false if condition doesn't exist
   */
  async updateClientCondition(
    socketId: string,
    condition: ClientCondition,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<boolean> {
    try {
      const reportsKey = this.buildClientConditionReportsKey(socketId);
      const client = this.redisService.getClient();

      if (!client) {
        this.logger.error('Redis client not available');
        return false;
      }

      // Check if condition exists
      const existing = await client.hget(reportsKey, condition.conditionId);
      if (!existing) {
        this.logger.warn(`Condition ${condition.conditionId} not found for socket ${socketId}`);
        return false;
      }

      // Update the condition
      await client.hset(reportsKey, condition.conditionId, JSON.stringify(condition));
      await client.expire(reportsKey, ttlSeconds);

      this.logger.debug(
        `Updated client condition: socket=${socketId}, condition=${condition.conditionId}, isActive=${condition.isActive}`,
      );
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
   * @returns Promise<number> - Number of conditions that were removed
   */
  async removeClientConditions(socketId: string, conditionIds: string[]): Promise<number> {
    try {
      const reportsKey = this.buildClientConditionReportsKey(socketId);
      const client = this.redisService.getClient();

      if (!client || conditionIds.length === 0) {
        return 0;
      }

      // Use HDEL to remove multiple conditions from Hash
      const result = await client.hdel(reportsKey, ...conditionIds);

      this.logger.debug(
        `Removed ${result} client conditions: socket=${socketId}, conditions=${conditionIds.join(',')}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to remove client conditions for socket ${socketId}:`, error);
      return 0;
    }
  }

  /**
   * Get all client conditions for a socket
   * @param socketId - The socket ID
   * @returns Promise<ClientCondition[]> - Array of client conditions
   */
  async getClientConditions(socketId: string): Promise<ClientCondition[]> {
    try {
      const reportsKey = this.buildClientConditionReportsKey(socketId);
      const client = this.redisService.getClient();

      if (!client) {
        return [];
      }

      const reports = await client.hgetall(reportsKey);
      return Object.values(reports).map((conditionData) => {
        // Parse JSON data
        return JSON.parse(conditionData) as ClientCondition;
      });
    } catch {
      // Return empty array on any error
      return [];
    }
  }

  /**
   * Cleanup socket data and condition reports from Redis
   * @param socketId - The socket ID
   * @returns Promise<boolean> - True if the data was cleaned up successfully
   */
  async cleanup(socketId: string): Promise<boolean> {
    try {
      const key = this.buildClientDataKey(socketId);
      const reportsKey = this.buildClientConditionReportsKey(socketId);
      const client = this.redisService.getClient();

      if (client) {
        // Remove both main data and condition reports
        await client.del(key);
        await client.del(reportsKey);
      }

      this.logger.debug(`Removed socket data for socket ${socketId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove socket data for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Atomically update client data and cleanup condition reports using Pipeline
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
      const reportsKey = this.buildClientConditionReportsKey(socketId);

      // Use Pipeline for atomic operations
      const pipeline = client.pipeline();

      // Update client data
      pipeline.setex(dataKey, ttlSeconds, JSON.stringify(mergedData));

      // Add/update conditions
      for (const condition of conditions) {
        pipeline.hset(reportsKey, condition.conditionId, JSON.stringify(condition));
      }

      // Remove condition reports if any
      if (conditionIdsToRemove.length > 0) {
        pipeline.hdel(reportsKey, ...conditionIdsToRemove);
      }

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
