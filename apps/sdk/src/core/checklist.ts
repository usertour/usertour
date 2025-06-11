import { canCompleteChecklistItem } from '@usertour-ui/sdk';
import { ContentEditorClickableElement } from '@usertour-ui/shared-editor';
import {
  BizEvents,
  ChecklistData,
  ChecklistItemType,
  ContentActionsItemType,
  contentEndReason,
  EventAttributes,
  RulesCondition,
  SDKContent,
} from '@usertour-ui/types';
import { evalCode } from '@usertour-ui/ui-utils';
import { ReportEventOptions } from '../types/content';
import { ChecklistStore } from '../types/store';
import { activedRulesConditions, checklistIsDimissed, isActive } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { App } from './app';
import { BaseContent } from './base-content';
import { defaultChecklistStore } from './common';

// Add interface for item status
interface ChecklistItemStatus {
  clicked: boolean;
  completed: boolean;
  visible: boolean;
}

export class Checklist extends BaseContent<ChecklistStore> {
  // Replace boolean flags with status enum
  private itemStatus: Map<string, ChecklistItemStatus> = new Map();

  /**
   * Constructs a Checklist instance.
   * @param {App} instance - The app instance
   * @param {SDKContent} content - The checklist content
   */
  constructor(instance: App, content: SDKContent) {
    super(instance, content, defaultChecklistStore);
  }

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

    // Monitor individual item conditions
    await this.itemConditionsMonitor();

