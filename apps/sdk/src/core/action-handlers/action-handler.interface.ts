import { ContentActionsItemType, RulesCondition } from '@usertour/types';

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
   * @param context - The context object (component instance)
   * @returns Promise that resolves when the action is handled
   */
  handle(action: RulesCondition, context: any): Promise<void>;
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
  abstract handle(action: RulesCondition, context: any): Promise<void>;
}
