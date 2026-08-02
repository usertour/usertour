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

    // Find environment by token. `deleted: false` is part of the credential
    // check, not a display filter: deleting an environment must retire its SDK
    // token. Without it a deleted environment kept accepting SDK traffic — no
    // content to serve (its ContentOnEnvironment rows are gone) but still
    // creating users and recording events, into an environment that no longer
    // appears in any list. The API-token path has always checked this
    // (api-token-auth.service); the two websocket entries had not.
    const environment = await this.prisma.environment.findFirst({
      where: { token, deleted: false },
    });

    if (!environment) {
      throw new WsException('Invalid token');
    }

    // Attach environment to socket for later use
    client.data.environment = environment;

    return true;
  }
}
