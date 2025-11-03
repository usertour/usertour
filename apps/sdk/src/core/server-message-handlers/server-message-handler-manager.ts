import { logger } from '@/utils';
import {
  ServerMessageHandler,
  ServerMessageHandlerContext,
} from './server-message-handler.interface';
import {
  SetFlowSessionHandler,
  ForceGoToStepHandler,
  UnsetFlowSessionHandler,
  SetChecklistSessionHandler,
  UnsetChecklistSessionHandler,
  ChecklistTaskCompletedHandler,
  AddLauncherHandler,
  RemoveLauncherHandler,
  TrackClientConditionHandler,
  UntrackClientConditionHandler,
  StartConditionWaitTimerHandler,
  CancelConditionWaitTimerHandler,
} from './server-message-handlers';

/**
 * Manages server message handlers and routes messages to appropriate handlers
 */
export class ServerMessageHandlerManager {
  private handlers: Map<string, ServerMessageHandler> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register default handlers
   */
  private registerDefaultHandlers(): void {
    this.registerHandler(new SetFlowSessionHandler());
    this.registerHandler(new ForceGoToStepHandler());
    this.registerHandler(new UnsetFlowSessionHandler());
    this.registerHandler(new SetChecklistSessionHandler());
    this.registerHandler(new UnsetChecklistSessionHandler());
    this.registerHandler(new ChecklistTaskCompletedHandler());
    this.registerHandler(new AddLauncherHandler());
    this.registerHandler(new RemoveLauncherHandler());
    this.registerHandler(new TrackClientConditionHandler());
    this.registerHandler(new UntrackClientConditionHandler());
    this.registerHandler(new StartConditionWaitTimerHandler());
    this.registerHandler(new CancelConditionWaitTimerHandler());
  }

  /**
   * Register a server message handler
   * @param handler - The handler to register
   */
  registerHandler(handler: ServerMessageHandler): void {
    this.handlers.set(handler.messageKind, handler);
  }

  /**
   * Handle server message by routing to appropriate handler
   * @param message - The server message containing kind and payload
   * @param context - The context object with UsertourCore methods
   * @returns Promise<boolean> - True if message was handled successfully
   */
  async handleServerMessage(
    message: unknown,
    context: ServerMessageHandlerContext,
  ): Promise<boolean> {
    const { kind, payload } = message as { kind: string; payload: unknown };
    const handler = this.handlers.get(kind);

    if (!handler) {
      logger.warn(`No handler found for server message kind: ${kind}`);
      return false;
    }

    try {
      return await handler.handle(payload, context);
    } catch (error) {
      logger.error(`Error handling server message kind ${kind}:`, error);
      return false;
    }
  }
}
