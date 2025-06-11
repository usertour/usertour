import { ContentEditorClickableElement } from '@usertour-ui/shared-editor';
import { BizEvents, EventAttributes, LauncherData, SDKContent } from '@usertour-ui/types';
import { ContentActionsItemType, RulesCondition } from '@usertour-ui/types';
import { evalCode } from '@usertour-ui/ui-utils';
import { LauncherStore } from '../types/store';
import { AppEvents } from '../utils/event';
import { document } from '../utils/globals';
import { App } from './app';
import { BaseContent } from './base-content';
import { defaultLauncherStore } from './common';
import { ElementWatcher } from './element-watcher';

export class Launcher extends BaseContent<LauncherStore> {
  private watcher: ElementWatcher | null = null;
  constructor(instance: App, content: SDKContent) {
    super(instance, content, defaultLauncherStore);
  }

  /**
   * Monitors the launcher's visibility state and ensures it's properly handled
   * This method:
   * 1. Activates content conditions to check if the launcher should be shown
   * 2. Handles the visibility state of the launcher based on conditions
   *
   * @returns {Promise<void>} A promise that resolves when monitoring is complete
   */
  async monitor(): Promise<void> {
    // First, check and activate any content conditions
    await this.activeContentConditions();

    // Then, handle the visibility state based on conditions
    await this.handleVisibilityState();
  }

  /**
   * Handles the visibility state of the launcher based on various conditions
   * This method manages the launcher's visibility by checking:
   * 1. If the launcher has started and not been dismissed
   * 2. If the target element is visible in the viewport
   * 3. If the launcher is temporarily hidden
   */
  private async handleVisibilityState() {
    // Early return if launcher hasn't started, is dismissed, or watcher is not initialized
    if (!this.hasStarted() || this.hasDismissed() || !this.watcher) {
      return;
    }

    const { openState } = this.getStore().getSnapshot();
    const { isHidden } = await this.watcher.checkVisibility();

    // Hide launcher if it's temporarily hidden or target element is not visible
    if (this.isTemporarilyHidden() || isHidden) {
      if (openState) {
        this.hide();
      }
      return;
    }

    // Show launcher if it's not already open
    if (!openState) {
      this.open();
      this.trigger(BizEvents.LAUNCHER_SEEN);
    }
  }

  getReusedSessionId() {
    return null;
  }

  /**
   * Builds the store data for the launcher
   * Combines default store data with content-specific data and base information
   * @returns {LauncherStore} The complete store data object
   */
  private buildStoreData(): LauncherStore {
    const content = this.getContent();
    const baseInfo = this.getStoreBaseInfo();
    const { zIndex } = content.data;

    return {
      ...defaultLauncherStore,
      content,
      openState: false,
      ...baseInfo,
      zIndex: zIndex || baseInfo.zIndex,
      triggerRef: undefined,
    } as LauncherStore;
  }

  /**
   * Refreshes the launcher's store data
   * Updates the store with new data while preserving the current open state and trigger reference
   */
  refresh() {
    const { openState, triggerRef, ...storeData } = this.buildStoreData();
    this.updateStore({ ...storeData });
  }

  /**
   * Shows the launcher by initializing the element watcher and setting up event listeners
   * This method will:
   * 1. Validate the target element exists
   * 2. Clean up any existing watcher
   * 3. Initialize a new element watcher
   * 4. Set up event handlers for element found and timeout scenarios
   */
  show() {
    const data = this.getContent().data as LauncherData;

    // Early return if document or target element is not available
    if (!document || !data.target.element) {
      return;
    }

    // Clean up existing watcher if present
    if (this.watcher) {
      this.watcher.destroy();
    }

    // Initialize store data and watcher
    const storeData = this.buildStoreData();
    const store = { ...storeData, openState: false };
    this.setStore({ ...store });

    // Create and configure new element watcher
    this.watcher = new ElementWatcher(data.target.element);
    // Set the target missing seconds
    this.watcher.setTargetMissingSeconds(this.getTargetMissingSeconds());

    // Set up element found handler
    this.watcher.once(AppEvents.ELEMENT_FOUND, (el) => {
      this.setStore({ ...store, triggerRef: el as HTMLElement });
    });

    // Set up timeout handler
    this.watcher.once(AppEvents.ELEMENT_FOUND_TIMEOUT, () => {
      this.close();
    });

    // Start element search
    this.watcher.findElement();
  }

