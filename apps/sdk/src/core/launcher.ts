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

  async monitor() {
    await this.activeContentConditions();
    this.handleVisibilityState();
  }

  private async handleVisibilityState() {
    if (!this.hasStarted() || this.hasDismissed() || !this.watcher) {
      return;
    }

    const { openState } = this.getStore().getSnapshot();
    const { isHidden } = await this.watcher.checkVisibility();

    if (this.isTemporarilyHidden() || isHidden) {
      openState && this.hide();
      return;
    }

    if (!openState) {
      this.open();
      this.trigger(BizEvents.LAUNCHER_SEEN);
    }
  }

  getReusedSessionId() {
    return null;
  }

  private buildStoreData() {
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

  refresh() {
    const { openState, triggerRef, ...storeData } = this.buildStoreData();
    this.updateStore({ ...storeData });
  }

  show() {
    const data = this.getContent().data as LauncherData;
    if (!document || !data.target.element) {
      return;
    }
    if (this.watcher) {
      this.watcher.destroy();
    }
    const storeData = this.buildStoreData();
    const store = { ...storeData, openState: false };
    this.setStore({ ...store });
    this.watcher = new ElementWatcher(data.target.element);
    this.watcher.once(AppEvents.ELEMENT_FOUND, (el) => {
      this.setStore({ ...store, triggerRef: el as HTMLElement });
    });
    this.watcher.once(AppEvents.ELEMENT_FOUND_TIMEOUT, () => {
      this.dismiss();
    });
    this.watcher.findElement();
  }

  async handleOnClick({ type, data }: ContentEditorClickableElement) {
    if (type === 'button' && data.actions) {
      await this.handleActions(data.actions);
    }
  }

  async handleActions(actions: RulesCondition[]) {
    for (const action of actions) {
      if (action.type === ContentActionsItemType.FLOW_START) {
        await this.startNewTour(action.data.contentId);
      } else if (action.type === ContentActionsItemType.PAGE_NAVIGATE) {
        this.handleNavigate(action.data);
      } else if (action.type === ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        evalCode(action.data.value);
      } else if (action.type === ContentActionsItemType.LAUNCHER_DISMIS) {
        this.dismiss();
      }
    }
  }

  initializeEventListeners() {
    const content = this.getContent();
    const data = content.data as LauncherData;

    this.once(BizEvents.LAUNCHER_ACTIVATED, async () => {
      await this.reportActiveEvent();
      if (data?.tooltip?.settings?.dismissAfterFirstActivation) {
        setTimeout(() => {
          this.dismiss();
        }, 2000);
      }
    });
    this.once(BizEvents.LAUNCHER_DISMISSED, () => {
      this.reportDismissEvent();
    });
    this.once(BizEvents.LAUNCHER_SEEN, () => {
      this.reportSeenEvent();
    });
  }

  dismiss() {
    this.setDismissed(true);
    this.hide();
    this.trigger(BizEvents.LAUNCHER_DISMISSED);
  }

  destroy() {
    this.setStore(defaultLauncherStore);
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
  }

  async cancel() {
    //this.dismiss();
  }

  reset() {}

  private getEventData() {
    const content = this.getContent();
    return {
      [EventAttributes.LAUNCHER_ID]: content.contentId,
      [EventAttributes.LAUNCHER_NAME]: content.name,
      [EventAttributes.LAUNCHER_VERSION_ID]: content.id,
      [EventAttributes.LAUNCHER_VERSION_NUMBER]: content.sequence,
    };
  }

  private async reportSeenEvent() {
    await this.reportEventWithSession(
      {
        eventName: BizEvents.LAUNCHER_SEEN,
        eventData: this.getEventData(),
      },
      { isCreateSession: true },
    );
  }

  private async reportDismissEvent() {
    await this.reportEventWithSession(
      {
        eventName: BizEvents.LAUNCHER_DISMISSED,
        eventData: this.getEventData(),
      },
      { isDeleteSession: true },
    );
  }

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
