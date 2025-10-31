import {
  ChecklistInitialDisplay,
  ChecklistItemType,
  ContentEditorClickableElement,
  contentEndReason,
} from '@usertour/types';
import { ChecklistStore, BaseStore } from '@/types/store';
import { UsertourComponent } from '@/core/usertour-component';
import { logger } from '@/utils';
import { CommonActionHandler, ChecklistActionHandler } from '@/core/action-handlers';
import { CHECKLIST_EXPANDED_CHANGE } from '@usertour-packages/constants';

export class UsertourChecklist extends UsertourComponent<ChecklistStore> {
  // === Abstract Methods Implementation ===
  /**
   * Initialize action handlers for checklist
   */
  protected initializeActionHandlers(): void {
    this.registerActionHandlers([new CommonActionHandler(), new ChecklistActionHandler()]);
  }

  /**
   * Checks the checklist
   */
  async check(): Promise<void> {
    try {
      await this.checkAndUpdateThemeSettings();
    } catch (error) {
      logger.error('Error in checklist checking:', error);
    }
  }

  // === Public API Methods ===
  /**
   * Shows the checklist by initializing its store data with closed state.
   * This method sets up the initial state of the checklist without displaying it.
   */
  async show() {
    const baseStoreData = await this.buildStoreData();
    if (!baseStoreData?.checklistData) {
      return;
    }
    const initialDisplay = baseStoreData?.checklistData.initialDisplay;
    const expanded = initialDisplay === ChecklistInitialDisplay.EXPANDED;
    // Process items to determine their status
    const store = {
      ...baseStoreData,
      expanded,
      openState: true,
    };
    this.setStoreData(store);
  }

  /**
   * Gets the initial display of the checklist
   * @returns The initial display of the checklist
   */
  isInitialDisplayExpanded(): boolean {
    return this.getStoreData()?.checklistData?.initialDisplay === ChecklistInitialDisplay.EXPANDED;
  }

  /**
   * Gets the items of the checklist
   * @returns The items of the checklist
   */
  getItems(): ChecklistItemType[] {
    const checklistData = this.getChecklistData();
    if (!checklistData) {
      return [];
    }
    return checklistData.items;
  }

  /**
   * Expands or collapses the checklist
   * @param isExpanded - Whether the checklist should be expanded or collapsed
   * @returns Promise that resolves when the state update is complete
   */
  expand(expanded: boolean) {
    const store = this.getStoreData();
    if (!store) {
      return;
    }
    // Check if the component is already in the target state
    if (store.expanded === expanded) {
      return;
    }
    const sessionId = this.getSessionId();
    this.trigger(CHECKLIST_EXPANDED_CHANGE, { expanded, sessionId });
    // Update store to trigger component state change
    this.updateStore({ expanded });
  }

  // === Store Management ===
  /**
   * Gets custom checklist store data
   * @param baseData - The base store data that can be used for custom logic
   * @protected
   */
  protected getCustomStoreData(baseData: Partial<BaseStore> | null): Partial<ChecklistStore> {
    const checklistData = this.getChecklistData();
    const zIndex = baseData?.themeSettings?.checklist?.zIndex ?? baseData?.zIndex;
    return {
      checklistData,
      ...(zIndex ? { zIndex: zIndex + 100 } : {}),
    };
  }

  // === Event Handlers ===
  /**
   * Handles click events on content editor elements.
   * Processes button clicks and executes associated actions.
   *
   * @param element - The clicked element with its type and data
   */
  async handleOnClick(element: ContentEditorClickableElement) {
    const { type, data } = element;
    if (type === 'button' && data.actions) {
      await this.handleActions(data.actions);
    }
  }

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
   * Handles the open/close state change of the checklist.
   * Triggers the appropriate event based on the open state.
   * @param expanded - Whether the checklist is expanded
   */
  handleExpandedChange(expanded: boolean) {
    this.expand(expanded);
  }

  /**
   * Handles the dismiss event of the checklist
   */
  async handleDismiss() {
    await this.close(contentEndReason.USER_CLOSED);
  }

  // === Event Reporting ===
  /**
   * Reports the open/close event of the checklist.
   * @param expanded - Whether the checklist is expanded
   */
  async reportExpandedChangeEvent(expanded: boolean) {
    if (expanded) {
      await this.reportSeenEvent();
    } else {
      await this.reportHiddenEvent();
    }
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
   * @param item - The clicked checklist item
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
