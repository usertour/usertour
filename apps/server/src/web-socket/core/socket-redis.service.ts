import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis.service';
import { SocketClientData } from '@/common/types/content';

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
   * Now simplified as message queue ensures ordered execution
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
   * Cleanup socket data from Redis
   * Simplified as clientConditions are now stored within SocketClientData
   * @param socketId - The socket ID
   * @returns Promise<boolean> - True if the data was cleaned up successfully
   */
  async cleanup(socketId: string): Promise<boolean> {
    try {
      const key = this.buildClientDataKey(socketId);
      const client = this.redisService.getClient();

      // Remove socket data
      await client.del(key);

      this.logger.debug(`Removed socket data for socket ${socketId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove socket data for socket ${socketId}:`, error);
      return false;
    }
  }
}
