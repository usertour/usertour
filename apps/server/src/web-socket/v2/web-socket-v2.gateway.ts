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
  StartContentDto,
  EndContentDto,
  FireConditionWaitTimerDto,
} from './web-socket-v2.dto';
import { SocketRedisService } from '@/web-socket/core/socket-redis.service';
import { SocketClientData } from '@/common/types/content';
import { ClientContext } from '@usertour/types';
import { buildExternalUserRoomId } from '../../utils/websocket-utils';
import { WebSocketClientData } from '../web-socket.decorator';
import { ClientCondition } from '@/common/types/sdk';

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

        if (!externalUserId || !token) {
          return next(new SDKAuthenticationError());
        }

        const environment = await this.service.fetchEnvironmentByToken(token);
        if (!environment) {
          return next(new SDKAuthenticationError());
        }

        // Store validated data in socket
        const clientData = {
          environment,
          externalUserId,
          clientContext,
          clientConditions,
          externalCompanyId,
          conditionWaitTimers: [],
        };
        if (!(await this.socketRedisService.setClientData(socket.id, clientData))) {
          this.logger.error(`Failed to persist client data for socket ${socket.id}`);
          return next(new ServiceUnavailableError());
        }

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

  // Cleanup when a socket disconnects for any reason
  async handleDisconnect(socket: Socket): Promise<void> {
    try {
      await this.socketRedisService.removeClientData(socket.id);
      this.logger.debug(`Cleaned up client data for disconnected socket ${socket.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup client data for disconnected socket ${socket.id}: ` +
          `${(error as Error)?.message ?? 'Unknown error'}`,
      );
    }
  }

  @SubscribeMessage('begin-batch')
  async beginBatch(): Promise<boolean> {
    return true;
  }

  @SubscribeMessage('end-batch')
  async endBatch(
    @WebSocketClientData() socketClientData: SocketClientData,
    @ConnectedSocket() socket: Socket,
  ): Promise<boolean> {
    return await this.service.endBatch(this.server, socket, socketClientData);
  }

  @SubscribeMessage('upsert-user')
  async upsertBizUsers(
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() upsertUserDto: UpsertUserDto,
  ): Promise<boolean> {
    return await this.service.upsertBizUsers(socket, socketClientData, upsertUserDto);
  }

  @SubscribeMessage('upsert-company')
  async upsertBizCompanies(
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() upsertCompanyDto: UpsertCompanyDto,
  ): Promise<boolean> {
    return await this.service.upsertBizCompanies(socket, socketClientData, upsertCompanyDto);
  }

  @SubscribeMessage('update-client-context')
  async updateClientContext(
    @ConnectedSocket() socket: Socket,
    @MessageBody() context: ClientContext,
  ): Promise<boolean> {
    return await this.service.updateClientContext(socket, context);
  }

  @SubscribeMessage('track-event')
  async trackEvent(
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() trackEventDto: TrackEventDto,
  ): Promise<boolean> {
    return await this.service.trackEvent(socketClientData, trackEventDto);
  }

  @SubscribeMessage('toggle-client-condition')
  async toggleClientCondition(
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() clientCondition: ClientCondition,
  ): Promise<boolean> {
    return await this.service.toggleClientCondition(socket, socketClientData, clientCondition);
  }

  @SubscribeMessage('fire-condition-wait-timer')
  async fireConditionWaitTimer(
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() fireConditionWaitTimerDto: FireConditionWaitTimerDto,
  ): Promise<boolean> {
    return await this.service.fireConditionWaitTimer(
      socket,
      socketClientData,
      fireConditionWaitTimerDto,
    );
  }

  @SubscribeMessage('start-content')
  async startContent(
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() startContentDto: StartContentDto,
  ): Promise<boolean> {
    return await this.service.startContent(this.server, socket, socketClientData, startContentDto);
  }

  @SubscribeMessage('end-content')
  async endContent(
    @ConnectedSocket() socket: Socket,
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() endContentDto: EndContentDto,
  ): Promise<boolean> {
    return await this.service.endContent(this.server, socket, socketClientData, endContentDto);
  }

  @SubscribeMessage('go-to-step')
  async goToStep(
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() goToStepDto: GoToStepDto,
  ): Promise<boolean> {
    return await this.service.goToStep(socketClientData, goToStepDto);
  }

  @SubscribeMessage('report-tooltip-target-missing')
  async reportTooltipTargetMissing(
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() reportTooltipTargetMissingDto: TooltipTargetMissingDto,
  ): Promise<boolean> {
    return await this.service.reportTooltipTargetMissing(
      socketClientData,
      reportTooltipTargetMissingDto,
    );
  }

  @SubscribeMessage('answer-question')
  async answerQuestion(
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() answerQuestionDto: AnswerQuestionDto,
  ): Promise<boolean> {
    return await this.service.answerQuestion(socketClientData, answerQuestionDto);
  }

  @SubscribeMessage('click-checklist-task')
  async clickChecklistTask(
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() clickChecklistTaskDto: ClickChecklistTaskDto,
  ): Promise<boolean> {
    return await this.service.clickChecklistTask(socketClientData, clickChecklistTaskDto);
  }

  @SubscribeMessage('hide-checklist')
  async hideChecklist(
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() hideChecklistDto: HideChecklistDto,
  ): Promise<boolean> {
    return await this.service.hideChecklist(socketClientData, hideChecklistDto);
  }

  @SubscribeMessage('show-checklist')
  async showChecklist(
    @WebSocketClientData() socketClientData: SocketClientData,
    @MessageBody() showChecklistDto: ShowChecklistDto,
  ): Promise<boolean> {
    return await this.service.showChecklist(socketClientData, showChecklistDto);
  }
}
