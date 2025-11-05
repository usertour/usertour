import { ContentActionsItemType, RulesCondition } from '@usertour/types';
import { ActionHandler, ActionHandlerContext } from './action-handler.interface';

/**
 * Manages action handlers and executes actions
 */
export class ActionManager {
  private handlers: ActionHandler[] = [];

  /**
   * Register an action handler
   * @param handler - The handler to register
   */
  registerHandler(handler: ActionHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Register multiple action handlers
   * @param handlers - Array of handlers to register
   */
  registerHandlers(handlers: ActionHandler[]): void {
    this.handlers.push(...handlers);
  }

  /**
   * Clear all registered handlers
   */
  clearHandlers(): void {
    this.handlers = [];
  }

  /**
   * Handle a list of actions
   * @param actions - The actions to handle
   * @param context - The context object with component methods
   */
  async handleActions(actions: RulesCondition[], context: ActionHandlerContext): Promise<void> {
    // Separate actions by type
    const pageNavigateActions = actions.filter(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    const otherActions = actions.filter(
      (action) => action.type !== ContentActionsItemType.PAGE_NAVIGATE,
    );

    // Execute other actions first, then navigation actions
    await this.executeActions(otherActions, context);
    await this.executeActions(pageNavigateActions, context);
  }

  /**
   * Execute a list of actions in sequence
   * @param actions - The actions to execute
   * @param context - The context object with component methods
   */
  private async executeActions(
    actions: RulesCondition[],
    context: ActionHandlerContext,
  ): Promise<void> {
    for (const action of actions) {
      await this.executeAction(action, context);
    }
  }

  /**
   * Execute a single action
   * @param action - The action to execute
   * @param context - The context object with component methods
   */
  private async executeAction(
    action: RulesCondition,
    context: ActionHandlerContext,
  ): Promise<void> {
    const handler = this.findHandler(action.type as ContentActionsItemType);
    if (handler) {
      await handler.handle(action, context);
    } else {
      console.warn(`No handler found for action type: ${action.type}`);
    }
  }

  /**
   * Find a handler that can handle the given action type
   * @param actionType - The action type to find a handler for
   * @returns The handler that can handle the action type, or undefined if none found
   */
  private findHandler(actionType: ContentActionsItemType): ActionHandler | undefined {
    return this.handlers.find((handler) => handler.canHandle(actionType));
  }
}
