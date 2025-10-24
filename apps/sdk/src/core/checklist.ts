import { ContentEditorClickableElement } from '@usertour-packages/shared-editor';
import {
  BizEvents,
  ChecklistInitialDisplay,
  ChecklistItemType,
  ContentActionsItemType,
  contentEndReason,
  EventAttributes,
  RulesCondition,
} from '@usertour/types';
import { evalCode } from '@usertour/helpers';
import { checklistIsDimissed } from '../utils/conditions';
import { BaseContent } from './base-content';
import {
  checklistItemIsCompleted,
  getChecklistInitialDisplay,
  processChecklistItems,
  isSendChecklistCompletedEvent,
  checklistHasNewCompletedItems,
  baseStoreInfoIsChanged,
  checklistHasShowAnimationItems,
} from '../utils/content-utils';
import { ChecklistStore } from '../types/store';

export class Checklist extends BaseContent<ChecklistStore> {
  private hasPendingCompletedItems = false; // Track if there are pending completed items to expand

  /**
   * Monitors the checklist state and updates its visibility.
   * This method:
   * 1. Activates content conditions
   * 2. Monitors item conditions
   * 3. Handles visibility state based on checklist status
   */
  async monitor() {
    // Activate content conditions first
    await this.activeContentConditions();

    if (this.isActiveChecklist()) {
      // Handle item conditions
      await this.handleItemConditions();

      // Update visibility state based on checklist status
      this.handleVisibilityState();

      // Check and update theme settings if needed
      await this.checkAndUpdateThemeSettings();
    }
  }

  /**
   * Retrieves the session ID for a checklist that can be reused.
   * A session can be reused if:
   * 1. The checklist has valid data and a latest session
   * 2. The checklist has not been dismissed
   *
   * @returns The session ID if reusable, null otherwise
   */
  getReusedSessionId(): string | null {
    const checklistContent = this.getContent();

    // Early return if no content or missing required data
    if (!checklistContent?.data || !checklistContent?.latestSession) {
      return null;
    }

    // Early return if checklist has been dismissed
    if (checklistIsDimissed(checklistContent.latestSession)) {
      return null;
    }

    return checklistContent.latestSession.id;
  }

  /**
   * Handles the visibility state of the checklist.
   * This method:
   * 1. Checks if checklist has started and not been dismissed
   * 2. Manages visibility based on temporary hidden state
   * 3. Triggers first seen event when checklist becomes visible
   */
  private handleVisibilityState() {
    // Return early if checklist hasn't started or has been dismissed
    if (!this.hasStarted()) {
      return;
    }

    // Handle temporarily hidden state
    if (this.isTemporarilyHidden()) {
      if (this.isOpen()) {
        this.hide();
      }
      this.unsetActiveChecklist();
      return;
    }

    // Show checklist if it's not already open
    if (!this.isOpen()) {
      this.open();
    }
  }

  /**
   * Shows the checklist by initializing its store data with closed state.
   * This method sets up the initial state of the checklist without displaying it.
   */
  async show() {
    const baseStoreData = await this.getBaseStoreData();
    const content = this.getContent();
    if (!baseStoreData || !content) {
      return;
    }
    const initialDisplay = getChecklistInitialDisplay(content);
    const expanded = initialDisplay === ChecklistInitialDisplay.EXPANDED;
    // Process items to determine their status
    const { items } = await processChecklistItems(content);
    const store = {
      ...baseStoreData,
      expanded,
      checklistData: {
        ...content.data,
        items,
      },
    };
    this.setStore(store);
  }

