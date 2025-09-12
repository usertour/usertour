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
  GoToStepDto,
  HideChecklistDto,
  ShowChecklistDto,
  TooltipTargetMissingDto,
  ToggleClientConditionDto,
  StartContentDto,
  EndContentDto,
  FireConditionWaitTimerDto,
} from './web-socket-v2.dto';
import { SocketManagementService } from '@/web-socket/core/socket-management.service';
import { ClientContext } from '@usertour/types';

@WsGateway({ namespace: '/v2' })
@UseGuards(WebSocketV2Guard)
@UseInterceptors(WebSocketPerformanceInterceptor)
export class WebSocketV2Gateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketV2Gateway.name);

  constructor(
    private readonly service: WebSocketV2Service,
    private readonly socketManagementService: SocketManagementService,
  ) {}

  // Connection-level authentication - runs during handshake
  async afterInit(server: Server): Promise<void> {
    this.server = server;

    server.use(async (socket: Socket, next) => {
      try {
        const auth = (socket.handshake?.auth as Record<string, unknown>) ?? {};
        const externalUserId = String(auth.externalUserId ?? '');
        const clientContext = auth.clientContext as ClientContext;
        const token = String(auth.token ?? '');

        if (!externalUserId || !token) {
          return next(new SDKAuthenticationError());
        }

        const environment = await this.service.fetchEnvironmentByToken(token);
        if (!environment) {
          return next(new SDKAuthenticationError());
        }

        // Store validated data in socket
        await this.socketManagementService.setClientData(socket, {
          environment,
          externalUserId,
          clientContext,
        });

        const room = this.socketManagementService.buildExternalUserRoomId(
          environment.id,
          externalUserId,
        );
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

  @SubscribeMessage('begin-batch')
  async beginBatch(): Promise<boolean> {
    return true;
  }

  @SubscribeMessage('end-batch')
  async endBatch(@ConnectedSocket() client: Socket): Promise<boolean> {
    return await this.service.endBatch(this.server, client);
  }

  @SubscribeMessage('upsert-user')
  async upsertBizUsers(
    @MessageBody() upsertUserDto: UpsertUserDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.upsertBizUsers(client, upsertUserDto);
  }

  @SubscribeMessage('upsert-company')
  async upsertBizCompanies(
    @MessageBody() upsertCompanyDto: UpsertCompanyDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.upsertBizCompanies(client, upsertCompanyDto);
  }

  @SubscribeMessage('update-client-context')
  async updateClientContext(
    @MessageBody() context: ClientContext,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.updateClientContext(client, context);
  }

  @SubscribeMessage('track-event')
  async trackEvent(
    @MessageBody() trackEventDto: TrackEventDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.trackEvent(client, trackEventDto);
  }

  @SubscribeMessage('toggle-client-condition')
  async toggleClientCondition(
    @MessageBody() toggleClientConditionDto: ToggleClientConditionDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.toggleClientCondition(client, toggleClientConditionDto);
  }

  @SubscribeMessage('fire-condition-wait-timer')
  async fireConditionWaitTimer(
    @MessageBody() fireConditionWaitTimerDto: FireConditionWaitTimerDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.fireConditionWaitTimer(client, fireConditionWaitTimerDto);
  }

  @SubscribeMessage('start-content')
  async startContent(
    @MessageBody() startContentDto: StartContentDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.startContent(this.server, client, startContentDto);
  }

  @SubscribeMessage('end-content')
  async endContent(
    @MessageBody() endContentDto: EndContentDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.endContent(this.server, client, endContentDto);
  }

  @SubscribeMessage('go-to-step')
  async goToStep(
    @MessageBody() goToStepDto: GoToStepDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.goToStep(client, goToStepDto);
  }

  @SubscribeMessage('report-tooltip-target-missing')
  async reportTooltipTargetMissing(
    @MessageBody() reportTooltipTargetMissingDto: TooltipTargetMissingDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.reportTooltipTargetMissing(
      this.server,
      client,
      reportTooltipTargetMissingDto,
    );
  }

  @SubscribeMessage('answer-question')
  async answerQuestion(
    @MessageBody() answerQuestionDto: AnswerQuestionDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.answerQuestion(client, answerQuestionDto);
  }

  @SubscribeMessage('click-checklist-task')
  async clickChecklistTask(
    @MessageBody() clickChecklistTaskDto: ClickChecklistTaskDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.clickChecklistTask(client, clickChecklistTaskDto);
  }

  @SubscribeMessage('hide-checklist')
  async hideChecklist(
    @MessageBody() hideChecklistDto: HideChecklistDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.hideChecklist(client, hideChecklistDto);
  }

  @SubscribeMessage('show-checklist')
  async showChecklist(
    @MessageBody() showChecklistDto: ShowChecklistDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.showChecklist(client, showChecklistDto);
  }
}