  /**
   * Handles click events on the launcher
   * @param {ContentEditorClickableElement} clickEvent - The click event data containing type and actions
   */
  async handleOnClick(clickEvent: ContentEditorClickableElement) {
    const { type, data } = clickEvent;

    if (type === 'button' && data.actions) {
      await this.handleActions(data.actions);
    }
  }

  /**
   * Processes a list of actions to be executed
   * @param {RulesCondition[]} actionRules - List of action rules to be processed
   */
  async handleActions(actionRules: RulesCondition[]) {
    // Split actions into two groups
    const pageNavigateActions = actionRules.filter(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    const otherActions = actionRules.filter(
      (action) => action.type !== ContentActionsItemType.PAGE_NAVIGATE,
    );

    // Execute non-PAGE_NAVIGATE actions first
    for (const actionRule of otherActions) {
      const { type, data } = actionRule;

      if (type === ContentActionsItemType.FLOW_START) {
        await this.startNewTour(data.contentId);
      } else if (type === ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        evalCode(data.value);
      } else if (type === ContentActionsItemType.LAUNCHER_DISMIS) {
        this.close();
      }
    }

    // Execute PAGE_NAVIGATE actions last
    for (const actionRule of pageNavigateActions) {
      this.handleNavigate(actionRule.data);
    }
  }

  /**
   * Initializes event listeners for launcher lifecycle events
   * Sets up handlers for activation, dismissal, and visibility events
   */
  initializeEventListeners() {
    const content = this.getContent();
    const data = content.data as LauncherData;
    const { tooltip } = data;

    // Handle launcher activation
    this.once(BizEvents.LAUNCHER_ACTIVATED, async () => {
      await this.reportActiveEvent();

      // Auto-dismiss after activation if configured
      if (tooltip?.settings?.dismissAfterFirstActivation) {
        setTimeout(() => {
          this.close();
        }, 2000);
      }
    });

    // Handle launcher dismissal
    this.once(BizEvents.LAUNCHER_DISMISSED, () => {
      this.reportDismissEvent();
    });

    // Handle launcher visibility
    this.once(BizEvents.LAUNCHER_SEEN, () => {
      this.reportSeenEvent();
    });
  }

  /**
   * Closes the launcher and triggers dismissal events
   * This method:
   * 1. Marks the launcher as dismissed
   * 2. Hides the launcher UI
   * 3. Triggers dismissal events
   */
  async close() {
    this.setDismissed(true);
    this.setStarted(false);
    this.hide();
    this.trigger(BizEvents.LAUNCHER_DISMISSED);
  }

  /**
   * Destroys the launcher instance and cleans up resources
   * This method:
   * 1. Resets the store to default state
   * 2. Destroys the element watcher if it exists
   * 3. Cleans up any remaining references
   */
  destroy() {
    // Reset store to default state
    this.setStore(defaultLauncherStore);

    // Clean up element watcher
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
  }

  reset() {}

  /**
   * Builds event data object with launcher information
   * @returns {Record<string, string | number>} Object containing launcher metadata
   */
  private getEventData(): Record<string, string | number> {
    const content = this.getContent();

    return {
      [EventAttributes.LAUNCHER_ID]: content.contentId,
      [EventAttributes.LAUNCHER_NAME]: content.name,
      [EventAttributes.LAUNCHER_VERSION_ID]: content.id,
      [EventAttributes.LAUNCHER_VERSION_NUMBER]: content.sequence,
    };
  }

  /**
   * Reports when the launcher becomes visible to the user
   * Creates a new session for tracking
   */
  private async reportSeenEvent() {
    await this.reportEventWithSession(
      {
        eventName: BizEvents.LAUNCHER_SEEN,
        eventData: this.getEventData(),
      },
      { isCreateSession: true },
    );
  }

  /**
   * Reports when the launcher is dismissed by the user
   * Deletes the current tracking session
   */
  private async reportDismissEvent() {
    await this.reportEventWithSession(
      {
        eventName: BizEvents.LAUNCHER_DISMISSED,
        eventData: this.getEventData(),
      },
      { isDeleteSession: true },
    );
  }

  /**
   * Reports when the launcher is activated by the user
   * Deletes the current tracking session after activation
   */
  private async reportActiveEvent() {
    await this.reportEventWithSession(
      {
        eventName: BizEvents.LAUNCHER_ACTIVATED,
        eventData: this.getEventData(),
      },
      { isDeleteSession: true },
    );
  }
}
