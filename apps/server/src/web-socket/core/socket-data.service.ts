import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis.service';
import { SocketData } from '@/common/types/content';
import { Socket } from 'socket.io';
import { getSocketId } from '@/utils/websocket-utils';

// ============================================================================
// Socket Data Service
// ============================================================================

/**
 * Socket data storage service
 * Handles all Redis data operations for SocketData management
 */
@Injectable()
export class SocketDataService {
  private readonly logger = new Logger(SocketDataService.name);
  private readonly DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  // ============================================================================
  // Private Helper Methods - Key Management
  // ============================================================================

  /**
   * Build Redis key for socket data
   * Uses hash tag to ensure cluster compatibility
   * @param socketId - The socket ID
   * @returns The Redis key
   */
  private key(socketId: string): string {
    return `{${socketId}}:client_data`;
  }

  // ============================================================================
  // Public API Methods - Data Operations
  // ============================================================================

  /**
   * Set socket data in Redis
   * @param socket - The socket object
   * @param socketData - The socket data to store (can be partial for updates)
   * @param exists - If true, only set if key already exists (for updates)
   * @returns Promise<boolean> - True if the data was set successfully
   */
  async set(
    socket: Socket,
    socketData: SocketData | Partial<SocketData>,
    exists = false,
  ): Promise<boolean> {
    const socketId = getSocketId(socket);
    try {
      const key = this.key(socketId);

      // Get existing data if exists=true
      const existingData = exists ? await this.get(socket) : null;
      if (exists && !existingData) {
        this.logger.warn(`No existing data found for socket ${socketId}, cannot update`);
        return false;
      }

      // Merge data and add metadata
      const finalData = {
        ...existingData,
        ...socketData,
        lastUpdated: Date.now(),
        socketId: socketId,
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
   * @param socket - The socket object
   * @returns Promise<SocketData | null> - The socket data or null if not found
   */
  async get(socket: Socket): Promise<SocketData | null> {
    const socketId = getSocketId(socket);
    try {
      const key = this.key(socketId);
      const value = await this.redisService.get(key);

      if (!value) {
        this.logger.debug(`No socket data found for socket ${socketId}`);
        return null;
      }

      const socketData = JSON.parse(value) as SocketData;
      this.logger.debug(`Retrieved socket data for socket ${socketId}`);
      return socketData;
    } catch (error) {
      this.logger.error(`Failed to get socket data for socket ${socketId}:`, error);
      return null;
    }
  }

  /**
   * Delete socket data from Redis
   * Simplified as clientConditions are now stored within SocketData
   * @param socket - The socket object
   * @returns Promise<boolean> - True if the data was deleted successfully
   */
  async delete(socket: Socket): Promise<boolean> {
    const socketId = getSocketId(socket);
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
