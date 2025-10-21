import {
  ChecklistInitialDisplay,
  ChecklistItemType,
  ContentActionsItemType,
  ContentEditorClickableElement,
  RulesCondition,
  ThemeTypesSetting,
  contentEndReason,
} from '@usertour/types';
import { evalCode, isEqual } from '@usertour/helpers';
import { ChecklistStore } from '@/types/store';
import { UsertourComponent } from '@/core/usertour-component';
import { UsertourTheme } from '@/core/usertour-theme';
import { logger } from '@/utils';
import { convertToAttributeEvaluationOptions } from '@/core/usertour-helper';
import { CHECKLIST_CLOSED } from '@usertour-packages/constants';

export class UsertourChecklist extends UsertourComponent<ChecklistStore> {
  // Tour-specific constants
  private static readonly Z_INDEX_OFFSET = 200;

  /**
   * Checks the tour
   */
  async check(): Promise<void> {
    try {
      await this.checkAndUpdateThemeSettings();
    } catch (error) {
      logger.error('Error in checklist checking:', error);
    }
  }

  /**
   * Shows the checklist by initializing its store data with closed state.
   * This method sets up the initial state of the checklist without displaying it.
   */
  async show() {
    const baseStoreData = await this.buildStoreData();
    const checklistData = this.getChecklistData();
    if (!baseStoreData || !checklistData) {
      return;
    }
    const initialDisplay = checklistData.initialDisplay;
    const expanded = initialDisplay === ChecklistInitialDisplay.EXPANDED;
    // Process items to determine their status
    const store = {
      ...baseStoreData,
      expanded,
      checklistData,
      openState: true,
    };
    this.setStoreData(store);
  }

  /**
   * Expands or collapses the checklist
   * @param isExpanded - Whether the checklist should be expanded or collapsed
   * @returns Promise that resolves when the state update is complete
   */
  expand(isExpanded: boolean) {
    const store = this.getStoreData();
    if (!store) {
      return;
    }
    // Check if the component is already in the target state
    if (store.expanded === isExpanded) {
      return;
    }
    // Update store to trigger component state change
    this.updateStore({
      expanded: isExpanded,
    });
  }

  /**
   * Refreshes the store data for the checklist
   */
  async refreshStore(): Promise<void> {
    const newStore = await this.buildStoreData();
    const checklistData = this.getChecklistData();
    const existingStore = this.getStoreData();
    if (!newStore || !existingStore || !checklistData) {
      return;
    }
    const { userAttributes, assets, globalStyle, themeSettings } = newStore;
    this.updateStore({
      checklistData,
      userAttributes,
      assets,
      globalStyle,
      themeSettings,
    });
  }

  /**
   *
   * Handles click events on content editor elements.
   * Processes button clicks and executes associated actions.
   *
   * @param {ContentEditorClickableElement} element - The clicked element with its type and data
   */
  handleOnClick = async ({ type, data }: ContentEditorClickableElement) => {
    if (type === 'button' && data.actions) {
      await this.handleActions(data.actions);
    }
  };

  /**
   * Handles the click event of a checklist item
   * @param item - The checklist item that was clicked
   */
  async handleItemClick(item: ChecklistItemType) {
    // Report the task click event
    await this.reportTaskClickEvent(item);
    // Handle actions after state update is complete
    await this.handleActions(item.clickedActions);
  }

  /**
   * Reports the open/close event of the checklist.
   * @param {boolean} open - Whether the checklist is open
   */
  async reportExpandedChangeEvent(expanded: boolean) {
    if (expanded) {
      await this.reportSeenEvent();
    } else {
      await this.reportHiddenEvent();
    }
  }

  /**
   * Handles the open/close state change of the checklist.
   * Triggers the appropriate event based on the open state.
   * @param {boolean} expanded - Whether the checklist is expanded
   */
  handleExpandedChange(expanded: boolean) {
    this.updateStore({
      expanded,
    });
  }

  /**
   * Handles the dismiss event of the checklist
   */
  async handleDismiss() {
    await this.close(contentEndReason.USER_CLOSED);
  }

  /**
   * Closes the checklist
   * @param reason - The reason for closing the checklist
   */
  async close(reason: contentEndReason = contentEndReason.SYSTEM_CLOSED) {
    // Set the checklist as dismissed
    // Hide the checklist
    this.hide();
    // Destroy the checklist
    this.destroy();
    // Trigger the checklist closed event
    this.trigger(CHECKLIST_CLOSED, { sessionId: this.getSessionId() });
    // Report the dismiss event
    await this.reportDismissEvent(reason);
  }

