import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketV2Service } from './web-socket-v2.service';
import { SocketClientData } from '@/common/types/content';
import { ClientMessageKind } from './web-socket-v2.dto';

export interface MessageHandler {
  handle(
    server: Server,
    socket: Socket,
    socketClientData: SocketClientData,
    payload?: any,
  ): Promise<boolean>;
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
    // State modification messages
    this.handlers.set(ClientMessageKind.UPSERT_USER, {
      handle: async (_server, socket, socketClientData, payload) => {
        return await this.service.upsertBizUsers(socket, socketClientData, payload);
      },
    });

    this.handlers.set(ClientMessageKind.UPSERT_COMPANY, {
      handle: async (_server, socket, socketClientData, payload) => {
        return await this.service.upsertBizCompanies(socket, socketClientData, payload);
      },
    });

    this.handlers.set(ClientMessageKind.UPDATE_CLIENT_CONTEXT, {
      handle: async (_server, socket, _socketClientData, payload) => {
        return await this.service.updateClientContext(socket, payload);
      },
    });

    this.handlers.set(ClientMessageKind.START_CONTENT, {
      handle: async (server, socket, socketClientData, payload) => {
        return await this.service.startContent(server, socket, socketClientData, payload);
      },
    });

    this.handlers.set(ClientMessageKind.END_CONTENT, {
      handle: async (server, socket, socketClientData, payload) => {
        return await this.service.endContent(server, socket, socketClientData, payload);
      },
    });

    this.handlers.set(ClientMessageKind.BEGIN_BATCH, {
      handle: async () => {
        // BeginBatch is a no-op, just return success
        return true;
      },
    });

    this.handlers.set(ClientMessageKind.END_BATCH, {
      handle: async (server, socket, socketClientData) => {
        return await this.service.endBatch(server, socket, socketClientData);
      },
    });

    this.handlers.set(ClientMessageKind.TOGGLE_CLIENT_CONDITION, {
      handle: async (_server, socket, _socketClientData, payload) => {
        return await this.service.toggleClientCondition(socket, payload);
      },
    });

    this.handlers.set(ClientMessageKind.FIRE_CONDITION_WAIT_TIMER, {
      handle: async (_server, socket, socketClientData, payload) => {
        return await this.service.fireConditionWaitTimer(socket, socketClientData, payload);
      },
    });

    // Read-only messages
    this.handlers.set(ClientMessageKind.TRACK_EVENT, {
      handle: async (_server, _socket, socketClientData, payload) => {
        return await this.service.trackEvent(socketClientData, payload);
      },
    });

    this.handlers.set(ClientMessageKind.GO_TO_STEP, {
      handle: async (_server, _socket, socketClientData, payload) => {
        return await this.service.goToStep(socketClientData, payload);
      },
    });

    this.handlers.set(ClientMessageKind.ANSWER_QUESTION, {
      handle: async (_server, _socket, socketClientData, payload) => {
        return await this.service.answerQuestion(socketClientData, payload);
      },
    });

    this.handlers.set(ClientMessageKind.CLICK_CHECKLIST_TASK, {
      handle: async (_server, _socket, socketClientData, payload) => {
        return await this.service.clickChecklistTask(socketClientData, payload);
      },
    });

    this.handlers.set(ClientMessageKind.HIDE_CHECKLIST, {
      handle: async (_server, _socket, socketClientData, payload) => {
        return await this.service.hideChecklist(socketClientData, payload);
      },
    });

    this.handlers.set(ClientMessageKind.SHOW_CHECKLIST, {
      handle: async (_server, _socket, socketClientData, payload) => {
        return await this.service.showChecklist(socketClientData, payload);
      },
    });

    this.handlers.set(ClientMessageKind.REPORT_TOOLTIP_TARGET_MISSING, {
      handle: async (_server, _socket, socketClientData, payload) => {
        return await this.service.reportTooltipTargetMissing(socketClientData, payload);
      },
    });
  }

  async handle(
    server: Server,
    socket: Socket,
    socketClientData: SocketClientData,
    kind: string,
    payload: any,
  ): Promise<boolean> {
    const handler = this.handlers.get(kind);

    if (!handler) {
      this.logger.warn(`No handler found for message kind: ${kind}`);
      return false;
    }

    try {
      return await handler.handle(server, socket, socketClientData, payload);
    } catch (error) {
      this.logger.error(`Error handling message kind ${kind}: ${error.message}`);
      return false;
    }
  }
}
