import { ContentActionsItemType, RulesCondition, contentEndReason } from '@usertour/types';
import { evalCode } from '@usertour/helpers';
import { ErrorMessages } from '@/types/error-messages';
import { BaseActionHandler, ActionHandlerContext, ActionSource } from './action-handler.interface';

/**
 * Handler for common actions that all components support
 */
export class CommonActionHandler extends BaseActionHandler {
  protected readonly supportedActionTypes = [
    ContentActionsItemType.FLOW_START,
    ContentActionsItemType.JAVASCRIPT_EVALUATE,
    ContentActionsItemType.PAGE_NAVIGATE,
  ] as const;

  async handle(action: RulesCondition, context: ActionHandlerContext): Promise<void> {
    switch (action.type) {
      case ContentActionsItemType.FLOW_START:
        await context.startTour(action.data.contentId, { cvid: action.data.stepCvid });
        break;
      case ContentActionsItemType.JAVASCRIPT_EVALUATE:
        evalCode(action.data.value);
        break;
      case ContentActionsItemType.PAGE_NAVIGATE:
        context.handleNavigate(action.data);
        break;
    }
  }
}

/**
 * Handler for launcher-specific actions
 */
export class LauncherActionHandler extends BaseActionHandler {
  protected readonly supportedActionTypes = [ContentActionsItemType.LAUNCHER_DISMIS] as const;

  async handle(action: RulesCondition, context: ActionHandlerContext): Promise<void> {
    switch (action.type) {
      case ContentActionsItemType.LAUNCHER_DISMIS:
        await context.close(contentEndReason.ACTION_DISMISS);
        break;
    }
  }
}

/**
 * Handler for checklist-specific actions
 */
export class ChecklistActionHandler extends BaseActionHandler {
  protected readonly supportedActionTypes = [ContentActionsItemType.CHECKLIST_DISMIS] as const;

  async handle(action: RulesCondition, context: ActionHandlerContext): Promise<void> {
    switch (action.type) {
      case ContentActionsItemType.CHECKLIST_DISMIS:
        await context.close(contentEndReason.ACTION_DISMISS);
        break;
    }
  }
}

/**
 * Handler for tour-specific actions
 */
export class TourActionHandler extends BaseActionHandler {
  protected readonly supportedActionTypes = [
    ContentActionsItemType.STEP_GOTO,
    ContentActionsItemType.FLOW_DISMIS,
  ] as const;

  async handle(action: RulesCondition, context: ActionHandlerContext): Promise<void> {
    switch (action.type) {
      case ContentActionsItemType.STEP_GOTO:
        if (!context.showStepByCvid) {
          throw new Error(ErrorMessages.SHOW_STEP_BY_CVID_NOT_AVAILABLE);
        }
        await context.showStepByCvid(action.data.stepCvid);
        break;
      case ContentActionsItemType.FLOW_DISMIS: {
        // Determine reason based on context.source
        const reason =
          context.source === ActionSource.TRIGGER
            ? contentEndReason.TRIGGER_DISMISS
            : contentEndReason.ACTION_DISMISS;
        await context.close(reason);
        break;
      }
    }
  }
}
