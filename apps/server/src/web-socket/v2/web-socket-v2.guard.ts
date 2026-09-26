import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SocketAuthData } from '@usertour/types';
import { SDKAuthenticationError } from '@/modules/common/errors/errors';
import { SocketData } from '@/modules/delivery/types/socket-data.type';
import { SocketDataService } from '../core/socket-data.service';
import { WebSocketV2Service } from './web-socket-v2.service';

/**
 * WebSocket V2 Guard - checks that the connection still has its socket data,
 * rebuilding it when the store lost it.
 */
@Injectable()
export class WebSocketV2Guard implements CanActivate {
  private readonly logger = new Logger(WebSocketV2Guard.name);

  constructor(
    private readonly socketDataService: SocketDataService,
    private readonly service: WebSocketV2Service,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket: Socket = context.switchToWs().getClient();

    const socketData =
      (await this.socketDataService.get(socket)) ?? (await this.rebuildSocketData(socket));
    if (!socketData?.environment) {
      socket.disconnect(true);
      throw new SDKAuthenticationError();
    }

    return true;
  }

  /**
   * Socket data can vanish under a live connection — a Redis restart or
   * failover, or the 24 h TTL on a tab that stayed connected but wrote
   * nothing. Rebuild it from the handshake this socket was accepted with,
   * exactly as the handshake did, instead of kicking the socket: Socket.IO
   * does not reconnect after a server-initiated disconnect (ADR 0018 §3).
   * Only a rebuild that fails disconnects; the SDK then reconnects and the
   * handshake gives the verdict.
   */
  private async rebuildSocketData(socket: Socket): Promise<SocketData | null> {
    try {
      const auth = (socket.handshake?.auth ?? {}) as unknown as SocketAuthData;
      const socketData = await this.service.initializeSocketData(auth);
      if (!socketData) {
        return null;
      }
      const stored = await this.socketDataService.set(socket, socketData);
      if (!stored) {
        return null;
      }
      this.logger.warn(`Rebuilt missing socket data for socket ${socket.id}`);
      return socketData;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to rebuild socket data for socket ${socket.id}: ${(error as Error)?.message ?? 'Unknown error'}`,
      );
      return null;
    }
  }
}
