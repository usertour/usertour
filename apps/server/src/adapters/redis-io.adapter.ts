import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const url = `redis://${process.env.Redis_HOST}:${process.env.Redis_PORT}`;
    const pubClient = createClient({ url, password: process.env.Redis_PASS });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const serverOptions = {
      ...options,
      cors: {
        origin: true,
        allowedHeaders: true,
        methods: true,
        credentials: true,
      },
    };

    const server = super.createIOServer(port, serverOptions);

    server.on('connection', (socket) => {
      console.log('New connection from origin:', socket.handshake.headers.origin);
      console.log('Request headers:', socket.handshake.headers);
    });

    server.adapter(this.adapterConstructor);
    return server;
  }
}
