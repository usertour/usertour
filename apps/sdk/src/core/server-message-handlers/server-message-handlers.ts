import { CustomContentSession, TrackCondition, ConditionWaitTimer } from '@usertour/types';
import {
  ServerMessageHandler,
  ServerMessageHandlerContext,
} from './server-message-handler.interface';

/**
 * Handler for SetFlowSession message
 */
export class SetFlowSessionHandler implements ServerMessageHandler {
  readonly messageKind = 'SetFlowSession';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    return await context.setFlowSession(payload as CustomContentSession);
  }
}

/**
 * Handler for ForceGoToStep message
 */
export class ForceGoToStepHandler implements ServerMessageHandler {
  readonly messageKind = 'ForceGoToStep';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    const { sessionId, stepId } = payload as { sessionId: string; stepId: string };
    return await context.forceGoToStep(sessionId, stepId);
  }
}

/**
 * Handler for UnsetFlowSession message
 */
export class UnsetFlowSessionHandler implements ServerMessageHandler {
  readonly messageKind = 'UnsetFlowSession';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    const { sessionId } = payload as { sessionId: string };
    return await context.unsetFlowSession(sessionId);
  }
}

/**
 * Handler for SetChecklistSession message
 */
export class SetChecklistSessionHandler implements ServerMessageHandler {
  readonly messageKind = 'SetChecklistSession';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    return await context.setChecklistSession(payload as CustomContentSession);
  }
}

/**
 * Handler for UnsetChecklistSession message
 */
export class UnsetChecklistSessionHandler implements ServerMessageHandler {
  readonly messageKind = 'UnsetChecklistSession';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    const { sessionId } = payload as { sessionId: string };
    return await context.unsetChecklistSession(sessionId);
  }
}

/**
 * Handler for ChecklistTaskCompleted message
 */
export class ChecklistTaskCompletedHandler implements ServerMessageHandler {
  readonly messageKind = 'ChecklistTaskCompleted';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    const { sessionId, taskId } = payload as { sessionId: string; taskId: string };
    return await context.addUnackedTask(sessionId, taskId);
  }
}

/**
 * Handler for AddLauncher message
 */
export class AddLauncherHandler implements ServerMessageHandler {
  readonly messageKind = 'AddLauncher';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    return await context.addLauncher(payload as CustomContentSession);
  }
}

/**
 * Handler for RemoveLauncher message
 */
export class RemoveLauncherHandler implements ServerMessageHandler {
  readonly messageKind = 'RemoveLauncher';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    const { contentId } = payload as { contentId: string };
    return await context.removeLauncher(contentId);
  }
}

/**
 * Handler for TrackClientCondition message
 */
export class TrackClientConditionHandler implements ServerMessageHandler {
  readonly messageKind = 'TrackClientCondition';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    return await context.trackClientCondition(payload as TrackCondition);
  }
}

/**
 * Handler for UntrackClientCondition message
 */
export class UntrackClientConditionHandler implements ServerMessageHandler {
  readonly messageKind = 'UntrackClientCondition';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    const { conditionId } = payload as { conditionId: string };
    return await context.removeConditions([conditionId]);
  }
}

/**
 * Handler for StartConditionWaitTimer message
 */
export class StartConditionWaitTimerHandler implements ServerMessageHandler {
  readonly messageKind = 'StartConditionWaitTimer';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    return await context.startConditionWaitTimer(payload as ConditionWaitTimer);
  }
}

/**
 * Handler for CancelConditionWaitTimer message
 */
export class CancelConditionWaitTimerHandler implements ServerMessageHandler {
  readonly messageKind = 'CancelConditionWaitTimer';

  async handle(payload: unknown, context: ServerMessageHandlerContext): Promise<boolean> {
    return await context.cancelConditionWaitTimer(payload as ConditionWaitTimer);
  }
}
