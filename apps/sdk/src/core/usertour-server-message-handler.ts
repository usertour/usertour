import { logger } from '@/utils';
import { CustomContentSession, TrackCondition, ConditionWaitTimer } from '@/types';
import { UsertourCore } from './usertour-core';

/**
 * Handles all server-to-client WebSocket messages
 * Centralizes message routing and business logic for server messages
 */
export class UsertourServerMessageHandler {
  /**
   * Creates a new UsertourServerMessageHandler instance
   * @param instance - The UsertourCore instance to delegate business logic to
   */
  constructor(private instance: UsertourCore) {}

  /**
   * Handles incoming server messages by routing to appropriate handler
   * @param kind - The message type identifier
   * @param payload - The message payload data
   * @returns Promise<boolean> - True if message was handled successfully, false otherwise
   */
  async handleMessage(kind: string, payload: unknown): Promise<boolean> {
    const handlers: Record<string, (payload: unknown) => boolean | Promise<boolean>> = {
      SetFlowSession: (payload) => this.handleSetFlowSession(payload),
      ForceGoToStep: (payload) => this.handleForceGoToStep(payload),
      UnsetFlowSession: (payload) => this.handleUnsetFlowSession(payload),
      SetChecklistSession: (payload) => this.handleSetChecklistSession(payload),
      UnsetChecklistSession: (payload) => this.handleUnsetChecklistSession(payload),
      TrackClientCondition: (payload) => this.handleTrackClientCondition(payload),
      UntrackClientCondition: (payload) => this.handleUntrackClientCondition(payload),
      StartConditionWaitTimer: (payload) => this.handleStartConditionWaitTimer(payload),
      CancelConditionWaitTimer: (payload) => this.handleCancelConditionWaitTimer(payload),
    };

    const handler = handlers[kind];
    if (!handler) {
      logger.warn(`No handler found for server message kind: ${kind}`);
      return false;
    }

    try {
      return await handler(payload);
    } catch (error) {
      logger.error(`Error handling server message kind ${kind}:`, error);
      return false;
    }
  }

  /**
   * Handles SetFlowSession message - creates or updates a flow session
   * @param payload - The flow session data
   * @returns boolean - True if session was set successfully
   */
  private handleSetFlowSession(payload: unknown): boolean {
    const success = this.instance.setFlowSession(payload as CustomContentSession);
    if (success) {
      this.instance.updateSocketAuthInfo({ flowSessionId: (payload as CustomContentSession).id });
    }
    return success;
  }

  /**
   * Handles ForceGoToStep message - forces navigation to a specific step
   * @param payload - Contains sessionId and stepId
   * @returns boolean - True if step navigation was successful
   */
  private handleForceGoToStep(payload: unknown): boolean {
    const { sessionId, stepId } = payload as { sessionId: string; stepId: string };
    return this.instance.forceGoToStep(sessionId, stepId);
  }

  /**
   * Handles UnsetFlowSession message - removes a flow session
   * @param payload - Contains sessionId to remove
   * @returns boolean - True if session was removed successfully
   */
  private handleUnsetFlowSession(payload: unknown): boolean {
    const { sessionId } = payload as { sessionId: string };
    const success = this.instance.unsetFlowSession(sessionId);
    if (success) {
      this.instance.updateSocketAuthInfo({ flowSessionId: undefined });
    }
    return success;
  }

  /**
   * Handles SetChecklistSession message - creates or updates a checklist session
   * @param payload - The checklist session data
   * @returns boolean - True if session was set successfully
   */
  private handleSetChecklistSession(payload: unknown): boolean {
    return this.instance.setChecklistSession(payload as CustomContentSession);
  }

  /**
   * Handles UnsetChecklistSession message - removes a checklist session
   * @param payload - Contains sessionId to remove
   * @returns boolean - True if session was removed successfully
   */
  private handleUnsetChecklistSession(payload: unknown): boolean {
    const { sessionId } = payload as { sessionId: string };
    const success = this.instance.unsetChecklistSession(sessionId);
    if (success) {
      this.instance.updateSocketAuthInfo({ checklistSessionId: undefined });
    }
    return success;
  }

  /**
   * Handles TrackClientCondition message - starts tracking a client condition
   * @param payload - The condition to track
   * @returns boolean - True if condition tracking was started successfully
   */
  private handleTrackClientCondition(payload: unknown): boolean {
    return this.instance.trackClientCondition(payload as TrackCondition);
  }

  /**
   * Handles UntrackClientCondition message - stops tracking a client condition
   * @param payload - Contains conditionId to stop tracking
   * @returns boolean - True if condition tracking was stopped successfully
   */
  private handleUntrackClientCondition(payload: unknown): boolean {
    const { conditionId } = payload as { conditionId: string };
    return this.instance.removeConditions([conditionId]);
  }

  /**
   * Handles StartConditionWaitTimer message - starts a condition wait timer
   * @param payload - The wait timer configuration
   * @returns boolean - True if timer was started successfully
   */
  private handleStartConditionWaitTimer(payload: unknown): boolean {
    return this.instance.startConditionWaitTimer(payload as ConditionWaitTimer);
  }

  /**
   * Handles CancelConditionWaitTimer message - cancels a condition wait timer
   * @param payload - The wait timer configuration to cancel
   * @returns boolean - True if timer was cancelled successfully
   */
  private handleCancelConditionWaitTimer(payload: unknown): boolean {
    return this.instance.cancelConditionWaitTimer(payload as ConditionWaitTimer);
  }
}
