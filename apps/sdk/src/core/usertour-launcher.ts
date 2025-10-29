import {
  ContentEditorClickableElement,
  ElementSelectorPropsData,
  ThemeTypesSetting,
  contentEndReason,
  contentStartReason,
} from '@usertour/types';
import { isUndefined } from '@usertour/helpers';
import { LauncherStore } from '@/types/store';
import { UsertourComponent } from '@/core/usertour-component';
import { UsertourTheme } from '@/core/usertour-theme';
import { logger } from '@/utils';
import { convertToAttributeEvaluationOptions } from '@/core/usertour-helper';
import {
  ELEMENT_CHANGED,
  ELEMENT_FOUND,
  ELEMENT_FOUND_TIMEOUT,
  LAUNCHER_CLOSED,
} from '@usertour-packages/constants';
import { UsertourElementWatcher } from './usertour-element-watcher';
import { CommonActionHandler, LauncherActionHandler } from '@/core/action-handlers';

export class UsertourLauncher extends UsertourComponent<LauncherStore> {
  private watcher: UsertourElementWatcher | null = null;

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
      await this.checkAndUpdateThemeSettings();
    } catch (error) {
      logger.error('Error in launcher checking:', error);
    }
  }

  /**
   * Shows the launcher by initializing its store data with closed state.
   * This method sets up the initial state of the launcher without displaying it.
   */
  async show() {
    const baseStoreData = await this.buildStoreData();
    const launcherData = this.getLauncherData();
    if (!baseStoreData || !launcherData) {
      return;
    }
    const store = {
      ...baseStoreData,
      launcherData,
    } as LauncherStore;
    this.setupElementWatcher(store);
  }

  /**
   * Sets up the element watcher for a popper step
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
    const targetMissingSeconds = this.instance.getTargetMissingSeconds();
    if (!isUndefined(targetMissingSeconds)) {
      this.watcher.setTargetMissingSeconds(targetMissingSeconds);
    }

    // Handle element found
    this.watcher.once(ELEMENT_FOUND, (el) => {
      if (el instanceof Element) {
        this.handleElementFound(el, store);
      }
    });

    // Handle element not found
    this.watcher.once(ELEMENT_FOUND_TIMEOUT, () => {
      this.handleElementNotFound();
    });

    // Handle element changed
    this.watcher.on(ELEMENT_CHANGED, (el) => {
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

  /**
   * Gets custom launcher store data
   * @protected
   */
  protected getCustomStoreData(): Partial<LauncherStore> {
    const launcherData = this.getLauncherData();
    if (!launcherData) {
      return {};
    }
    return { launcherData };
  }

  /**
   * Handles the activation of the launcher
   * This method:
   * 1. Reports the activation event
   * 2. Auto-dismisses the launcher after activation if configured
   */
  async handleActive() {
    const store = this.getStoreData();
    if (!store) {
      return;
    }
    const launcherData = store.launcherData;
    const tooltip = launcherData?.tooltip;
    await this.reportActiveEvent();
    // Auto-dismiss after activation if configured
    if (tooltip?.settings?.dismissAfterFirstActivation) {
      setTimeout(() => {
        this.close();
      }, 2000);
    }
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
   * Handles the dismiss event of the launcher
   */
  async handleDismiss() {
    await this.close(contentEndReason.USER_CLOSED);
  }

  /**
   * Closes the launcher
   * @param reason - The reason for closing the launcher
   */
  async close(reason: contentEndReason = contentEndReason.SYSTEM_CLOSED) {
    // Set the launcher as dismissed
    this.hide();
    // Destroy the launcher
    this.destroy();
    // Trigger the launcher closed event
    this.trigger(LAUNCHER_CLOSED, { sessionId: this.getSessionId() });
    // Report the dismiss event
    await this.reportDismissEvent(reason);
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
   * Builds the store data for the launcher
   */
  async buildStoreData(): Promise<LauncherStore | null> {
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
      triggerRef: undefined,
    } as LauncherStore;
  }

  /**
   * Reports the launcher dismiss event.
   */
  private async reportDismissEvent(endReason: contentEndReason = contentEndReason.USER_CLOSED) {
    await this.socketService.endContent({
      sessionId: this.getSessionId(),
      endReason,
    });
  }

  /**
   * Reports when the launcher is activated by the user
   * Deletes the current tracking session after activation
   */
  private async reportActiveEvent() {
    await this.socketService.activateLauncher({
      sessionId: this.getSessionId(),
    });
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
