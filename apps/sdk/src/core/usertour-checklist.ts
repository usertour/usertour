import {
  ChecklistInitialDisplay,
  ChecklistItemType,
  ContentEditorClickableElement,
  ThemeTypesSetting,
  contentEndReason,
} from '@usertour/types';
import { ChecklistStore } from '@/types/store';
import { UsertourComponent } from '@/core/usertour-component';
import { UsertourTheme } from '@/core/usertour-theme';
import { logger } from '@/utils';
import { convertToAttributeEvaluationOptions } from '@/core/usertour-helper';
import { CommonActionHandler, ChecklistActionHandler } from '@/core/action-handlers';

export class UsertourChecklist extends UsertourComponent<ChecklistStore> {
  /**
   * Initialize action handlers for checklist
   */
  protected initializeActionHandlers(): void {
    this.registerActionHandlers([new CommonActionHandler(), new ChecklistActionHandler()]);
  }

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
   * Gets custom checklist store data
   * @protected
   */
  protected getCustomStoreData(): Partial<ChecklistStore> {
    const checklistData = this.getChecklistData();
    if (!checklistData) {
      return {};
    }
    return { checklistData };
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
   * Gets theme settings from session
   * @protected
   */
  protected async getThemeSettings(): Promise<ThemeTypesSetting | null> {
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
