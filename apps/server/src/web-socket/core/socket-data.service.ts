import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis.service';
import { Environment } from '@/common/types/schema';
import { ClientCondition, SDKContentSession, ConditionWaitTimer } from '@/common/types/sdk';
import { ClientContext } from '@usertour/types';

/**
 * Socket socket data type for storage
 */
export interface SocketClientData {
  environment: Environment;
  externalUserId: string;
  externalCompanyId?: string;
  clientContext: ClientContext;
  clientConditions?: ClientCondition[];
  conditionWaitTimers?: ConditionWaitTimer[];
  flowSession?: SDKContentSession;
  checklistSession?: SDKContentSession;
  lastUpdated: number;
  socketId: string;
}

/**
 * Socket data storage service
 * Handles all data operations for socket socket management
 */
@Injectable()
export class SocketDataService {
  private readonly logger = new Logger(SocketDataService.name);
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
   * Build Redis key for user socket mapping
   * @param environmentId - The environment ID
   * @param externalUserId - The external user ID
   * @returns The Redis key
   */
  private buildUserSocketsKey(environmentId: string, externalUserId: string): string {
    return `user_sockets:${environmentId}:${externalUserId}`;
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

      // Update user socket mapping
      if (clientData.environment && clientData.externalUserId) {
        await this.addSocketToUserMapping(
          clientData.environment.id,
          clientData.externalUserId,
          socketId,
        );
      }

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
   * Remove socket data from Redis
   * @param socketId - The socket ID
   * @returns Promise<boolean> - True if the data was removed successfully
   */
  async removeClientData(socketId: string): Promise<boolean> {
    try {
      // Get the data first to extract user info for cleanup
      const clientData = await this.getClientData(socketId);

      const key = this.buildClientDataKey(socketId);
      const client = this.redisService.getClient();

      if (client) {
        await client.del(key);
      }

      // Remove from user socket mapping
      if (clientData?.environment && clientData?.externalUserId) {
        await this.removeSocketFromUserMapping(
          clientData.environment.id,
          clientData.externalUserId,
          socketId,
        );
      }

      this.logger.debug(`Removed socket data for socket ${socketId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove socket data for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Get all socket data for a specific user
   * @param environmentId - The environment ID
   * @param externalUserId - The external user ID
   * @returns Promise<ClientData[]> - Array of socket data for the user
   */
  async getUserClientData(
    environmentId: string,
    externalUserId: string,
  ): Promise<SocketClientData[]> {
    try {
      const socketIds = await this.getUserSocketIds(environmentId, externalUserId);
      const clientDataList: SocketClientData[] = [];

      for (const socketId of socketIds) {
        const clientData = await this.getClientData(socketId);
        if (clientData) {
          clientDataList.push(clientData);
        }
      }

      this.logger.debug(
        `Retrieved ${clientDataList.length} socket data entries for user ${externalUserId}`,
      );
      return clientDataList;
    } catch (error) {
      this.logger.error(`Failed to get user socket data for user ${externalUserId}:`, error);
      return [];
    }
  }

  /**
   * Get all socket IDs for a specific user
   * @param environmentId - The environment ID
   * @param externalUserId - The external user ID
   * @returns Promise<string[]> - Array of socket IDs
   */
  async getUserSocketIds(environmentId: string, externalUserId: string): Promise<string[]> {
    try {
      const key = this.buildUserSocketsKey(environmentId, externalUserId);
      const client = this.redisService.getClient();

      if (!client) {
        return [];
      }

      const socketIds = await client.smembers(key);
      return socketIds || [];
    } catch (error) {
      this.logger.error(`Failed to get user socket IDs for user ${externalUserId}:`, error);
      return [];
    }
  }

  /**
   * Add socket to user mapping
   * @param environmentId - The environment ID
   * @param externalUserId - The external user ID
   * @param socketId - The socket ID
   */
  private async addSocketToUserMapping(
    environmentId: string,
    externalUserId: string,
    socketId: string,
  ): Promise<void> {
    try {
      const key = this.buildUserSocketsKey(environmentId, externalUserId);
      const client = this.redisService.getClient();

      if (client) {
        await client.sadd(key, socketId);
        await client.expire(key, this.DEFAULT_TTL_SECONDS);
      }
    } catch (error) {
      this.logger.error(`Failed to add socket ${socketId} to user mapping:`, error);
    }
  }

  /**
   * Remove socket from user mapping
   * @param environmentId - The environment ID
   * @param externalUserId - The external user ID
   * @param socketId - The socket ID
   */
  private async removeSocketFromUserMapping(
    environmentId: string,
    externalUserId: string,
    socketId: string,
  ): Promise<void> {
    try {
      const key = this.buildUserSocketsKey(environmentId, externalUserId);
      const client = this.redisService.getClient();

      if (client) {
        await client.srem(key, socketId);

        // If no more sockets for this user, remove the key
        const remainingSockets = await client.scard(key);
        if (remainingSockets === 0) {
          await client.del(key);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to remove socket ${socketId} from user mapping:`, error);
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

  /**
   * Clean up all data for a specific user
   * @param environmentId - The environment ID
   * @param externalUserId - The external user ID
   * @returns Promise<number> - Number of sockets cleaned up
   */
  async cleanupUserData(environmentId: string, externalUserId: string): Promise<number> {
    try {
      const socketIds = await this.getUserSocketIds(environmentId, externalUserId);
      let cleanedCount = 0;

      for (const socketId of socketIds) {
        const success = await this.removeClientData(socketId);
        if (success) {
          cleanedCount++;
        }
      }

      this.logger.debug(`Cleaned up ${cleanedCount} sockets for user ${externalUserId}`);
      return cleanedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup user data for user ${externalUserId}:`, error);
      return 0;
    }
  }

  /**
   * Get statistics about stored data
   * @returns Promise<object> - Statistics about the stored data
   */
  async getDataStats(): Promise<{
    totalClientData: number;
    totalUserMappings: number;
  }> {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        return { totalClientData: 0, totalUserMappings: 0 };
      }

      const clientDataKeys = await client.keys('client_data:*');
      const userMappingKeys = await client.keys('user_sockets:*');

      return {
        totalClientData: clientDataKeys.length,
        totalUserMappings: userMappingKeys.length,
      };
    } catch (error) {
      this.logger.error('Failed to get data stats:', error);
      return { totalClientData: 0, totalUserMappings: 0 };
    }
  }
}
