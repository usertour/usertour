import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SDKAuthenticationError } from '@/modules/common/errors/errors';
import { SocketDataService } from '../core/socket-data.service';

/**
 * WebSocket V2 Guard - checks that the connection still has its socket data.
 *
 * Socket data can vanish under a live connection — a Redis restart or
 * failover, or the 24 h TTL on a tab that stayed connected but wrote nothing
 * — and a failed user write deletes it on purpose. In every case the socket
 * is disconnected: the SDK reconnects by itself after a server-initiated
 * disconnect (ADR 0018 §1) and its handshake carries the state of now.
 * Rebuilding here from `socket.handshake.auth` would restore the state of
 * the moment the connection was made (ADR 0018 §3).
 */
@Injectable()
export class WebSocketV2Guard implements CanActivate {
  private readonly logger = new Logger(WebSocketV2Guard.name);

  constructor(private readonly socketDataService: SocketDataService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket: Socket = context.switchToWs().getClient();

    const socketData = await this.socketDataService.get(socket);
    if (!socketData?.environment) {
      this.logger.warn(`Socket ${socket.id} has no socket data; disconnecting so it reconnects`);
      socket.disconnect(true);
      throw new SDKAuthenticationError();
    }

    return true;
  }
}
