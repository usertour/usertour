import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SDKAuthenticationError } from '@/common/errors';
import { ContentOrchestratorService } from '@/web-socket/core/content-orchestrator.service';

/**
 * WebSocket V2 Guard - simply checks that afterInit authentication passed
 */
@Injectable()
export class WebSocketV2Guard implements CanActivate {
  constructor(private readonly contentOrchestratorService: ContentOrchestratorService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket: Socket = context.switchToWs().getClient();

    // Check if the socket data exists in Redis
    const clientData = await this.contentOrchestratorService.getClientDataResolved(socket.id);
    if (!clientData?.environment) {
      socket.disconnect(true);
      throw new SDKAuthenticationError();
    }

    return true;
  }
}
