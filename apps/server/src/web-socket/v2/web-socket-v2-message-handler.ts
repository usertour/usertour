import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ClientMessageKind } from '@usertour/types';
import { WebSocketV2Service } from './web-socket-v2.service';
import { WebSocketContext } from './web-socket-v2.dto';
import { DistributedLockService } from '../core/distributed-lock.service';
import { buildSocketLockKey, getSocketToken } from '@/utils/websocket-utils';

interface MessageHandler {
  handle(context: WebSocketContext, payload?: any): Promise<boolean>;
}

/**
 * WebSocket V2 message handler
 * Routes messages to appropriate handlers based on message kind
 */
@Injectable()
export class WebSocketV2MessageHandler {
  private readonly logger = new Logger(WebSocketV2MessageHandler.name);
  private handlers = new Map<string, MessageHandler>();

  constructor(
    private readonly service: WebSocketV2Service,
    private readonly distributedLockService: DistributedLockService,
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    const register = (
      kind: ClientMessageKind,
      handler: (context: WebSocketContext, payload: any) => Promise<boolean>,
    ) => {
      this.handlers.set(kind, { handle: handler });
    };

    // State modification messages
    register(
      ClientMessageKind.UPSERT_USER,
      async (context, payload) => await this.service.upsertBizUsers(context, payload),
    );

    register(
      ClientMessageKind.UPSERT_COMPANY,
      async (context, payload) => await this.service.upsertBizCompanies(context, payload),
    );

    register(
      ClientMessageKind.UPDATE_CLIENT_CONTEXT,
      async (context, payload) => await this.service.updateClientContext(context, payload),
    );

    register(
      ClientMessageKind.START_CONTENT,
      async (context, payload) => await this.service.startContent(context, payload),
    );

    register(
      ClientMessageKind.END_CONTENT,
      async (context, payload) => await this.service.endContent(context, payload),
    );

    register(
      ClientMessageKind.END_ALL_CONTENT,
      async (context, _payload) => await this.service.endAllContent(context),
    );

    register(
      ClientMessageKind.TOGGLE_CLIENT_CONDITION,
      async (context, payload) => await this.service.toggleClientCondition(context, payload),
    );

    register(
      ClientMessageKind.FIRE_CONDITION_WAIT_TIMER,
      async (context, payload) => await this.service.fireConditionWaitTimer(context, payload),
    );

    register(
      ClientMessageKind.TRACK_EVENT,
      async (context, payload) => await this.service.trackEvent(context, payload),
    );

    // Event tracking messages
    register(
      ClientMessageKind.GO_TO_STEP,
      async (context, payload) => await this.service.goToStep(context, payload),
    );

    register(
      ClientMessageKind.ANSWER_QUESTION,
      async (context, payload) => await this.service.answerQuestion(context, payload),
    );

    register(
      ClientMessageKind.CLICK_CHECKLIST_TASK,
      async (context, payload) => await this.service.clickChecklistTask(context, payload),
    );

    register(
      ClientMessageKind.HIDE_CHECKLIST,
      async (context, payload) => await this.service.hideChecklist(context, payload),
    );

    register(
      ClientMessageKind.SHOW_CHECKLIST,
      async (context, payload) => await this.service.showChecklist(context, payload),
    );

    register(
      ClientMessageKind.REPORT_TOOLTIP_TARGET_MISSING,
      async (context, payload) => await this.service.reportTooltipTargetMissing(context, payload),
    );

    register(
      ClientMessageKind.ACTIVATE_LAUNCHER,
      async (context, payload) => await this.service.activateLauncher(context, payload),
    );

    register(
      ClientMessageKind.DISMISS_LAUNCHER,
      async (context, payload) => await this.service.dismissLauncher(context, payload),
    );

    register(
      ClientMessageKind.END_BATCH,
      async (context, _payload) => await this.service.endBatch(context),
    );

    // Special handlers
    this.handlers.set(ClientMessageKind.BEGIN_BATCH, {
      handle: async (_context, _payload) => true,
    });
  }

  async handle(server: Server, socket: Socket, kind: string, payload: any): Promise<boolean> {
    const startTime = Date.now();
    const lockKey = buildSocketLockKey(socket);

    const result = await this.distributedLockService.withRetryLock(
      lockKey,
      () => this.handleMessage(server, socket, kind, payload),
      5, // Retry 5 times (increased from 3 to handle concurrent message processing)
      1000, // Retry interval 1000ms (allows sufficient time for message processing including DB operations)
      5000, // Lock timeout 5 seconds
    );

    const duration = Date.now() - startTime;
    const token = getSocketToken(socket);
    this.logger.log(
      `[WS] handleClientMessage socketId=${socket.id} token=${token || 'N/A'} kind=${kind} - Completed in ${duration}ms`,
    );

    return result ?? false;
  }

  private async handleMessage(
    server: Server,
    socket: Socket,
    kind: string,
    payload: any,
  ): Promise<boolean> {
    const handler = this.handlers.get(kind);

    if (!handler) {
      this.logger.warn(`No handler found for message kind: ${kind}`);
      return false;
    }

    try {
      // Pre-load socket data and validate user authentication
      // User is created during connection, so bizUserId should always be set
      const socketData = await this.service.getSocketData(socket);
      if (!socketData || !socketData.bizUserId) {
        this.logger.warn(`No authenticated user found for socket ${socket.id}, rejecting ${kind}`);
        return false;
      }

      const context: WebSocketContext = {
        server,
        socket,
        socketData,
      };

      return await handler.handle(context, payload);
    } catch (error) {
      this.logger.error({
        message: `Error handling message kind ${kind}: ${error.message}`,
        stack: error.stack,
        socketId: socket.id,
        payload: payload,
      });
      return false;
    }
  }
}
