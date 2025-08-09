import { Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  WebSocketGateway as WsGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketPerformanceInterceptor } from './web-socket.interceptor';
import { WebSocketV2Guard } from './web-socket-v2.guard';
import { SDKAuthenticationError } from '@/common/errors';
import {
  TrackEventRequest,
  UpsertCompanyRequest,
  UpsertCompanyResponse,
  UpsertUserRequest,
  UpsertUserResponse,
} from './web-socket.dto';
import { WebSocketService } from './web-socket.service';

@WsGateway({ namespace: '/v2' })
@UseGuards(WebSocketV2Guard)
@UseInterceptors(WebSocketPerformanceInterceptor)
export class WebSocketGatewayV2 {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGatewayV2.name);

  constructor(private readonly service: WebSocketService) {}

  // Connection-level authentication - runs during handshake
  async afterInit(server: Server): Promise<void> {
    this.server = server;

    server.use(async (socket: Socket, next) => {
      try {
        const auth = (socket.handshake?.auth as Record<string, unknown>) ?? {};
        const externalUserId = String(auth.externalUserId ?? '');
        const token = String(auth.token ?? '');

        if (!externalUserId || !token) {
          return next(new SDKAuthenticationError());
        }

        const environment = await this.service.fetchEnvironmentByToken(token);
        if (!environment) {
          return next(new SDKAuthenticationError());
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
    if (client.data.flowSessionId) {
      return true;
    }
    const externalUserId = client.data.externalUserId;
    const flowSession = await this.service.setFlowSession(
      client.data.environment,
      client.data.externalUserId,
      client.data.externalCompanyId,
    );
    client.data.flowSessionId = flowSession?.latestSession.id;
    this.server.to(`user:${externalUserId}`).emit('set-flow-session', flowSession);
    return true;
  }

  @SubscribeMessage('upsert-user')
  async upsertBizUsers(
    @MessageBody() body: Omit<UpsertUserRequest, 'token'>,
    @ConnectedSocket() client: Socket,
  ): Promise<UpsertUserResponse> {
    const environment = client.data.environment;
    this.logger.log(`Upserting user ${body.userId} in environment ${environment.id}`);

    return await this.service.upsertBizUsers(body, environment);
  }

  @SubscribeMessage('upsert-company')
  async upsertBizCompanies(
    @MessageBody() body: Omit<UpsertCompanyRequest, 'token'>,
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

  @SubscribeMessage('track-event')
  async trackEvent(
    @MessageBody() body: Omit<TrackEventRequest, 'token'>,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    const environment = client.data.environment;
    return Boolean(await this.service.trackEvent(body, environment));
  }
}
