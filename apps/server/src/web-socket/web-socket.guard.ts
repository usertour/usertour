import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
  private readonly logger = new Logger(WebSocketAuthGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const data = context.switchToWs().getData();

    // Extract token from message body
    const token = data?.token;
    if (!token) {
      throw new WsException('Missing token');
    }

    // Find environment by token
    const environment = await this.prisma.environment.findFirst({
      where: { token },
    });

    if (!environment) {
      throw new WsException('Invalid token');
    }

    // Attach environment to socket for later use
    client.data.environment = environment;

    return true;
  }
}
