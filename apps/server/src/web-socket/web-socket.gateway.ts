import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway as WsGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './web-socket.service';
import { WebSocketAuthGuard } from './web-socket.guard';
import { WebSocketEnvironment } from './web-socket.decorator';
import { WebSocketPerformanceInterceptor } from './web-socket.interceptor';
import {
  ConfigRequest,
  ConfigResponse,
  ListContentsRequest,
  UpsertUserRequest,
  UpsertCompanyRequest,
  CreateSessionRequest,
  TrackEventRequest,
  IdentityRequest,
  UpsertUserResponse,
  UpsertCompanyResponse,
  ContentResponse,
  ListThemesRequest,
  ContentSession,
  CreateSessionResponse,
  GetProjectSettingsRequest,
  GetProjectSettingsResponse,
} from './web-socket.dto';
import { Environment, Theme } from '@prisma/client';

@WsGateway()
@UseGuards(WebSocketAuthGuard)
@UseInterceptors(WebSocketPerformanceInterceptor)
export class WebSocketGateway {
  private readonly logger = new Logger(WebSocketGateway.name);
  constructor(private service: WebSocketService) {}
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('get-config')
  async getConfig(
    @MessageBody() body: ConfigRequest,
    @WebSocketEnvironment() environment: Environment,
  ): Promise<ConfigResponse> {
    return await this.service.getConfig(body, environment);
  }

  @SubscribeMessage('list-contents')
  async listContent(
    @MessageBody() body: ListContentsRequest,
    @WebSocketEnvironment() environment: Environment,
  ): Promise<ContentResponse[]> {
    return await this.service.listContent(body, environment);
  }

  @SubscribeMessage('list-themes')
  async listThemes(
    @MessageBody() body: ListThemesRequest,
    @WebSocketEnvironment() environment: Environment,
  ): Promise<Theme[]> {
    return await this.service.listThemes(body, environment);
  }

  @SubscribeMessage('identity')
  async identity(@MessageBody() data: IdentityRequest): Promise<number> {
    return data.data;
  }

  @SubscribeMessage('upsert-user')
  async upsertBizUsers(
    @MessageBody() body: UpsertUserRequest,
    @ConnectedSocket() client: Socket,
    @WebSocketEnvironment() environment: Environment,
  ): Promise<UpsertUserResponse> {
    const result = await this.service.upsertBizUsers(body, environment);

    // After successful user upsert, join environment room
    if (result) {
      await client.join(`environment:${environment.id}`);
      this.logger.log(`User ${body.userId} joined environment room: ${environment.id}`);
    }

    return result;
  }

  @SubscribeMessage('upsert-company')
  async upsertBizCompanies(
    @MessageBody() body: UpsertCompanyRequest,
    @WebSocketEnvironment() environment: Environment,
  ): Promise<UpsertCompanyResponse> {
    return await this.service.upsertBizCompanies(body, environment);
  }

  @SubscribeMessage('create-session')
  async createSession(
    @MessageBody() body: CreateSessionRequest,
    @WebSocketEnvironment() environment: Environment,
  ): Promise<CreateSessionResponse | false> {
    const session = await this.service.createSession(body, environment);
    if (!session) {
      return false;
    }
    const contentSession = await this.service.getContentSessionBySession(
      body.userId,
      session.id,
      environment,
    );
    if (!contentSession) {
      return false;
    }
    return { session, contentSession };
  }

  @SubscribeMessage('track-event')
  async sendEvent(
    @MessageBody() body: TrackEventRequest,
    @WebSocketEnvironment() environment: Environment,
  ): Promise<ContentSession | false> {
    await this.service.trackEvent(body, environment);
    return await this.service.getContentSessionBySession(body.userId, body.sessionId, environment);
  }

  @SubscribeMessage('get-project-settings')
  async getProjectSettings(
    @MessageBody() body: GetProjectSettingsRequest,
    @WebSocketEnvironment() environment: Environment,
  ): Promise<GetProjectSettingsResponse> {
    return await this.service.getProjectSettings(body, environment);
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

      // this.server.to(`environment:${environmentId}`).emit('content-changed', {
      //   timestamp: new Date(),
      // });
      this.logger.log(`Content change notification sent to environment ${environmentId}`);
    } catch (error) {
      this.logger.error(`Failed to send content change notification: ${error.message}`);
    }
  }
}
