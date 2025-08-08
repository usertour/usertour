import { Logger, UseInterceptors } from '@nestjs/common';
import {
  WebSocketGateway as WsGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketPerformanceInterceptor } from './web-socket.interceptor';
import { TrackEventRequest, UpsertCompanyRequest } from './web-socket.dto';
import { UpsertUserRequest } from './web-socket.dto';
import { WebSocketService } from './web-socket.service';

@WsGateway({ namespace: '/v2' })
@UseInterceptors(WebSocketPerformanceInterceptor)
export class WebSocketGatewayV2 {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGatewayV2.name);

  constructor(private readonly service: WebSocketService) {}

  // Connection middleware: validate token and prepare rooms on handshake
  async afterInit(server: Server): Promise<void> {
    this.server = server;

    server.use(async (socket: Socket, next) => {
      try {
        const auth = (socket.handshake?.auth as Record<string, unknown>) ?? {};
        const externalUserId = String(auth.externalUserId ?? '');
        const token = String(auth.token ?? '');

        if (!externalUserId || !token) {
          return next(new Error('Missing auth params'));
        }

        const environment = await this.service.fetchEnvironmentByToken(token);
        if (!environment) {
          return next(new Error('Invalid environment'));
        }

        const envId = environment.id;
        socket.data.externalUserId = externalUserId;
        socket.data.envId = envId;
        socket.data.environment = environment;

        await socket.join(`user:${externalUserId}`);

        return next();
      } catch (error: unknown) {
        this.logger.error(`Auth error: ${(error as Error)?.message ?? 'Unknown error'}`);
        return next(new Error('Auth error'));
      }
    });
  }

  @SubscribeMessage('begin-batch')
  async beginBatch(): Promise<boolean> {
    return true;
  }

  @SubscribeMessage('end-batch')
  async endBatch(): Promise<boolean> {
    return true;
  }

  @SubscribeMessage('upsert-user')
  async upsertBizUsers(
    @MessageBody() body: UpsertUserRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    const environment = client.data.environment;
    this.logger.log(
      `Upserting user ${body.userId} in environment ${environment.id} with token ${body.token}`,
    );
    return Boolean(await this.service.upsertBizUsers(body, environment));
  }

  @SubscribeMessage('upsert-company')
  async upsertBizCompanies(
    @MessageBody() body: UpsertCompanyRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    const environment = client.data.environment;
    const result = await this.service.upsertBizCompanies(body, environment);

    // Store company info in socket data for future use
    if (result) {
      client.data.externalCompanyId = body.companyId;
      client.data.companyInfo = result;
    }

    return Boolean(result);
  }

  @SubscribeMessage('track-event')
  async sendEvent(
    @MessageBody() body: TrackEventRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    const environment = client.data.environment;
    return Boolean(await this.service.trackEvent(body, environment));
  }
}
