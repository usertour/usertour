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
import { WebSocketV2Service } from './web-socket-v2.service';
import {
  TrackEventDto,
  UpsertCompanyDto,
  UpsertUserDto,
  AnswerQuestionDto,
  ClickChecklistTaskDto,
  EndFlowDto,
  GoToStepDto,
  HideChecklistDto,
  ShowChecklistDto,
  UpdateClientContextDto,
  StartFlowDto,
} from './web-socket-v2.dto';
import { ContentDataType } from '@usertour/types';

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
    await this.setFlowSession(client);
    await this.setChecklistSession(client);
    return true;
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
    const flowSession = await this.service.setContentSession(
      client.data.environment,
      client.data.externalUserId,
      ContentDataType.FLOW,
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

  private async setChecklistSession(client: Socket): Promise<boolean> {
    if (client.data.checklistSessionId) {
      return true;
    }

    const externalUserId = client.data.externalUserId;

    const checklistSession = await this.service.setContentSession(
      client.data.environment,
      client.data.externalUserId,
      ContentDataType.CHECKLIST,
      client.data.externalCompanyId,
    );

    client.data.checklistSessionId = checklistSession.id;

    this.server.to(`user:${externalUserId}`).emit('set-checklist-session', checklistSession);

    return true;
  }

  @SubscribeMessage('upsert-user')
  async upsertBizUsers(
    @MessageBody() upsertUserDto: UpsertUserDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    const environment = client.data.environment;
    this.logger.log(`Upserting user ${upsertUserDto.userId} in environment ${environment.id}`);

    await this.service.upsertBizUsers(upsertUserDto, environment);
    return true;
  }

  @SubscribeMessage('upsert-company')
  async upsertBizCompanies(
    @MessageBody() upsertCompanyDto: UpsertCompanyDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    const environment = client.data.environment;

    const result = await this.service.upsertBizCompanies(upsertCompanyDto, environment);

    // Store company info in socket data for future use
    if (result) {
      client.data.externalCompanyId = upsertCompanyDto.companyId;
      client.data.companyInfo = result;
    }

    return true;
  }

  @SubscribeMessage('start-flow')
  async startFlow(
    @MessageBody() startFlowDto: StartFlowDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.setFlowSession(client, startFlowDto.contentId, startFlowDto.stepIndex);
  }

  @SubscribeMessage('end-flow')
  async endFlow(
    @MessageBody() endFlowDto: EndFlowDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    const environment = client.data.environment;
    await this.service.endFlow(
      client.data.externalUserId,
      endFlowDto.sessionId,
      endFlowDto.reason,
      environment,
    );

    // Unset session ID if it matches the ended session
    this.unsetContentSessionId(client, endFlowDto.sessionId);

    return true;
  }

  @SubscribeMessage('go-to-step')
  async goToStep(
    @MessageBody() goToStepDto: GoToStepDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.goToStep(goToStepDto, client.data.environment);
  }

  @SubscribeMessage('answer-question')
  async answerQuestion(
    @MessageBody() answerQuestionDto: AnswerQuestionDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.answerQuestion(answerQuestionDto, client.data.environment);
  }

  @SubscribeMessage('click-checklist-task')
  async clickChecklistTask(
    @MessageBody() clickChecklistTaskDto: ClickChecklistTaskDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.clickChecklistTask(clickChecklistTaskDto, client.data.environment);
  }

  @SubscribeMessage('hide-checklist')
  async hideChecklist(
    @MessageBody() hideChecklistDto: HideChecklistDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.hideChecklist(hideChecklistDto, client.data.environment);
  }

  @SubscribeMessage('show-checklist')
  async showChecklist(
    @MessageBody() showChecklistDto: ShowChecklistDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.showChecklist(showChecklistDto, client.data.environment);
  }

  @SubscribeMessage('update-client-context')
  async updateClientContext(
    @MessageBody() updateClientContextDto: UpdateClientContextDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    const externalUserId = client.data.externalUserId;
    const environment = client.data.environment;
    const externalCompanyId = client.data.externalCompanyId;

    await this.service.updateUserClientContext(
      environment,
      externalUserId,
      updateClientContextDto,
      externalCompanyId,
    );
    return true;
  }

  @SubscribeMessage('track-event')
  async trackEvent(
    @MessageBody() trackEventDto: TrackEventDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return Boolean(await this.service.trackEvent(trackEventDto, client.data.environment));
  }

  /**
   * Clear client session IDs if they match the provided session ID
   */
  private unsetContentSessionId(client: Socket, sessionId: string): void {
    const sessionKeys = ['flowSessionId', 'checklistSessionId'] as const;

    for (const key of sessionKeys) {
      if (client.data[key] === sessionId) {
        client.data[key] = null;
        break;
      }
    }
  }
}
