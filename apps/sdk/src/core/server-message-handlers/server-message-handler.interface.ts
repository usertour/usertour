import { CustomContentSession, TrackCondition, ConditionWaitTimer } from '@usertour/types';

/**
 * Context object passed to server message handlers
 * Provides access to UsertourCore methods and properties needed by handlers
 */
export interface ServerMessageHandlerContext {
  setFlowSession: (session: CustomContentSession) => Promise<boolean>;
  forceGoToStep: (sessionId: string, stepId: string) => Promise<boolean>;
  unsetFlowSession: (sessionId: string) => Promise<boolean>;
  setChecklistSession: (session: CustomContentSession) => Promise<boolean>;
  unsetChecklistSession: (sessionId: string) => Promise<boolean>;
  addLauncher: (session: CustomContentSession) => Promise<boolean>;
  removeLauncher: (contentId: string) => Promise<boolean>;
  trackClientCondition: (condition: TrackCondition) => Promise<boolean>;
  removeConditions: (conditionIds: string[]) => Promise<boolean>;
  startConditionWaitTimer: (condition: ConditionWaitTimer) => Promise<boolean>;
  cancelConditionWaitTimer: (condition: ConditionWaitTimer) => Promise<boolean>;
  addUnackedTask: (sessionId: string, taskId: string) => Promise<boolean>;
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
  handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean>;
}
