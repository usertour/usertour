import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SDKAuthenticationError } from '@/common/errors';

/**
 * WebSocket V2 Guard - simply checks that afterInit authentication passed
 */
@Injectable()
export class WebSocketV2Guard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    // afterInit already did all the heavy lifting
    // We just check if the environment exists
    if (!client.data.environment) {
      throw new SDKAuthenticationError();
    }

    return true;
  }
}
