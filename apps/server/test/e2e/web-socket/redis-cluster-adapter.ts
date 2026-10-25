import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { ServerOptions } from 'socket.io';

/**
 * Test-only socket.io adapter on Redis, so a spec can boot several
 * application instances that form one cluster, the way production runs
 * (main.ts installs RedisIoAdapter). Two differences keep it out of the
 * production class: the channel prefix (`key`) keeps the test cluster apart
 * from a development server on the same Redis, since pub/sub is not scoped
 * by database; and `dispose` ends the Redis clients, since jest reuses its
 * worker process across suites.
 */
export class RedisClusterTestAdapter extends IoAdapter {
  private readonly configService: ConfigService;
  private readonly key: string;
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private clients: Array<ReturnType<typeof createClient>> = [];

  constructor(app: INestApplication, key: string) {
    super(app);
    this.configService = app.get(ConfigService);
    this.key = key;
  }

  async connectToRedis(): Promise<void> {
    const protocol = this.configService.get('redis.tls') ? 'rediss' : 'redis';
    const url = `${protocol}://${this.configService.get('redis.host')}:${this.configService.get('redis.port')}`;
    const username = this.configService.get('redis.username');
    const password = this.configService.get('redis.password');

    const pubClient = createClient({
      url,
      database: this.configService.get<number>('redis.db') ?? 0,
      ...(username && { username }),
      ...(password && { password }),
    });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.clients = [pubClient, subClient];
    this.adapterConstructor = createAdapter(pubClient, subClient, { key: this.key });
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }

  /** Runs after the application closed its servers through the base `close(server)`. */
  async dispose(): Promise<void> {
    await super.dispose();
    const clients = this.clients;
    this.clients = [];
    await Promise.all(clients.map((client) => client.quit().catch(() => undefined)));
  }
}
