import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/postgres-adapter';
import pg from 'pg';
import { ServerOptions } from 'socket.io';

export class PostgresIoAdapter extends IoAdapter {
  private readonly configService: ConfigService;
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToPostgres(): Promise<void> {
    const pool = new pg.Pool({
      user: process.env.POSTGRES_USER,
      host: process.env.DB_HOST,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: Number(process.env.DB_PORT),
      // ssl: true,
    });
    pool.query(`
      CREATE TABLE IF NOT EXISTS socket_io_attachments (
          id          bigserial UNIQUE,
          created_at  timestamptz DEFAULT NOW(),
          payload     bytea
      );
    `);
    pool.on('error', (err) => {
      console.error('Postgres error', err);
    });
    this.adapterConstructor = createAdapter(pool);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
