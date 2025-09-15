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
import { WebSocketClientDataInterceptor } from './web-socket-client-data.interceptor';
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
import { SocketClientData, SocketDataService } from '@/web-socket/core/socket-data.service';
import { ClientContext } from '@usertour/types';
import { buildExternalUserRoomId } from '../../utils/websocket-utils';
import { WebSocketClientData } from '../web-socket.decorator';

@WsGateway({ namespace: '/v2' })
@UseGuards(WebSocketV2Guard)
@UseInterceptors(WebSocketPerformanceInterceptor, WebSocketClientDataInterceptor)
export class WebSocketV2Gateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketV2Gateway.name);

  constructor(
    private readonly service: WebSocketV2Service,
    private readonly socketDataService: SocketDataService,
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
        await this.socketDataService.setClientData(socket.id, {
          environment,
          externalUserId,
          clientContext,
          trackConditions: [],
          waitTimerConditions: [],
        });

        const room = buildExternalUserRoomId(environment.id, externalUserId);
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
  async endBatch(
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.endBatch(this.server, socket, socketClientData);
  }

  @SubscribeMessage('upsert-user')
  async upsertBizUsers(
    @MessageBody() upsertUserDto: UpsertUserDto,
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.upsertBizUsers(socket, socketClientData, upsertUserDto);
  }

  @SubscribeMessage('upsert-company')
  async upsertBizCompanies(
    @MessageBody() upsertCompanyDto: UpsertCompanyDto,
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.upsertBizCompanies(socket, socketClientData, upsertCompanyDto);
  }

  @SubscribeMessage('update-socket-context')
  async updateClientContext(
    @MessageBody() context: ClientContext,
    @ConnectedSocket() socket: Socket,
  ): Promise<boolean> {
    return await this.service.updateClientContext(socket, context);
  }

  @SubscribeMessage('track-event')
  async trackEvent(
    @MessageBody() trackEventDto: TrackEventDto,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.trackEvent(socketClientData, trackEventDto);
  }

  @SubscribeMessage('toggle-socket-condition')
  async toggleClientCondition(
    @MessageBody() toggleClientConditionDto: ToggleClientConditionDto,
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    if (!socketClientData) return false;
    return await this.service.toggleClientCondition(
      socket,
      socketClientData,
      toggleClientConditionDto,
    );
  }

  @SubscribeMessage('fire-condition-wait-timer')
  async fireConditionWaitTimer(
    @MessageBody() fireConditionWaitTimerDto: FireConditionWaitTimerDto,
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    if (!socketClientData) return false;
    return await this.service.fireConditionWaitTimer(
      socket,
      socketClientData,
      fireConditionWaitTimerDto,
    );
  }

  @SubscribeMessage('start-content')
  async startContent(
    @MessageBody() startContentDto: StartContentDto,
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.startContent(this.server, socket, socketClientData, startContentDto);
  }

  @SubscribeMessage('end-content')
  async endContent(
    @MessageBody() endContentDto: EndContentDto,
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.endContent(this.server, socket, socketClientData, endContentDto);
  }

  @SubscribeMessage('go-to-step')
  async goToStep(
    @MessageBody() goToStepDto: GoToStepDto,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.goToStep(socketClientData, goToStepDto);
  }

  @SubscribeMessage('report-tooltip-target-missing')
  async reportTooltipTargetMissing(
    @MessageBody() reportTooltipTargetMissingDto: TooltipTargetMissingDto,
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.reportTooltipTargetMissing(
      this.server,
      socket,
      socketClientData,
      reportTooltipTargetMissingDto,
    );
  }

  @SubscribeMessage('answer-question')
  async answerQuestion(
    @MessageBody() answerQuestionDto: AnswerQuestionDto,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.answerQuestion(socketClientData, answerQuestionDto);
  }

  @SubscribeMessage('click-checklist-task')
  async clickChecklistTask(
    @MessageBody() clickChecklistTaskDto: ClickChecklistTaskDto,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.clickChecklistTask(socketClientData, clickChecklistTaskDto);
  }

  @SubscribeMessage('hide-checklist')
  async hideChecklist(
    @MessageBody() hideChecklistDto: HideChecklistDto,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.hideChecklist(socketClientData, hideChecklistDto);
  }

  @SubscribeMessage('show-checklist')
  async showChecklist(
    @MessageBody() showChecklistDto: ShowChecklistDto,
    @WebSocketClientData() socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.service.showChecklist(socketClientData, showChecklistDto);
  }
}
