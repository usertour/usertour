import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketV2Service } from './web-socket-v2.service';
import { ClientMessageKind, WebSocketContext } from './web-socket-v2.dto';

export interface MessageHandler {
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

  constructor(private readonly service: WebSocketV2Service) {
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
      ClientMessageKind.END_BATCH,
      async (context, _payload) => await this.service.endBatch(context),
    );

    // Special handlers
    this.handlers.set(ClientMessageKind.BEGIN_BATCH, {
      handle: async (_context, _payload) => true,
    });
  }

  async handle(server: Server, socket: Socket, kind: string, payload: any): Promise<boolean> {
    const handler = this.handlers.get(kind);

    if (!handler) {
      this.logger.warn(`No handler found for message kind: ${kind}`);
      return false;
    }

    try {
      // Pre-load socket client data for all handlers
      const socketClientData = await this.service.getSocketClientData(socket);
      if (!socketClientData) {
        this.logger.warn(`No client data found for socket ${socket.id}`);
        return false;
      }

      const context: WebSocketContext = {
        server,
        socket,
        socketClientData,
      };

      return await handler.handle(context, payload);
    } catch (error) {
      this.logger.error(`Error handling message kind ${kind}: ${error.message}`);
      return false;
    }
  }
}
