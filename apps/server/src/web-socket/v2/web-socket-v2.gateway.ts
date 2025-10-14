import { Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  WebSocketGateway as WsGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketPerformanceInterceptor } from '../web-socket.interceptor';
import { WebSocketClientDataInterceptor } from '../web-socket-client-data.interceptor';
import { WebSocketV2Guard } from './web-socket-v2.guard';
import { SDKAuthenticationError, ServiceUnavailableError } from '@/common/errors';
import { WebSocketV2Service } from './web-socket-v2.service';
import { ClientMessageDto } from './web-socket-v2.dto';
import { SocketRedisService } from '@/web-socket/core/socket-redis.service';
import { SocketClientData } from '@/common/types/content';
import { ClientContext } from '@usertour/types';
import { buildExternalUserRoomId } from '../../utils/websocket-utils';
import { ClientCondition } from '@/common/types/sdk';
import { WebSocketV2MessageHandler } from './web-socket-v2-message-handler';
import { SocketMessageQueueService } from '../core/socket-message-queue.service';

@WsGateway({ namespace: '/v2' })
@UseGuards(WebSocketV2Guard)
@UseInterceptors(WebSocketPerformanceInterceptor, WebSocketClientDataInterceptor)
export class WebSocketV2Gateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketV2Gateway.name);

  constructor(
    private readonly service: WebSocketV2Service,
    private readonly socketRedisService: SocketRedisService,
    private readonly messageHandler: WebSocketV2MessageHandler,
    private readonly queueService: SocketMessageQueueService,
  ) {}

  // Connection-level authentication - runs during handshake
  async afterInit(server: Server): Promise<void> {
    this.server = server;

    server.use(async (socket: Socket, next) => {
      try {
        const auth = (socket.handshake?.auth as Record<string, unknown>) ?? {};
        const externalUserId = String(auth.externalUserId ?? '');
        const externalCompanyId = String(auth.externalCompanyId ?? '');
        const clientContext = auth.clientContext as ClientContext;
        const clientConditions = (auth.clientConditions as ClientCondition[]) ?? [];
        const token = String(auth.token ?? '');
        const flowSessionId = String(auth.flowSessionId ?? '');
        const checklistSessionId = String(auth.checklistSessionId ?? '');

        if (!externalUserId || !token) {
          return next(new SDKAuthenticationError());
        }

        const environment = await this.service.fetchEnvironmentByToken(token);
        if (!environment) {
          return next(new SDKAuthenticationError());
        }

        // Store validated data in socket
        const clientData: SocketClientData = {
          environment,
          externalUserId,
          clientContext,
          externalCompanyId,
          waitTimers: [],
          lastUpdated: Date.now(),
          socketId: socket.id,
          clientConditions,
        };
        if (flowSessionId) {
          const flowSession = await this.service.initializeSessionById(clientData, flowSessionId);
          if (flowSession) {
            clientData.flowSession = flowSession;
          }
        }
        if (checklistSessionId) {
          const checklistSession = await this.service.initializeSessionById(
            clientData,
            checklistSessionId,
          );
          if (checklistSession) {
            clientData.checklistSession = checklistSession;
          }
        }
        const isSetClientData = await this.socketRedisService.setClientData(socket.id, clientData);
        if (!isSetClientData) {
          this.logger.error(`Failed to persist client data for socket ${socket.id}`);
          return next(new ServiceUnavailableError());
        }

        const room = buildExternalUserRoomId(environment.id, externalUserId);

        // Check room size limit before joining
        const socketsInRoom = await this.server.in(room).fetchSockets();
        if (socketsInRoom.length >= 100) {
          this.logger.warn(
            `Room ${room} has reached maximum capacity (100 sockets). Rejecting connection for socket ${socket.id}`,
          );
          return next(new ServiceUnavailableError('Room capacity exceeded'));
        }

        // Join user room for targeted messaging
        await socket.join(room);

        this.logger.log(`Socket ${socket.id} authenticated for user ${externalUserId}`);
        return next();
      } catch (error: unknown) {
        this.logger.error(`Auth error: ${(error as Error)?.message ?? 'Unknown error'}`);
        return next(new SDKAuthenticationError());
      }
    });
  }

  // Cleanup when a socket disconnects for any reason
  async handleDisconnect(socket: Socket): Promise<void> {
    try {
      // Clear the message queue to prevent memory leaks
      this.queueService.clearQueue(socket.id);

      // Clean up Redis data
      await this.socketRedisService.cleanup(socket.id);

      this.logger.debug(`Cleaned up queue and client data for disconnected socket ${socket.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup for disconnected socket ${socket.id}: ` +
          `${(error as Error)?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * Unified client message entry point
   * All client messages go through this single handler
   * Messages are routed based on 'kind' field and executed in order
   */
  @SubscribeMessage('client-message')
  async handleClientMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() message: ClientMessageDto,
  ): Promise<boolean> {
    const { kind, payload, requestId } = message;

    this.logger.debug(
      `Received client message: kind=${kind}, socketId=${socket.id}, requestId=${requestId || 'N/A'}`,
    );

    // All messages are executed in order to maintain Socket.IO's ordering semantics
    return await this.queueService.executeInOrder(socket.id, async () => {
      // Fetch fresh data to avoid stale data issues
      const clientData = await this.service.getClientDataResolved(socket.id);

      if (!clientData) {
        this.logger.warn(`No client data found for socket ${socket.id}, message kind: ${kind}`);
        return false;
      }

      return await this.messageHandler.handle(this.server, socket, clientData, kind, payload);
    });
  }
}
