import {
  ContentActionsItemType,
  RulesCondition,
  contentEndReason,
  UserTourTypes,
} from '@usertour/types';

/**
 * Action source - indicates where the action was triggered from
 */
export enum ActionSource {
  // User clicked a button that has actions configured
  BUTTON = 'button',
  // StepTrigger condition met, actions executed automatically
  TRIGGER = 'trigger',
}

/**
 * Context object passed to action handlers
 * Provides access to component methods and metadata needed by handlers
 */
export interface ActionHandlerContext {
  /**
   * The source of the action (button click or trigger)
   */
  source: ActionSource;
  /**
   * Starts a tour with given content ID
   */
  startTour: (contentId: string, opts?: UserTourTypes.StartOptions) => Promise<void>;
  /**
   * Handles the navigation
   */
  handleNavigate: (data: any) => void;
  /**
   * Closes the component with the specified reason
   */
  close: (reason: contentEndReason) => Promise<void>;
  /**
   * Shows a step by cvid (Tour-specific)
   */
  showStepByCvid?: (stepCvid: string) => Promise<void>;
}

/**
 * Interface for handling specific action types
 */
export interface ActionHandler {
  /**
   * Check if this handler can handle the given action type
   * @param actionType - The action type to check
   * @returns true if this handler can handle the action type
   */
  canHandle(actionType: ContentActionsItemType): boolean;

  /**
   * Handle the action
   * @param action - The action to handle
   * @param context - The context object with component methods and source
   * @returns Promise that resolves when the action is handled
   */
  handle(action: RulesCondition, context: ActionHandlerContext): Promise<void>;
}

/**
 * Base class for action handlers with common functionality
 */
export abstract class BaseActionHandler implements ActionHandler {
  /**
   * The action types this handler can handle
   */
  protected abstract readonly supportedActionTypes: readonly ContentActionsItemType[];

  /**
   * Check if this handler can handle the given action type
   */
  canHandle(actionType: ContentActionsItemType): boolean {
    return this.supportedActionTypes.includes(actionType);
  }

  /**
   * Handle the action - must be implemented by subclasses
   */
  abstract handle(action: RulesCondition, context: ActionHandlerContext): Promise<void>;
}