  /**
   * Expands or collapses the checklist
   * @param isExpanded - Whether the checklist should be expanded or collapsed
   * @returns Promise that resolves when the state update is complete
   */
  expand(isExpanded: boolean) {
    const store = this.getStore().getSnapshot();
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
   * Refreshes the checklist data while maintaining its current open/closed state.
   * This method updates the store with fresh data without changing visibility.
   * Only updates the store if there are actual changes to prevent unnecessary re-renders.
   */
  async refresh() {
    const currentStore = this.getStore().getSnapshot();
    const baseStoreData = await this.getBaseStoreData();
    if (!baseStoreData || !currentStore) {
      return;
    }
    // Create the new store data to compare
    const { userInfo, assets, globalStyle, themeSettings, zIndex } = baseStoreData;
    if (baseStoreInfoIsChanged(currentStore, baseStoreData)) {
      this.updateStore({
        userInfo,
        assets,
        globalStyle,
        themeSettings,
        zIndex,
      });
    }
  }

  /**
   * Builds the store data for the checklist.
   * This method:
   * 1. Gets base information and content data
   * 2. Processes checklist items with their completion and visibility states
   * 3. Returns a complete store data object with default values
   */
  private async getBaseStoreData(): Promise<Omit<ChecklistStore, 'checklistData'> | undefined> {
    // Get base information and content
    const baseInfo = await this.getStoreBaseInfo();
    const zIndex = baseInfo?.themeSettings?.checklist?.zIndex || this.getBaseZIndex();
    if (!baseInfo) {
      return undefined;
    }

    // Return complete store data
    return {
      ...baseInfo,
      openState: false,
      expanded: false,
      zIndex: zIndex + 100,
    };
  }

  /**
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
   * Processes a list of actions for the checklist.
   * Supported actions:
   * - Start a new tour
   * - Navigate to a page
   * - Evaluate JavaScript code
   * - Dismiss the checklist
   *
   * @param {RulesCondition[]} actions - List of actions to process
   */
  async handleActions(actions: RulesCondition[]) {
    // Split actions into two groups
    const pageNavigateActions = actions.filter(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    const otherActions = actions.filter(
      (action) => action.type !== ContentActionsItemType.PAGE_NAVIGATE,
    );

    // Execute non-PAGE_NAVIGATE actions first
    for (const action of otherActions) {
      if (action.type === ContentActionsItemType.FLOW_START) {
        await this.startNewContent(action.data.contentId, action.data.stepCvid);
      } else if (action.type === ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        evalCode(action.data.value);
      } else if (action.type === ContentActionsItemType.CHECKLIST_DISMIS) {
        await this.close(contentEndReason.USER_CLOSED);
      }
    }

    // Execute PAGE_NAVIGATE actions last
    for (const action of pageNavigateActions) {
      this.handleNavigate(action.data);
    }
  }

  /**
   * Updates the clicked state of a specific checklist item in the store.
   * @param {string} itemId - The ID of the item to update
   */
  private updateItemClickedState(itemId: string) {
    const checklistData = this.getStore()?.getSnapshot()?.checklistData;
    if (!checklistData) return;

    const updatedItems = checklistData.items.map((storeItem) =>
      storeItem.id === itemId ? { ...storeItem, isClicked: true } : storeItem,
    );

    this.updateStore({
      checklistData: {
        ...checklistData,
        items: updatedItems,
      },
    });
  }

  /**
   * Checks if a checklist item is completed
   * @param item - The checklist item to check
   * @returns True if the item is completed, false otherwise
   */
  async itemIsCompleted(item: ChecklistItemType) {
    const { items } = await processChecklistItems(this.getContent());
    return items.find((i) => i.id === item.id)?.isCompleted || false;
  }

  /**
   * Handles the click event of a checklist item
   * @param item - The checklist item that was clicked
   */
  async handleItemClick(item: ChecklistItemType) {
    // Update item clicked state in store
    this.updateItemClickedState(item.id);

    //report event
    await this.reportTaskClickEvent(item);

    const itemIsCompleted = await this.itemIsCompleted(item);
    if (!itemIsCompleted && this.isExpanded()) {
      this.expand(false);
      await this.reportExpandedChangeEvent(false);
    }

    //handle actions after state update is complete
    await this.handleActions(item.clickedActions);
  }

  /**
   * Handles the conditions of checklist items.
   * This method:
   * 1. Checks completion and visibility conditions for each item
   * 2. Updates item status and store if changes are detected
   * 3. Triggers appropriate events for completed items and checklist
   * 4. Updates initialDisplay to EXPANDED when there are new completed items
   * 5. Expands the checklist if there are new completed items
   * 6. Reports the expanded event
   * 7. Reports the checklist completed event
   * 8. Closes the checklist if it is auto-dismissed
   */
  async handleItemConditions() {
    // Get content and validate
    const content = this.getContent();
    const snapshot = this.getStore()?.getSnapshot();
    if (!snapshot) {
      return;
    }
    const checklistData = snapshot.checklistData;

    // Process items to determine their status
    const { items, hasChanges } = await processChecklistItems(content);
    // Check if we need to update initialDisplay to EXPANDED
    const shouldExpand = this.shouldExpandForNewCompletedItems(items, checklistData.items);
    // Update store if there are changes or if we need to expand
    if (hasChanges) {
      this.updateStore({
        checklistData: {
          ...checklistData,
          items,
        },
      });
    }

    // Expand the checklist if there are new completed items
    if (shouldExpand && !this.isExpanded()) {
      this.expand(true);
      // Delay reporting the expanded event to give animation time to complete
      setTimeout(async () => {
        await this.reportExpandedChangeEvent(true);
      }, 200);
    }

    // Trigger completion events
    for (const item of items) {
      if (item.isCompleted && !checklistItemIsCompleted(content.latestSession?.bizEvent, item)) {
        await this.reportTaskCompleteEvent(item);
      }
    }

    // Check if all items are completed
    if (isSendChecklistCompletedEvent(items, content.latestSession)) {
      await this.reportChecklistEvent(BizEvents.CHECKLIST_COMPLETED);
      if (this.isAutoDismissChecklist()) {
        await this.close(contentEndReason.AUTO_DISMISSED);
      }
    }
  }

  private isAutoDismissChecklist() {
    return this.getContent()?.data?.autoDismissChecklist ?? false;
  }

  /**
   * Checks if there are new completed items and handles tour conflict
   * @param currentItems - Current checklist items
   * @param previousItems - Previous checklist items
   */
  private shouldExpandForNewCompletedItems(
    currentItems: ChecklistItemType[],
    previousItems: ChecklistItemType[],
  ): boolean {
    // First check if there are pending completed items from previous tour conflicts
    if (this.hasPendingCompletedItems) {
      if (!this.getActiveTour()) {
        // No active tour, safe to expand
        this.hasPendingCompletedItems = false;
        return true;
      }
      // Still has active tour, keep pending
      return false;
    }

    // Check if there are show animation items
    const hasShowAnimationItems = checklistHasShowAnimationItems(currentItems);
    // Check if there are new completed items
    const hasNewCompletedItems = checklistHasNewCompletedItems(currentItems, previousItems);
    // Check if there are show animation items or new completed items
    const shouldExpand = hasShowAnimationItems || hasNewCompletedItems;

    if (shouldExpand) {
      // Check if there's an active tour that would prevent immediate expansion
      if (this.getActiveTour()) {
        // Store the state to expand later when tour closes
        this.hasPendingCompletedItems = true;
        return false; // Don't expand immediately
      }
    }

    return shouldExpand;
  }

  /**
   * Checks if the checklist is active
   */
  isActiveChecklist() {
    return this.getActiveChecklist() === this;
  }

  /**
   * Closes the checklist
   * @param reason - The reason for closing the checklist
   */
  async close(reason: contentEndReason = contentEndReason.SYSTEM_CLOSED) {
    // Set the checklist as dismissed
    this.setDismissed(true);
    // Set the checklist as not started
    this.setStarted(false);
    // Hide the checklist
    this.hide();
    // Report the dismiss event
    await this.reportDismissEvent(reason);
    // Destroy the checklist
    this.destroy();
  }

  /**
   * Handles the dismiss event of the checklist
   */
  async handleDismiss() {
    await this.close(contentEndReason.USER_CLOSED);
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
   * Checks if the checklist is expanded
   */
  isExpanded() {
    return this.getStore().getSnapshot()?.expanded ?? false;
  }

  /**
   * Destroys the checklist instance and resets its store.
   * Unsets the active checklist if this is the current one.
   */
  destroy() {
    if (this.isActiveChecklist()) {
      this.unsetActiveChecklist();
    }
    this.setStore(undefined);
  }

  /**
   * Resets the checklist state. (Currently a placeholder for future logic)
   */
  reset() {}

  /**
   * Checks if the checklist is default expanded
   */
  defaultIsExpanded() {
    const content = this.getContent();
    return content?.data?.initialDisplay === ChecklistInitialDisplay.EXPANDED;
  }

  /**
   * Initializes event listeners for checklist lifecycle and item events.
   */
  initializeEventListeners() {}

  /**
   * Ends the latest session
   * @param reason - The reason for ending the session
   */
  async endLatestSession(reason: contentEndReason) {
    const content = this.getContent();
    const sessionId = this.getReusedSessionId();
    if (!sessionId) {
      return;
    }
    const baseEventData = {
      [EventAttributes.CHECKLIST_ID]: content.contentId,
      [EventAttributes.CHECKLIST_VERSION_NUMBER]: content.sequence,
      [EventAttributes.CHECKLIST_VERSION_ID]: content.id,
      [EventAttributes.CHECKLIST_NAME]: content.name,
      [EventAttributes.CHECKLIST_END_REASON]: reason,
    };

    await this.reportEventWithSession({
      sessionId,
      eventName: BizEvents.CHECKLIST_DISMISSED,
      eventData: {
        ...baseEventData,
      },
    });
  }

  /**
   * Reports a checklist event with session and additional data.
   * @param {BizEvents} eventName - The event name
   * @param {Partial<Record<EventAttributes, any>>} additionalData - Additional event data
   * @param {ReportEventOptions} options - Reporting options
   */
  private async reportChecklistEvent(
    eventName: BizEvents,
    additionalData: Partial<Record<EventAttributes, any>> = {},
  ) {
    const content = this.getContent();
    const baseEventData = {
      [EventAttributes.CHECKLIST_ID]: content.contentId,
      [EventAttributes.CHECKLIST_VERSION_NUMBER]: content.sequence,
      [EventAttributes.CHECKLIST_VERSION_ID]: content.id,
      [EventAttributes.CHECKLIST_NAME]: content.name,
    };

    await this.reportEventWithSession({
      eventName,
      eventData: {
        ...baseEventData,
        ...additionalData,
      },
    });
  }

  /**
   * Reports the checklist dismiss event.
   */
  private async reportDismissEvent(reason: contentEndReason = contentEndReason.USER_CLOSED) {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_DISMISSED, {
      [EventAttributes.CHECKLIST_END_REASON]: reason,
    });
  }

  /**
   * Reports the checklist seen event.
   */
  private async reportSeenEvent() {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_SEEN);
  }

  /**
   * Reports the checklist hidden event.
   */
  private async reportHiddenEvent() {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_HIDDEN);
  }

  /**
   * Handle additional logic after content is shown
   * @param isNewSession - Whether this is a new session
   */
  async handleAfterShow(isNewSession?: boolean) {
    // Only handle additional logic for new sessions
    if (isNewSession && this.defaultIsExpanded()) {
      await this.reportSeenEvent();
    }
  }

  /**
   * Reports the checklist task click event.
   * @param {ChecklistItemType} item - The clicked checklist item
   */
  private async reportTaskClickEvent(item: ChecklistItemType) {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_TASK_CLICKED, {
      [EventAttributes.CHECKLIST_TASK_ID]: item.id,
      [EventAttributes.CHECKLIST_TASK_NAME]: item.name,
    });
  }

  /**
   * Reports the checklist task complete event.
   * @param {ChecklistItemType} item - The completed checklist item
   */
  private async reportTaskCompleteEvent(item: ChecklistItemType) {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_TASK_COMPLETED, {
      [EventAttributes.CHECKLIST_TASK_ID]: item.id,
      [EventAttributes.CHECKLIST_TASK_NAME]: item.name,
    });
  }
}