  /**
   * Gets theme settings from session
   * @private
   */
  private async getThemeSettings(): Promise<ThemeTypesSetting | null> {
    const theme = this.getVersionTheme();
    if (!theme) {
      return null;
    }
    return await UsertourTheme.getThemeSettings(theme);
  }

  /**
   * Builds the store data for the checklist
   * This method combines the base store info with the current step data
   * and sets default values for required fields
   *
   * @returns {TourStoreChecklistStore} The complete store data object
   */
  async buildStoreData(): Promise<ChecklistStore | null> {
    const themeSettings = await this.getThemeSettings();
    if (!themeSettings) {
      return null;
    }

    const themeData = UsertourTheme.createThemeData(themeSettings);
    const contentSession = this.getSessionAttributes();
    const { userAttributes } = convertToAttributeEvaluationOptions(contentSession);
    const removeBranding = this.isRemoveBranding();
    const zIndex = this.getCalculatedZIndex();

    // Combine all store data with proper defaults
    return {
      removeBranding,
      ...themeData,
      userAttributes,
      openState: false,
      zIndex,
      expanded: false,
    } as ChecklistStore;
  }

  /**
   * Checks if theme has changed and updates theme settings if needed
   */
  private async checkAndUpdateThemeSettings() {
    const themeSettings = await this.getThemeSettings();
    if (!themeSettings) {
      return;
    }

    // Get current theme settings from store
    const currentStore = this.getStoreData();
    const currentThemeSettings = currentStore?.themeSettings;

    if (isEqual(currentThemeSettings, themeSettings)) {
      return;
    }

    // Update theme settings in store
    this.updateStore({ themeSettings });
  }

  /**
   * Calculates the z-index for the checklist
   * @private
   */
  private getCalculatedZIndex(): number {
    const baseZIndex = this.instance.getBaseZIndex() ?? 0;
    return baseZIndex + UsertourChecklist.Z_INDEX_OFFSET;
  }

  /**
   * Handles the actions for the current step
   * This method executes all actions in sequence
   *
   * @param actions - The actions to be handled
   */
  async handleActions(actions: RulesCondition[]) {
    // Separate actions by type
    const pageNavigateActions = actions.filter(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    const otherActions = actions.filter(
      (action) => action.type !== ContentActionsItemType.PAGE_NAVIGATE,
    );

    // Execute other actions first, then navigation actions
    await this.executeActions(otherActions);
    await this.executeActions(pageNavigateActions);
  }

  /**
   * Executes all actions in sequence
   * @private
   */
  private async executeActions(actions: RulesCondition[]) {
    for (const action of actions) {
      await this.executeAction(action);
    }
  }

  /**
   * Executes a single action
   * @private
   */
  private async executeAction(action: RulesCondition) {
    switch (action.type) {
      case ContentActionsItemType.FLOW_START:
        await this.instance.startTour(action.data.contentId, { cvid: action.data.stepCvid });
        break;
      case ContentActionsItemType.CHECKLIST_DISMIS:
        await this.close(contentEndReason.USER_CLOSED);
        break;
      case ContentActionsItemType.JAVASCRIPT_EVALUATE:
        evalCode(action.data.value);
        break;
      case ContentActionsItemType.PAGE_NAVIGATE:
        this.instance.handleNavigate(action.data);
        break;
    }
  }

  /**
   * Resets the tour
   */
  reset() {
    this.setStoreData(undefined);
  }

  /**
   * Destroys the tour
   */
  destroy() {
    this.stopChecking();
    this.reset();
  }
  /**
   * Reports the checklist dismiss event.
   */
  private async reportDismissEvent(reason: contentEndReason = contentEndReason.USER_CLOSED) {
    await this.socketService.endContent({
      sessionId: this.getSessionId(),
      reason: reason.toString(),
    });
  }

  /**
   * Reports the checklist seen event.
   */
  private async reportSeenEvent() {
    await this.socketService.showChecklist(
      {
        sessionId: this.getSessionId(),
      },
      { batch: true },
    );
  }

  /**
   * Reports the checklist hidden event.
   */
  private async reportHiddenEvent() {
    await this.socketService.hideChecklist(
      {
        sessionId: this.getSessionId(),
      },
      { batch: true },
    );
  }

  /**
   * Reports the checklist task click event.
   * @param {ChecklistItemType} item - The clicked checklist item
   */
  private async reportTaskClickEvent(item: ChecklistItemType) {
    await this.socketService.clickChecklistTask(
      {
        sessionId: this.getSessionId(),
        taskId: item.id,
      },
      { batch: true },
    );
  }
}
