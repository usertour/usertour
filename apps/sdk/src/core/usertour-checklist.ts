import {
  ChecklistItemType,
  ContentEditorClickableElement,
  contentEndReason,
} from '@usertour/types';
import { ChecklistStore, BaseStore } from '@/types/store';
import { UsertourComponent } from '@/core/usertour-component';
import { logger } from '@/utils';
import { CommonActionHandler, ChecklistActionHandler } from '@/core/action-handlers';
import { StorageKeys, WidgetZIndex } from '@usertour-packages/constants';
import { storage } from '@usertour/helpers';

export class UsertourChecklist extends UsertourComponent<ChecklistStore> {
  // === Private Properties ===
  private taskIsUnacked = new Set<string>();

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
    // Process items to determine their status
    this.setStoreData(baseStoreData);
    // Expand the checklist if it is expanded
    const expanded = this.isExpanded();
    const isExpandPending = this.session.isExpandPending();
    const reportEvent = expanded && isExpandPending;
    //If expanded, report the expanded change event, otherwise don't report
    await this.expand(expanded, reportEvent);
  }

  /**
   * Gets the expanded state of the checklist
   * @returns The expanded state of the checklist
   */
  isExpanded(): boolean {
    const isExpandPending = this.session.isExpandPending();
    const isExpandedStorage = this.getExpandedStateStorage(this.getSessionId());

    return Boolean(isExpandPending || isExpandedStorage);
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
   * @param expanded - Whether the checklist should be expanded or collapsed
   * @returns Promise that resolves when the state update is complete
   */
  async expand(expanded: boolean, reportEvent = false): Promise<void> {
    const store = this.getStoreData();
    const sessionId = this.getSessionId();
    if (!store) {
      return;
    }
    // If the expanded state is the same as the requested state, don't do anything
    if (store.expanded === expanded) {
      return;
    }
    // Clear unacked tasks when expanding
    if (expanded) {
      this.clearUnackedTasks();
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
   * Gets custom checklist store data
   * @param baseData - The base store data that can be used for custom logic
   * @protected
   */
  protected getCustomStoreData(baseData: Partial<BaseStore> | null): Partial<ChecklistStore> {
    const checklistData = this.getChecklistData();
    const zIndex =
      baseData?.themeSettings?.checklist?.zIndex ||
      (baseData?.zIndex ? baseData?.zIndex + WidgetZIndex.CHECKLIST_OFFSET : undefined);

    return {
      checklistData,
      ...(zIndex ? { zIndex } : {}),
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
  async handleExpandedChange(expanded: boolean): Promise<void> {
    await this.expand(expanded, true);
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

  // === Unacked Tasks Management ===
  /**
   * Adds a task ID to the unacked tasks set
   * @param taskId - The task ID to add
   * @returns True if the task was added successfully
   */
  addUnackedTask(taskId: string): boolean {
    this.taskIsUnacked.add(taskId);
    return true;
  }

  /**
   * Checks if there are any unacked tasks
   * @returns True if there are unacked tasks, false otherwise
   */
  hasUnackedTasks(): boolean {
    return (
      this.taskIsUnacked.size > 0 && this.getItems().some((item) => this.taskIsUnacked.has(item.id))
    );
  }

  /**
   * Clears all unacked tasks that belong to this checklist
   */
  private clearUnackedTasks(): void {
    const items = this.getItems();
    for (const item of items) {
      if (this.taskIsUnacked.has(item.id)) {
        this.taskIsUnacked.delete(item.id);
      }
    }
  }

  // === Lifecycle Hooks ===

  /**
   * Checklist-specific reset logic
   * @protected
   */
  protected onReset(): void {
    // Clear all unacked tasks
    this.clearUnackedTasks();
  }
}
