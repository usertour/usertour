import {
  ChecklistItemType,
  ContentEditorClickableElement,
  RulesType,
  ThemeTypesSetting,
  contentEndReason,
} from '@usertour/types';
import { ChecklistStore, BaseStore } from '@/types/store';
import { UsertourComponent } from '@/core/usertour-component';
import { logger } from '@/utils';
import { CommonActionHandler, ChecklistActionHandler } from '@/core/action-handlers';
import { StorageKeys, WidgetZIndex } from '@usertour-packages/constants';
import { isEqual, storage } from '@usertour/helpers';
import { hasConditionType } from './usertour-helper';

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
    const storeData = await this.buildStoreData();
    if (!storeData?.checklistData) {
      return;
    }
    // Process items to determine their status
    this.setStoreData(storeData);
    const expanded = this.isExpandable();
    await this.expand(expanded, expanded);
  }

  /**
   * Expands or collapses the checklist
   * @param expanded - Whether the checklist should be expanded or collapsed
   * @param reportEvent - Whether to report the expanded change event
   * @returns Promise that resolves when the state update is complete
   */
  async expand(expanded: boolean, reportEvent = true): Promise<void> {
    const store = this.getStoreData();
    const sessionId = this.getSessionId();
    if (!store) {
      return;
    }
    // If the expanded state is the same as the requested state, don't do anything
    if (store.expanded === expanded) {
      return;
    }
    // Update items animation when expanding the checklist
    if (expanded) {
      this.updateItemsAnimation();
    }
    // Update session storage
    this.setExpandedStateStorage(sessionId, expanded);
    // Update store to trigger component state change
    this.updateStore({ expanded, openState: true });
    // Report the expanded change event
    if (reportEvent) {
      await this.reportExpandedChangeEvent(expanded);
    }
  }

  /**
   * Checks if the checklist is expandable
   * @returns True if the checklist is expandable, false otherwise
   */
  isExpandable(): boolean {
    // Check session expand pending state first (lightweight check)
    if (this.session.isExpandPending()) {
      return true;
    }
    // Check storage state (lightweight check)
    if (this.getExpandedStateStorage(this.getSessionId())) {
      return true;
    }
    // Check unacked tasks last (more expensive operation)
    return this.hasUnackedTasks();
  }

  /**
   * Checks if the checklist is expanded
   * @returns True if the checklist is expanded, false otherwise
   */
  isExpanded(): boolean {
    return Boolean(this.getStoreData()?.expanded);
  }

  /**
   * Updates the items animation state and clears unacked tasks
   * This method updates the items animation state based on the unacked tasks
   * and then clears the unacked tasks
   */
  updateItemsAnimation(): void {
    const checklistData = this.getChecklistData();
    if (!checklistData) {
      return;
    }
    const items = checklistData.items;
    const unackedTasks = this.getUnackedTasks();
    const newChecklistData = {
      ...checklistData,
      items: items.map((item) => ({
        ...item,
        isShowAnimation: unackedTasks?.has(item.id) ?? false,
      })),
    };

    if (!isEqual(checklistData.items, newChecklistData.items)) {
      this.updateStore({ checklistData: newChecklistData });
    }
    this.clearUnackedTasks();
  }

  // === State Management ===
  /**
   * Checks if the checklist has any unacked tasks
   * This method checks the unacked tasks for the current session
   * @returns True if the checklist has any unacked tasks, false otherwise
   */
  private hasUnackedTasks(): boolean {
    // Check unacked tasks first to avoid unnecessary items retrieval
    const unackedTasks = this.getUnackedTasks();
    if (!unackedTasks || unackedTasks.size === 0) {
      return false;
    }
    // Get items and check if any unacked task exists in the current items
    // Optimize by checking directly without creating intermediate array
    const items = this.getItems();
    if (items.length === 0) {
      return false;
    }
    return items.some((item) => unackedTasks.has(item.id));
  }

  /**
   * Gets the items of the checklist
   * @returns The items of the checklist
   */
  private getItems(): ChecklistItemType[] {
    const checklistData = this.getChecklistData();
    if (!checklistData) {
      return [];
    }
    return checklistData.items;
  }

  // === Storage Management ===
  /**
   * Sets the expanded state in storage
   * @param sessionId - The session ID
   * @param expanded - Whether the checklist is expanded
   */
  private setExpandedStateStorage(sessionId: string, expanded: boolean): void {
    const key = `${StorageKeys.CHECKLIST_EXPANDED}-${sessionId}`;
    if (expanded) {
      storage.setSessionStorage(key, true);
    } else {
      storage.removeSessionStorage(key);
    }
  }

  /**
   * Gets the expanded state from storage
   * @param sessionId - The session ID
   * @returns The expanded state
   */
  private getExpandedStateStorage(sessionId: string): boolean {
    const key = `${StorageKeys.CHECKLIST_EXPANDED}-${sessionId}`;
    return (storage.getSessionStorage(key) as boolean | undefined) ?? false;
  }

  // === Store Management ===
  /**
   * Gets the z-index for the checklist component
   * @param themeSettings - The theme settings that may contain checklist z-index
   * @protected
   */
  protected getZIndex(themeSettings?: ThemeTypesSetting): number {
    const themeZIndex = themeSettings?.checklist?.zIndex;
    if (themeZIndex != null) {
      return themeZIndex;
    }
    return this.getBaseZIndex() + WidgetZIndex.CHECKLIST_OFFSET;
  }

  /**
   * Gets custom checklist store data
   * @param baseData - The base store data that can be used for custom logic
   * @protected
   */
  protected getCustomStoreData(_baseData: Partial<BaseStore> | null): Partial<ChecklistStore> {
    const checklistData = this.getChecklistData();
    return {
      checklistData,
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
    if (
      item.clickedActions.length > 0 &&
      !hasConditionType(item.completeConditions, RulesType.TASK_IS_CLICKED)
    ) {
      await this.expand(false);
    }
    // Handle actions after state update is complete
    await this.handleActions(item.clickedActions);
  }

  /**
   * Handles the open/close state change of the checklist.
   * Triggers the appropriate event based on the open state.
   * @param expanded - Whether the checklist is expanded
   */
  async handleExpandedChange(expanded: boolean): Promise<void> {
    await this.expand(expanded);
  }

  /**
   * Handles the dismiss event of the checklist
   */
  async handleDismiss() {
    await this.close(contentEndReason.USER_CLOSED);
  }

  /**
   * Handles the auto dismiss event of the checklist
   */
  async handleAutoDismiss() {
    await this.close(contentEndReason.AUTO_DISMISSED);
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
