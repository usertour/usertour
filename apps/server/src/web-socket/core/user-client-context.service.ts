import { Injectable, Logger } from '@nestjs/common';
import { ClientContext } from '@usertour/types';
import { Environment } from '@/common/types/schema';
import { RedisService } from '@/shared/redis.service';

export type UserClientContext = {
  externalUserId: string;
  externalCompanyId: string;
  clientContext: ClientContext;
};

@Injectable()
export class UserClientContextService {
  private readonly logger = new Logger(UserClientContextService.name);
  private readonly DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  /**
   * Set user client context in cache
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param externalCompanyId - The external company ID
   * @param clientContext - The client context to store
   * @param ttlSeconds - Optional TTL in seconds (defaults to 24 hours)
   * @returns Promise<boolean> - True if the context was set successfully
   */
  async setUserClientContext(
    environment: Environment,
    externalUserId: string,
    externalCompanyId: string,
    clientContext: ClientContext,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<boolean> {
    try {
      const key = this.buildContextKey(environment.id, externalUserId);
      const contextData: UserClientContext = {
        externalUserId,
        externalCompanyId,
        clientContext,
      };

      await this.redisService.setex(key, ttlSeconds, JSON.stringify(contextData));

      this.logger.debug(
        `User client context set for user ${externalUserId} in environment ${environment.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to set user client context for user ${externalUserId}:`, error);
      return false;
    }
  }

  /**
   * Get user client context from cache
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @returns Promise<UserClientContext | null> - The user client context or null if not found
   */
  async getUserClientContext(
    environment: Environment,
    externalUserId: string,
  ): Promise<UserClientContext | null> {
    try {
      const key = this.buildContextKey(environment.id, externalUserId);
      const value = await this.redisService.get(key);

      if (!value) {
        this.logger.debug(
          `No client context found for user ${externalUserId} in environment ${environment.id}`,
        );
        return null;
      }

      const contextData = JSON.parse(value) as UserClientContext;
      this.logger.debug(
        `Retrieved client context for user ${externalUserId} in environment ${environment.id}`,
      );

      return contextData;
    } catch (error) {
      this.logger.error(`Failed to get user client context for user ${externalUserId}:`, error);
      return null;
    }
  }

  /**
   * Update only the client context portion of the stored data
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param clientContext - The new client context
   * @returns Promise<boolean> - True if the context was updated successfully
   */
  async updateClientContext(
    environment: Environment,
    externalUserId: string,
    clientContext: ClientContext,
  ): Promise<boolean> {
    const existingContext = await this.getUserClientContext(environment, externalUserId);

    if (!existingContext) {
      this.logger.warn(`No existing context found for user ${externalUserId}, cannot update`);
      return false;
    }

    return await this.setUserClientContext(
      environment,
      externalUserId,
      existingContext.externalCompanyId,
      clientContext,
    );
  }

  /**
   * Remove user client context from cache
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @returns Promise<boolean> - True if the context was removed successfully
   */
  async removeUserClientContext(
    environment: Environment,
    externalUserId: string,
  ): Promise<boolean> {
    try {
      const key = this.buildContextKey(environment.id, externalUserId);
      const client = this.redisService.getClient();

      if (client) {
        await client.del(key);
      }

      this.logger.debug(
        `Removed client context for user ${externalUserId} in environment ${environment.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove user client context for user ${externalUserId}:`, error);
      return false;
    }
  }

  /**
   * Check if user client context exists
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @returns Promise<boolean> - True if the context exists
   */
  async hasUserClientContext(environment: Environment, externalUserId: string): Promise<boolean> {
    const context = await this.getUserClientContext(environment, externalUserId);
    return context !== null;
  }

  /**
   * Build the Redis key for user client context
   * @param environmentId - The environment ID
   * @param externalUserId - The external user ID
   * @returns The Redis key
   */
  private buildContextKey(environmentId: string, externalUserId: string): string {
    return `user_context:${environmentId}:${externalUserId}`;
  }
}
