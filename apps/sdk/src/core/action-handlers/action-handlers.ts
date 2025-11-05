import { ContentActionsItemType, RulesCondition, contentEndReason } from '@usertour/types';
import { evalCode } from '@usertour/helpers';
import { BaseActionHandler } from './action-handler.interface';

/**
 * Handler for common actions that all components support
 */
export class CommonActionHandler extends BaseActionHandler {
  protected readonly supportedActionTypes = [
    ContentActionsItemType.FLOW_START,
    ContentActionsItemType.JAVASCRIPT_EVALUATE,
    ContentActionsItemType.PAGE_NAVIGATE,
  ] as const;

  async handle(action: RulesCondition, context: any): Promise<void> {
    switch (action.type) {
      case ContentActionsItemType.FLOW_START:
        await context.instance.startTour(action.data.contentId, { cvid: action.data.stepCvid });
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

  async handle(action: RulesCondition, context: any): Promise<void> {
    switch (action.type) {
      case ContentActionsItemType.LAUNCHER_DISMIS:
        await context.close(contentEndReason.USER_CLOSED);
        break;
    }
  }
}

/**
 * Handler for checklist-specific actions
 */
export class ChecklistActionHandler extends BaseActionHandler {
  protected readonly supportedActionTypes = [ContentActionsItemType.CHECKLIST_DISMIS] as const;

  async handle(action: RulesCondition, context: any): Promise<void> {
    switch (action.type) {
      case ContentActionsItemType.CHECKLIST_DISMIS:
        await context.close(contentEndReason.USER_CLOSED);
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

  async handle(action: RulesCondition, context: any): Promise<void> {
    switch (action.type) {
      case ContentActionsItemType.STEP_GOTO:
        await context.showStepByCvid(action.data.stepCvid);
        break;
      case ContentActionsItemType.FLOW_DISMIS:
        await context.handleDismiss(contentEndReason.USER_CLOSED);
        break;
    }
  }
}
