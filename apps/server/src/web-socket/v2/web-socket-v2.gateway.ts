import { Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  WebSocketGateway as WsGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketPerformanceInterceptor } from '../web-socket.interceptor';
import { WebSocketV2Guard } from './web-socket-v2.guard';
import { SDKAuthenticationError } from '@/common/errors';
import {
  TrackEventRequest,
  UpsertCompanyRequest,
  UpsertCompanyResponse,
  UpsertUserRequest,
  UpsertUserResponse,
} from '../web-socket.dto';
import { WebSocketV2Service } from './web-socket-v2.service';
import { StartFlowRequest } from './web-socket-v2.dto';

@WsGateway({ namespace: '/v2' })
@UseGuards(WebSocketV2Guard)
@UseInterceptors(WebSocketPerformanceInterceptor)
export class WebSocketV2Gateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketV2Gateway.name);

  constructor(private readonly service: WebSocketV2Service) {}

  // Connection-level authentication - runs during handshake
  async afterInit(server: Server): Promise<void> {
    this.server = server;

    server.use(async (socket: Socket, next) => {
      try {
        const auth = (socket.handshake?.auth as Record<string, unknown>) ?? {};
        const externalUserId = String(auth.externalUserId ?? '');
        const token = String(auth.token ?? '');
        const clientContext = auth.clientContext as Record<string, any>;

        if (!externalUserId || !token) {
          return next(new SDKAuthenticationError());
        }

        const environment = await this.service.fetchEnvironmentByToken(token);
        if (!environment) {
          return next(new SDKAuthenticationError());
        }

        if (clientContext) {
          await this.service.updateUserClientContext(environment, externalUserId, clientContext);
        }

        // Store validated data in socket
        socket.data.externalUserId = externalUserId;
        socket.data.envId = environment.id;
        socket.data.environment = environment;

        // Join user room for targeted messaging
        await socket.join(`user:${externalUserId}`);

        this.logger.log(`Socket ${socket.id} authenticated for user ${externalUserId}`);
        return next();
      } catch (error: unknown) {
        this.logger.error(`Auth error: ${(error as Error)?.message ?? 'Unknown error'}`);
        return next(new SDKAuthenticationError());
      }
    });
  }

  @SubscribeMessage('begin-batch')
  async beginBatch(): Promise<boolean> {
    return true;
  }

  @SubscribeMessage('end-batch')
  async endBatch(@ConnectedSocket() client: Socket): Promise<boolean> {
    return await this.setFlowSession(client);
  }

  /**
   * Set flow session for the client, creating if not exists
   * @param client - WebSocket client connection
   * @returns true if session exists or was created successfully
   */
  private async setFlowSession(
    client: Socket,
    contentId?: string,
    stepIndex?: number,
  ): Promise<boolean> {
    // Return early if flow session already exists
    if (client.data.flowSessionId) {
      return true;
    }

    const externalUserId = client.data.externalUserId;

    // Create new flow session
    const flowSession = await this.service.setFlowSession(
      client.data.environment,
      client.data.externalUserId,
      client.data.externalCompanyId,
      contentId,
      stepIndex,
    );

    // Cache the session ID for future requests
    client.data.flowSessionId = flowSession.id;

    // Notify the client about the new flow session
    this.server.to(`user:${externalUserId}`).emit('set-flow-session', flowSession);

    return true;
  }

  @SubscribeMessage('upsert-user')
  async upsertBizUsers(
    @MessageBody() body: UpsertUserRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<UpsertUserResponse> {
    const environment = client.data.environment;
    this.logger.log(`Upserting user ${body.userId} in environment ${environment.id}`);

    return await this.service.upsertBizUsers(body, environment);
  }

  @SubscribeMessage('upsert-company')
  async upsertBizCompanies(
    @MessageBody() body: UpsertCompanyRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<UpsertCompanyResponse> {
    const environment = client.data.environment;

    const result = await this.service.upsertBizCompanies(body, environment);

    // Store company info in socket data for future use
    if (result) {
      client.data.externalCompanyId = body.companyId;
      client.data.companyInfo = result;
    }

    return result;
  }

  @SubscribeMessage('start-flow')
  async startFlow(
    @MessageBody() body: StartFlowRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.setFlowSession(client, body.contentId, body.stepIndex);
  }

  @SubscribeMessage('track-event')
  async trackEvent(
    @MessageBody() body: TrackEventRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    const environment = client.data.environment;
    return Boolean(await this.service.trackEvent(body, environment));
  }
}
