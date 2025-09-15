import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SDKAuthenticationError } from '@/common/errors';
import { SocketDataService } from '@/web-socket/core/socket-data.service';

/**
 * WebSocket V2 Guard - simply checks that afterInit authentication passed
 */
@Injectable()
export class WebSocketV2Guard implements CanActivate {
  constructor(private readonly socketDataService: SocketDataService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    // Check if the client data exists in Redis
    const clientData = await this.socketDataService.getClientData(client.id);
    if (!clientData?.environment) {
      throw new SDKAuthenticationError();
    }

    return true;
  }
}
