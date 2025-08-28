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
  StartFlowDto,
  TooltipTargetMissingDto,
  ToggleClientConditionDto,
} from './web-socket-v2.dto';
import { getExternalUserRoom } from '@/utils/ws-utils';
import { ClientContext } from '@usertour/types';

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
        const clientContext = auth.clientContext as ClientContext;

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

        if (clientContext) {
          await this.service.updateUserClientContext(socket, clientContext);
        }

        const room = getExternalUserRoom(environment.id, externalUserId);
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

  @SubscribeMessage('start-flow')
  async startFlow(
    @MessageBody() startFlowDto: StartFlowDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.startFlow(this.server, client, startFlowDto);
  }

  @SubscribeMessage('end-flow')
  async endFlow(
    @MessageBody() endFlowDto: EndFlowDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.endFlow(client, endFlowDto);
  }

  @SubscribeMessage('go-to-step')
  async goToStep(
    @MessageBody() goToStepDto: GoToStepDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.goToStep(client, goToStepDto);
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

  @SubscribeMessage('update-client-context')
  async updateClientContext(
    @MessageBody() context: ClientContext,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.updateUserClientContext(client, context);
  }

  @SubscribeMessage('track-event')
  async trackEvent(
    @MessageBody() trackEventDto: TrackEventDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.trackEventV2(client, trackEventDto);
  }

  @SubscribeMessage('report-tooltip-target-missing')
  async reportTooltipTargetMissing(
    @MessageBody() reportTooltipTargetMissingDto: TooltipTargetMissingDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.reportTooltipTargetMissing(client, reportTooltipTargetMissingDto);
  }

  @SubscribeMessage('toggle-client-condition')
  async toggleClientCondition(
    @MessageBody() { conditionId, isActive }: ToggleClientConditionDto,
    @ConnectedSocket() client: Socket,
  ): Promise<boolean> {
    return await this.service.toggleClientCondition(this.server, client, conditionId, isActive);
  }
}
