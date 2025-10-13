import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type LockReleaseFn = () => Promise<boolean>;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly INIT_TIMEOUT = 10000; // 10 seconds timeout

  private client: Redis | null = null;

  constructor(private configService: ConfigService) {
    this.logger.log('Initializing Redis client');
    this.client = new Redis({
      host: configService.getOrThrow('redis.host'),
      port: configService.getOrThrow('redis.port'),
      username: configService.get('redis.username'),
      password: configService.get('redis.password'),
    });
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not available');
    }
    return this.client;
  }

  async onModuleInit() {
    if (!this.client) {
      this.logger.log('Skip redis initialization in desktop mode');
      return;
    }

    const initPromise = this.client.ping();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(`Redis connection timed out after ${this.INIT_TIMEOUT}ms`);
      }, this.INIT_TIMEOUT);
    });

    try {
      await Promise.race([initPromise, timeoutPromise]);
      this.logger.log('Redis connection established');
    } catch (error) {
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
      throw false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
