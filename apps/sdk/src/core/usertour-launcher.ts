import {
  ContentEditorClickableElement,
  ElementSelectorPropsData,
  contentEndReason,
  contentStartReason,
} from '@usertour/types';
import { LauncherStore } from '@/types/store';
import { UsertourComponent, CustomStoreDataContext } from '@/core/usertour-component';
import { logger } from '@/utils';
import { SDKClientEvents, WidgetZIndex } from '@usertour-packages/constants';
import { UsertourElementWatcher } from './usertour-element-watcher';
import { CommonActionHandler, LauncherActionHandler } from '@/core/action-handlers';

// Launcher timeout: 1 hour (3600 seconds)
// Longer timeout for launcher since multiple launchers can coexist without affecting each other
const LAUNCHER_TARGET_MISSING_SECONDS = 3600;

export class UsertourLauncher extends UsertourComponent<LauncherStore> {
  // === Properties ===
  private watcher: UsertourElementWatcher | null = null;

  // === Abstract Methods Implementation ===
  /**
   * Initialize action handlers for launcher
   */
  protected initializeActionHandlers(): void {
    this.registerActionHandlers([new CommonActionHandler(), new LauncherActionHandler()]);
  }

  /**
   * Checks the launcher
   */
  async check(): Promise<void> {
    try {
      await this.checkTargetVisibility();
      await this.checkAndUpdateThemeSettings();
    } catch (error) {
      logger.error('Error in launcher checking:', error);
    }
  }

  // === Public API Methods ===
  /**
   * Shows the launcher by initializing its store data with closed state.
   * This method sets up the initial state of the launcher without displaying it.
   */
  async show() {
    const storeData = await this.buildStoreData();
    if (!storeData?.launcherData) {
      return;
    }
    const store = {
      ...storeData,
      triggerRef: undefined,
    } as LauncherStore;
    this.setupElementWatcher(store);
  }

  /**
   * Handles the activation of the launcher
   * This method reports the activation event
   */
  async handleActivate() {
    await this.reportActivateEvent();
  }

  /**
   * Handles the tooltip close event
   * This method checks if auto-dismiss is configured and closes the launcher after a delay
   */
  async onTooltipClose() {
    const storeData = this.getStoreData();
    if (!storeData) {
      return;
    }
    const launcherData = storeData.launcherData;
    const tooltip = launcherData?.tooltip;
    // Auto-dismiss after tooltip is closed if configured
    if (tooltip?.settings?.dismissAfterFirstActivation) {
      await this.close(contentEndReason.LAUNCHER_DEACTIVATED);
    }
  }

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

  // === Store Management ===
  /**
   * Gets the z-index for the launcher component
   * @protected
   */
  protected getZIndex(): number {
    const launcherData = this.getLauncherData();
    if (launcherData?.zIndex != null) {
      return launcherData.zIndex;
    }
    return this.getBaseZIndex() + WidgetZIndex.LAUNCHER_OFFSET;
  }

  /**
   * Gets custom launcher store data
   * @param _context - Context object (unused in launcher)
   * @protected
   */
  protected getCustomStoreData(_context: CustomStoreDataContext): Partial<LauncherStore> {
    const launcherData = this.getLauncherData();
    return {
      launcherData,
    };
  }

  // === Element Watcher ===
  /**
   * Sets up the element watcher for a launcher
   * @private
   */
  private setupElementWatcher(store: LauncherStore): void {
    const data = store.launcherData;

    // Clean up existing watcher
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }

    const targetElement = data?.target?.element as ElementSelectorPropsData;
    if (!targetElement) {
      logger.error('Target element not found', { data });
      return;
    }

    this.watcher = new UsertourElementWatcher(targetElement);

    // Use launcher-specific timeout (1 hour) for continuous element monitoring
    this.watcher.setTargetMissingSeconds(LAUNCHER_TARGET_MISSING_SECONDS);

    // Handle element found
    this.watcher.once(SDKClientEvents.ELEMENT_FOUND, (el) => {
      if (el instanceof Element) {
        this.handleElementFound(el, store);
      }
    });

    // Handle element not found
    this.watcher.once(SDKClientEvents.ELEMENT_FOUND_TIMEOUT, () => {
      this.handleElementNotFound();
    });

    // Handle element changed
    this.watcher.on(SDKClientEvents.ELEMENT_CHANGED, (el) => {
      if (el instanceof Element) {
        this.handleElementChanged(el);
      }
    });
    // Start watching
    this.watcher.findElement();
  }

  /**
   * Handles the element found event
   * @param el - The element that was found
   * @param store - The store data
   */
  private handleElementFound(el: Element, store: LauncherStore): void {
    const sessionId = this.getSessionId();
    if (!sessionId) {
      this.instance.startContent(
        this.getContentId(),
        contentStartReason.START_FROM_CONDITION,
        undefined,
        false,
      );
    } else {
      this.setStoreData({ ...store, openState: true, triggerRef: el as HTMLElement });
    }
  }

  /**
   * Handles the element not found event
   */
  private handleElementNotFound() {
    this.hide();
  }

  /**
   * Handles the element changed event
   * @param el - The element that was changed
   */
  private handleElementChanged(el: Element): void {
    this.updateStore({
      triggerRef: el,
    });
  }

  // === Visibility Checking ===
  /**
   * Checks and updates the visibility of the target element
   * @private
   */
  private async checkTargetVisibility(): Promise<void> {
    const store = this.getStoreData();
    if (!store || !this.watcher) {
      return;
    }

    const { openState } = store;
    const { isHidden } = await this.watcher.checkVisibility();

    if (!isHidden) {
      if (!openState) {
        this.open();
      }
      return;
    }

    this.hide();
  }

  // === Event Reporting ===
  /**
   * Reports when the launcher is activated by the user
   * Deletes the current tracking session after activation
   */
  private async reportActivateEvent() {
    await this.socketService.activateLauncher({
      sessionId: this.getSessionId(),
    });
  }

  /**
   * Reports when the launcher is dismissed by the user
   * Deletes the current tracking session after dismissal
   * @param reason - The reason for dismissing the launcher
   */
  protected async reportDismissEvent(
    reason: contentEndReason = contentEndReason.LAUNCHER_DEACTIVATED,
  ): Promise<void> {
    await this.socketService.dismissLauncher({
      sessionId: this.getSessionId(),
      endReason: reason,
    });
  }

  // === Lifecycle Hooks ===
  /**
   * Launcher-specific close logic
   * Uses reportDismissEvent instead of endContent for launcher
   * @param reason - The reason for closing the launcher
   * @protected
   */
  protected async onClose(reason: contentEndReason = contentEndReason.USER_CLOSED): Promise<void> {
    await this.reportDismissEvent(reason);
  }

  /**
   * Launcher-specific cleanup logic
   * @protected
   */
  protected onDestroy(): void {
    // Clean up watcher
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
  }
}
