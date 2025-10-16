import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis.service';
import { SocketClientData } from '@/common/types/content';

/**
 * Socket client data storage service
 * Handles all Redis data operations for SocketClientData management
 */
@Injectable()
export class SocketClientDataService {
  private readonly logger = new Logger(SocketClientDataService.name);
  private readonly DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  /**
   * Build Redis key for socket data
   * Uses hash tag to ensure cluster compatibility
   * @param socketId - The socket ID
   * @returns The Redis key
   */
  private key(socketId: string): string {
    return `{${socketId}}:client_data`;
  }

  /**
   * Set socket data in Redis
   * @param socketId - The socket ID
   * @param clientData - The socket data to store (can be partial for updates)
   * @param exists - If true, only set if key already exists (for updates)
   * @returns Promise<boolean> - True if the data was set successfully
   */
  async set(
    socketId: string,
    clientData: SocketClientData | Partial<SocketClientData>,
    exists = false,
  ): Promise<boolean> {
    try {
      const key = this.key(socketId);

      // Get existing data if exists=true
      const existingData = exists ? await this.get(socketId) : null;
      if (exists && !existingData) {
        this.logger.warn(`No existing data found for socket ${socketId}, cannot update`);
        return false;
      }

      // Merge data and add metadata
      const finalData = {
        ...existingData,
        ...clientData,
        lastUpdated: Date.now(),
        socketId,
      };

      await this.redisService.setex(key, this.DEFAULT_TTL_SECONDS, JSON.stringify(finalData));
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
  async get(socketId: string): Promise<SocketClientData | null> {
    try {
      const key = this.key(socketId);
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
   * Delete socket data from Redis
   * Simplified as clientConditions are now stored within SocketClientData
   * @param socketId - The socket ID
   * @returns Promise<boolean> - True if the data was deleted successfully
   */
  async delete(socketId: string): Promise<boolean> {
    try {
      const key = this.key(socketId);
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
