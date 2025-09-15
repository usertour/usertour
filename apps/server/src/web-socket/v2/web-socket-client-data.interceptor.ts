import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { SocketDataService } from '../core/socket-data.service';

/**
 * Interceptor to automatically inject socketClientData into WebSocket handlers
 * This interceptor fetches the client data and makes it available to the handler
 */
@Injectable()
export class WebSocketClientDataInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WebSocketClientDataInterceptor.name);

  constructor(private readonly socketDataService: SocketDataService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const client: Socket = context.switchToWs().getClient();

    try {
      // Always fetch fresh data from Redis to ensure data consistency across multiple instances
      // This is essential for multi-instance deployments where load balancing may route
      // requests to different instances
      const socketClientData = await this.socketDataService.getClientData(client.id);
      client.data.socketClientData = socketClientData;
      this.logger.debug(
        `Socket client data fetched from Redis and attached for socket ${client.id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to fetch socket client data for socket ${client.id}:`, error);
      client.data.socketClientData = null;
    }

    return next.handle();
  }
}
