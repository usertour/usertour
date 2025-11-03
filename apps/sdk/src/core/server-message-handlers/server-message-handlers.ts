import { CustomContentSession, TrackCondition, ConditionWaitTimer } from '@/types';
import {
  ServerMessageHandler,
  ServerMessageHandlerContext,
} from './server-message-handler.interface';

/**
 * Handler for SetFlowSession message
 */
export class SetFlowSessionHandler implements ServerMessageHandler {
  readonly messageKind = 'SetFlowSession';

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    return context.setFlowSession(payload as CustomContentSession);
  }
}

/**
 * Handler for ForceGoToStep message
 */
export class ForceGoToStepHandler implements ServerMessageHandler {
  readonly messageKind = 'ForceGoToStep';

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    const { sessionId, stepId } = payload as { sessionId: string; stepId: string };
    return context.forceGoToStep(sessionId, stepId);
  }
}

/**
 * Handler for UnsetFlowSession message
 */
export class UnsetFlowSessionHandler implements ServerMessageHandler {
  readonly messageKind = 'UnsetFlowSession';

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    const { sessionId } = payload as { sessionId: string };
    return context.unsetFlowSession(sessionId);
  }
}

/**
 * Handler for SetChecklistSession message
 */
export class SetChecklistSessionHandler implements ServerMessageHandler {
  readonly messageKind = 'SetChecklistSession';

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    return context.setChecklistSession(payload as CustomContentSession);
  }
}

/**
 * Handler for UnsetChecklistSession message
 */
export class UnsetChecklistSessionHandler implements ServerMessageHandler {
  readonly messageKind = 'UnsetChecklistSession';

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    const { sessionId } = payload as { sessionId: string };
    return context.unsetChecklistSession(sessionId);
  }
}

/**
 * Handler for ChecklistTaskCompleted message
 */
export class ChecklistTaskCompletedHandler implements ServerMessageHandler {
  readonly messageKind = 'ChecklistTaskCompleted';

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    const { taskId } = payload as { taskId: string };
    return context.getActivatedChecklist()?.addUnackedTask(taskId) ?? false;
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

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    const { contentId } = payload as { contentId: string };
    return context.removeLauncher(contentId);
  }
}

/**
 * Handler for TrackClientCondition message
 */
export class TrackClientConditionHandler implements ServerMessageHandler {
  readonly messageKind = 'TrackClientCondition';

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    return context.trackClientCondition(payload as TrackCondition);
  }
}

/**
 * Handler for UntrackClientCondition message
 */
export class UntrackClientConditionHandler implements ServerMessageHandler {
  readonly messageKind = 'UntrackClientCondition';

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    const { conditionId } = payload as { conditionId: string };
    return context.removeConditions([conditionId]);
  }
}

/**
 * Handler for StartConditionWaitTimer message
 */
export class StartConditionWaitTimerHandler implements ServerMessageHandler {
  readonly messageKind = 'StartConditionWaitTimer';

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    return context.startConditionWaitTimer(payload as ConditionWaitTimer);
  }
}

/**
 * Handler for CancelConditionWaitTimer message
 */
export class CancelConditionWaitTimerHandler implements ServerMessageHandler {
  readonly messageKind = 'CancelConditionWaitTimer';

  handle(payload: unknown, context: ServerMessageHandlerContext): boolean {
    return context.cancelConditionWaitTimer(payload as ConditionWaitTimer);
  }
}
