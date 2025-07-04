import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class WebSocketPushService {
  private readonly logger = new Logger(WebSocketPushService.name);
  private server: Server;

  /**
   * Set the server instance (called by the gateway)
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Send content change notification to all users in an environment
   */
  async notifyContentChanged(environmentId: string): Promise<void> {
    try {
      if (!this.server) {
        this.logger.warn('Server instance not available');
        return;
      }

      this.server.to(`environment:${environmentId}`).emit('content-changed', {
        timestamp: new Date(),
      });
      this.logger.log(`Content change notification sent to environment ${environmentId}`);
    } catch (error) {
      this.logger.error(`Failed to send content change notification: ${error.message}`);
    }
  }
}
