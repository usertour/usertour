import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SDKAuthenticationError } from '@/common/errors';
import { SocketDataService } from '../core/socket-data.service';

/**
 * WebSocket V2 Guard - simply checks that afterInit authentication passed
 */
@Injectable()
export class WebSocketV2Guard implements CanActivate {
  constructor(private readonly socketDataService: SocketDataService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket: Socket = context.switchToWs().getClient();

    // Check if the socket data exists in Redis
    const socketData = await this.socketDataService.get(socket);
    if (!socketData?.environment) {
      socket.disconnect(true);
      throw new SDKAuthenticationError();
    }

    return true;
  }
}
