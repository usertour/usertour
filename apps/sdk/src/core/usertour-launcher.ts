import {
  ContentEditorClickableElement,
  ElementSelectorPropsData,
  contentEndReason,
  contentStartReason,
} from '@usertour/types';
import { isUndefined } from '@usertour/helpers';
import { LauncherStore, BaseStore } from '@/types/store';
import { UsertourComponent } from '@/core/usertour-component';
import { logger } from '@/utils';
import { SDKClientEvents, WidgetZIndex } from '@usertour-packages/constants';
import { UsertourElementWatcher } from './usertour-element-watcher';
import { CommonActionHandler, LauncherActionHandler } from '@/core/action-handlers';

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
    const baseStoreData = await this.buildStoreData();
    if (!baseStoreData?.launcherData) {
      return;
    }
    const store = {
      ...baseStoreData,
      triggerRef: undefined,
    } as LauncherStore;
    this.setupElementWatcher(store);
  }

  /**
   * Handles the activation of the launcher
   * This method:
   * 1. Reports the activation event
   * 2. Auto-dismisses the launcher after activation if configured
   */
  async handleActivate() {
    const store = this.getStoreData();
    if (!store) {
      return;
    }
    const launcherData = store.launcherData;
    const tooltip = launcherData?.tooltip;
    await this.reportActivateEvent();
    // Auto-dismiss after activation if configured
    if (tooltip?.settings?.dismissAfterFirstActivation) {
      setTimeout(() => {
        this.close();
      }, 2000);
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

  /**
   * Handles the dismiss event of the launcher
   */
  async handleDismiss() {
    await this.close(contentEndReason.USER_CLOSED);
  }

  // === Store Management ===
  /**
   * Gets custom launcher store data
   * @param baseData - The base store data that can be used for custom logic
   * @protected
   */
  protected getCustomStoreData(baseData: Partial<BaseStore> | null): Partial<LauncherStore> {
    const launcherData = this.getLauncherData();
    const zIndex =
      launcherData?.zIndex ||
      (baseData?.zIndex ? baseData?.zIndex + WidgetZIndex.LAUNCHER_OFFSET : undefined);

    return {
      launcherData,
      ...(zIndex ? { zIndex } : {}),
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
    const targetMissingSeconds = this.instance.getTargetMissingSeconds();
    if (!isUndefined(targetMissingSeconds)) {
      this.watcher.setTargetMissingSeconds(targetMissingSeconds);
    }

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

  // === Lifecycle Hooks ===
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
