import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly configService: ConfigService;
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(app: any) {
    super(app);
    this.configService = app.get(ConfigService);
  }

  async connectToRedis(): Promise<void> {
    const url = `redis://${this.configService.get('redis.host')}:${this.configService.get('redis.port')}`;
    const pubClient = createClient({ url, password: this.configService.get('redis.password') });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const serverOptions = {
      ...options,
      // transports: ['websocket'],
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
