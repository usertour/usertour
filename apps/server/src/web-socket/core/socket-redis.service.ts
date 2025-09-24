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
   * Atomically update a single client condition report using Redis Hash
   * @param socketId - The socket ID
   * @param conditionId - The condition ID to update
   * @param isActive - The new active state
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise<boolean> - True if the update was successful
   */
  async updateClientConditionReport(
    socketId: string,
    conditionId: string,
    isActive: boolean,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<boolean> {
    try {
      const reportsKey = this.buildClientConditionReportsKey(socketId);
      const client = this.redisService.getClient();

      if (!client) {
        this.logger.error('Redis client not available');
        return false;
      }

      // Use Redis Hash to atomically update a single condition
      await client.hset(reportsKey, conditionId, isActive.toString());
      await client.expire(reportsKey, ttlSeconds);

      this.logger.debug(
        `Updated condition report: socket=${socketId}, condition=${conditionId}, isActive=${isActive}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to update client condition report for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Remove client condition reports
   * @param socketId - The socket ID
   * @param conditionIds - Array of condition IDs to remove
   * @returns Promise<number> - Number of conditions that were removed
   */
  async removeClientConditionReports(socketId: string, conditionIds: string[]): Promise<number> {
    try {
      const reportsKey = this.buildClientConditionReportsKey(socketId);
      const client = this.redisService.getClient();

      if (!client || conditionIds.length === 0) {
        return 0;
      }

      // Use HDEL to remove multiple conditions from Hash
      const result = await client.hdel(reportsKey, ...conditionIds);

      this.logger.debug(
        `Removed ${result} condition reports: socket=${socketId}, conditions=${conditionIds.join(',')}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to remove client condition reports for socket ${socketId}:`, error);
      return 0;
    }
  }

  /**
   * Get all client condition reports for a socket
   * @param socketId - The socket ID
   * @returns Promise<ClientCondition[]> - Array of client condition reports
   */
  async getClientConditionReports(socketId: string): Promise<ClientCondition[]> {
    try {
      const reportsKey = this.buildClientConditionReportsKey(socketId);
      const client = this.redisService.getClient();

      if (!client) {
        return [];
      }

      const reports = await client.hgetall(reportsKey);
      return Object.entries(reports).map(([conditionId, isActive]) => ({
        conditionId,
        isActive: isActive === 'true',
      }));
    } catch (error) {
      this.logger.error(`Failed to get client condition reports for socket ${socketId}:`, error);
      return [];
    }
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
   * Remove socket data from Redis
   * @param socketId - The socket ID
   * @returns Promise<boolean> - True if the data was removed successfully
   */
  async removeClientData(socketId: string): Promise<boolean> {
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
   * Check if socket data exists
   * @param socketId - The socket ID
   * @returns Promise<boolean> - True if the data exists
   */
  async hasClientData(socketId: string): Promise<boolean> {
    const data = await this.getClientData(socketId);
    return data !== null;
  }
}
