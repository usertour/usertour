import { once } from 'node:events';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type LockReleaseFn = () => Promise<boolean>;

/** Max time to wait for initial connection (ioredis retries by default) */
const INIT_CONNECT_TIMEOUT_MS = 60000;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  private client: Redis | null = null;

  constructor(private configService: ConfigService) {}

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not available');
    }
    return this.client;
  }

  async onModuleInit() {
    this.logger.log('Initializing Redis client');
    this.client = new Redis({
      host: this.configService.getOrThrow('redis.host'),
      port: this.configService.getOrThrow('redis.port'),
      username: this.configService.get('redis.username'),
      password: this.configService.get('redis.password'),
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    if (this.client.status === 'ready') {
      this.logger.log('Redis connection established');
      return;
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Redis connection timed out after ${INIT_CONNECT_TIMEOUT_MS}ms`));
      }, INIT_CONNECT_TIMEOUT_MS);
    });

    try {
      await Promise.race([once(this.client, 'ready'), timeoutPromise]);
      this.logger.log('Redis connection established');
    } catch (error) {
      this.client?.disconnect();
      this.client = null;
      this.logger.error(`Failed to establish Redis connection: ${error}`);
      throw error;
    }
  }

  async setex(key: string, seconds: number, value: string) {
    if (!this.client) {
      throw new Error('Redis client not available');
    }
    await this.client.setex(key, seconds, value);
  }

  async get(key: string) {
    if (!this.client) {
      throw new Error('Redis client not available');
    }
    return this.client.get(key);
  }

  async acquireLock(key: string): Promise<LockReleaseFn | null> {
    if (!this.client) {
      throw new Error('Redis client not available');
    }

    try {
      const token = `${process.pid}-${Date.now()}`;
      const success = await this.client.set(key, token, 'EX', 10, 'NX');

      if (success) {
        return async () => await this.releaseLock(key, token);
      }
      return null;
    } catch (err) {
      this.logger.warn('Error acquiring lock:', err);
      return null;
    }
  }

  async releaseLock(key: string, token: string) {
    if (!this.client) {
      throw new Error('Redis client not available');
    }

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const success = await this.client.eval(script, 1, key, token);

      if (success === 1) {
        return true;
      }
      return false;
    } catch (err) {
      this.logger.error('Error releasing lock:', err);
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
