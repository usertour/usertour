import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SDKAuthenticationError } from '@/common/errors';
import { SocketManagementService } from '@/web-socket/core/socket-management.service';

/**
 * WebSocket V2 Guard - simply checks that afterInit authentication passed
 */
@Injectable()
export class WebSocketV2Guard implements CanActivate {
  constructor(private readonly socketManagementService: SocketManagementService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    // Check if the client data exists in Redis
    const clientData = await this.socketManagementService.getClientData(client.id);
    if (!clientData?.environment) {
      throw new SDKAuthenticationError();
    }

    return true;
  }
}