    // Update visibility state based on checklist status
    this.handleVisibilityState();
  }

  /**
   * Retrieves the session ID for a checklist that can be reused.
   * A session can be reused if:
   * 1. The checklist has valid data and a latest session
   * 2. The checklist has not been dismissed
   *
   * @returns {string | null} The session ID if reusable, null otherwise
   */
  getReusedSessionId() {
    const checklistContent = this.getContent();
    const hasValidContent = checklistContent.data && checklistContent.latestSession;

    if (!hasValidContent || !checklistContent.latestSession) {
      return null;
    }

    if (checklistIsDimissed(checklistContent)) {
      return null;
    }

    return checklistContent.latestSession.id;
  }

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

    await this.reportEventWithSession(
      {
        sessionId,
        eventName: BizEvents.CHECKLIST_DISMISSED,
        eventData: {
          ...baseEventData,
        },
      },
      { isDeleteSession: true },
    );
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

    const { openState } = this.getStore().getSnapshot();

    // Handle temporarily hidden state
    if (this.isTemporarilyHidden()) {
      if (openState) {
        this.hide();
      }
      return;
    }

    // Show checklist if it's not already open
    if (!openState) {
      this.open();
      this.trigger(AppEvents.CHECKLIST_FIRST_SEEN);
    }
  }

  /**
   * Shows the checklist by initializing its store data with closed state.
   * This method sets up the initial state of the checklist without displaying it.
   */
  show() {
    const storeData = this.buildStoreData();
    this.setStore({ ...storeData, openState: false });
  }

  /**
   * Refreshes the checklist data while maintaining its current open/closed state.
   * This method updates the store with fresh data without changing visibility.
   */
  refresh() {
    const { openState, ...storeData } = this.buildStoreData();
    this.updateStore({ ...storeData });
  }

  /**
   * Builds the store data for the checklist.
   * This method:
   * 1. Gets base information and content data
   * 2. Processes checklist items with their completion and visibility states
   * 3. Returns a complete store data object with default values
   *
   * @returns {ChecklistStore} The complete store data object
   */
  private buildStoreData() {
    // Get base information and content
    const baseInfo = this.getStoreBaseInfo();
    const content = this.getContent();
    const checklistData = content.data as ChecklistData;
    const isDismissed = checklistIsDimissed(content);

    // Process checklist items
    const processedItems = checklistData.items.map((item) => ({
      ...item,
      isCompleted: isDismissed ? false : this.itemIsCompleted(item),
      isVisible: true,
    }));

    // Return complete store data
    return {
      ...defaultChecklistStore,
      content: {
        ...content,
        data: {
          ...checklistData,
          items: processedItems,
        },
      },
      openState: false,
      ...baseInfo,
    };
  }

  /**
   * Checks if a checklist item is completed by looking for a completion event.
   *
   * @param {ChecklistItemType} item - The checklist item to check
   * @returns {boolean} True if the item has a completion event, false otherwise
   */
  itemIsCompleted(item: ChecklistItemType) {
    const latestSession = this.getContent().latestSession;
    return !!latestSession?.bizEvent?.find(
      (event) =>
        event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED &&
        event.data.checklist_task_id === item.id,
    );
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
        await this.startNewTour(action.data.contentId);
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
   * Handles the click event of a checklist item
   * @param item - The checklist item that was clicked
   */
  handleItemClick = async (item: ChecklistItemType) => {
    // Update item status when clicked
    this.updateItemStatus(item.id, {
      clicked: true,
    });
    //report event
    await this.reportTaskClickEvent(item);
    //handle actions
    await this.handleActions(item.clickedActions);
  };

  /**
   * Monitors and updates the conditions of checklist items.
   * This method:
   * 1. Checks completion and visibility conditions for each item
   * 2. Updates item status and store if changes are detected
   * 3. Triggers appropriate events for completed items
   */
  private async itemConditionsMonitor() {
    // Get content and validate
    const content = this.getStore().getSnapshot().content;
    if (!content) return;

    const checklistData = content.data as ChecklistData;
    const items = checklistData.items;
    if (!items?.length) return;

    // Initialize tracking variables
    let hasChanges = false;
    const updateItems = [...items];

    // Process all items in parallel
    await Promise.all(
      items.map(async (item) => {
        const currentStatus = this.getItemStatus(item.id);

        // Check completion conditions
        const activeConditions = await activedRulesConditions(item.completeConditions, {
          'task-is-clicked': currentStatus.clicked,
        });
        const isCompleted = item.isCompleted
          ? true
          : canCompleteChecklistItem(checklistData.completionOrder, items, item) &&
            isActive(activeConditions);

        // Check visibility conditions
        let isVisible = true;
        if (item.onlyShowTask) {
          const visibleConditions = await activedRulesConditions(item.onlyShowTaskConditions);
          isVisible = isActive(visibleConditions);
        }

        // Update status if changed
        if (currentStatus.completed !== isCompleted || currentStatus.visible !== isVisible) {
          this.updateItemStatus(item.id, { completed: isCompleted, visible: isVisible });

          // Update item in the array
          const itemIndex = updateItems.findIndex((i) => i.id === item.id);
          if (itemIndex !== -1) {
            updateItems[itemIndex] = {
              ...updateItems[itemIndex],
              isCompleted,
              isVisible,
            };
            hasChanges = true;
          }
        }
      }),
    );

    // Update store and trigger events if changes occurred
    if (hasChanges) {
      // Update store with filtered visible items
      this.updateStore({
        content: {
          ...content,
          data: {
            ...checklistData,
            items: updateItems.filter((item) => item.isVisible !== false),
          },
        },
      });

      // Trigger completion events
      for (const item of updateItems) {
        if (item.isCompleted) {
          this.trigger(BizEvents.CHECKLIST_TASK_COMPLETED, { item });
        }
      }

      // Check if all items are completed
      if (updateItems.every((item) => item.isCompleted)) {
        this.trigger(BizEvents.CHECKLIST_COMPLETED);
      }
    }
  }

  /**
   * Retrieves the status of a checklist item
   * @param itemId - The ID of the checklist item
   * @returns The status of the checklist item
   */
  private getItemStatus(itemId: string): ChecklistItemStatus {
    // Return default status if item not found
    return (
      this.itemStatus.get(itemId) || {
        clicked: false,
        completed: false,
        visible: true,
      }
    );
  }

  /**
   * Updates the status of a checklist item
   * @param itemId - The ID of the checklist item
   * @param status - The new status of the checklist item
   */
  private updateItemStatus(itemId: string, status: Partial<ChecklistItemStatus>) {
    const currentStatus = this.getItemStatus(itemId);
    this.itemStatus.set(itemId, {
      ...currentStatus,
      ...status,
    });
  }

  /**
   * Checks if the checklist is active
   * @returns True if the checklist is active, false otherwise
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
   * Handles the open/close state change of the checklist.
   * Triggers the appropriate event based on the open state.
   * @param {boolean} open - Whether the checklist is open
   */
  handleOpenChange(open: boolean) {
    this.trigger(open ? BizEvents.CHECKLIST_SEEN : BizEvents.CHECKLIST_HIDDEN);
  }

  /**
   * Destroys the checklist instance and resets its store.
   * Unsets the active checklist if this is the current one.
   */
  destroy() {
    if (this.isActiveChecklist()) {
      this.unsetActiveChecklist();
    }
    this.setStore(defaultChecklistStore);
  }

  /**
   * Resets the checklist state. (Currently a placeholder for future logic)
   */
  reset() {}

  /**
   * Initializes event listeners for checklist lifecycle and item events.
   */
  initializeEventListeners() {
    this.once(AppEvents.CHECKLIST_FIRST_SEEN, () => {
      this.reportSeenEvent();
    });
    this.on(BizEvents.CHECKLIST_SEEN, () => {
      this.reportSeenEvent();
    });
    this.on(BizEvents.CHECKLIST_HIDDEN, () => {
      this.reportHiddenEvent();
    });
    this.once(AppEvents.CONTENT_AUTO_START_ACTIVATED, () => {
      this.reportStartEvent();
    });

    this.on(BizEvents.CHECKLIST_TASK_CLICKED, ({ item }: any) => {
      this.reportTaskClickEvent(item);
    });

    this.on(BizEvents.CHECKLIST_TASK_COMPLETED, ({ item }: any) => {
      this.reportTaskCompleteEvent(item);
    });

    this.once(BizEvents.CHECKLIST_COMPLETED, () => {
      this.reportChecklistEvent(BizEvents.CHECKLIST_COMPLETED);
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
    options: ReportEventOptions = {},
  ) {
    const content = this.getContent();
    const baseEventData = {
      [EventAttributes.CHECKLIST_ID]: content.contentId,
      [EventAttributes.CHECKLIST_VERSION_NUMBER]: content.sequence,
      [EventAttributes.CHECKLIST_VERSION_ID]: content.id,
      [EventAttributes.CHECKLIST_NAME]: content.name,
    };

    await this.reportEventWithSession(
      {
        eventName,
        eventData: {
          ...baseEventData,
          ...additionalData,
        },
      },
      options,
    );
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
   * Reports the checklist start event and creates a new session.
   */
  private async reportStartEvent() {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_STARTED, {}, { isCreateSession: true });
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
