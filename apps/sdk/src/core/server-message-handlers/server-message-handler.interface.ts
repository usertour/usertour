import { CustomContentSession, TrackCondition, ConditionWaitTimer } from '@usertour/types';

/**
 * Context object passed to server message handlers
 * Provides access to UsertourCore methods and properties needed by handlers
 */
export interface ServerMessageHandlerContext {
  setFlowSession: (session: CustomContentSession) => boolean;
  forceGoToStep: (sessionId: string, stepId: string) => boolean;
  unsetFlowSession: (sessionId: string) => boolean;
  setChecklistSession: (session: CustomContentSession) => boolean;
  unsetChecklistSession: (sessionId: string) => boolean;
  addLauncher: (session: CustomContentSession) => Promise<boolean>;
  removeLauncher: (contentId: string) => boolean;
  trackClientCondition: (condition: TrackCondition) => boolean;
  removeConditions: (conditionIds: string[]) => boolean;
  startConditionWaitTimer: (condition: ConditionWaitTimer) => boolean;
  cancelConditionWaitTimer: (condition: ConditionWaitTimer) => boolean;
  addUnackedTask: (sessionId: string, taskId: string) => boolean;
}

/**
 * Interface for handling specific server message types
 */
export interface ServerMessageHandler {
  /**
   * The message kind this handler can handle
   */
  readonly messageKind: string;

  /**
   * Handle the server message
   * @param payload - The message payload
   * @param context - The context object with UsertourCore methods
   * @returns Promise that resolves to true if handled successfully, false otherwise
   */
  handle(payload: unknown, context: ServerMessageHandlerContext): boolean | Promise<boolean>;
}
