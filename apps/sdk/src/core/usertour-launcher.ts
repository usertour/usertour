import {
  ContentActionsItemType,
  ContentEditorClickableElement,
  ElementSelectorPropsData,
  RulesCondition,
  ThemeTypesSetting,
  contentEndReason,
  contentStartReason,
} from '@usertour/types';
import { evalCode, isEqual, isUndefined } from '@usertour/helpers';
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

export class UsertourLauncher extends UsertourComponent<LauncherStore> {
  // Tour-specific constants
  private static readonly Z_INDEX_OFFSET = 200;
  private watcher: UsertourElementWatcher | null = null;

  /**
   * Checks the tour
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
   * Refreshes the store data for the launcher
   */
  async refreshStore(): Promise<void> {
    const newStore = await this.buildStoreData();
    const launcherData = this.getLauncherData();
    const existingStore = this.getStoreData();
    if (!newStore || !existingStore || !launcherData) {
      return;
    }
    const { userAttributes, assets, globalStyle, themeSettings } = newStore;
    this.updateStore({
      launcherData,
      userAttributes,
      assets,
      globalStyle,
      themeSettings,
    });
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
      await this.close();
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
   * Calculates the z-index for the launcher
   * @private
   */
  private getCalculatedZIndex(): number {
    const baseZIndex = this.instance.getBaseZIndex() ?? 0;
    return baseZIndex + UsertourLauncher.Z_INDEX_OFFSET;
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
      case ContentActionsItemType.LAUNCHER_DISMIS:
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
}
