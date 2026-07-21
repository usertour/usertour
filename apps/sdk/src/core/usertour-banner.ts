import {
  BannerEmbedPlacement,
  ContentEditorClickableElement,
  CustomContentSession,
  contentEndReason,
  RulesCondition,
} from '@usertour/types';
import { BannerStore } from '@/types/store';
import { UsertourComponent, CustomStoreDataContext } from '@/core/usertour-component';
import { logger } from '@/utils';
import { ActionSource } from '@/core/action-handlers';
import { UsertourElementWatcher } from './usertour-element-watcher';
import { CommonActionHandler, BannerActionHandler } from '@/core/action-handlers';
import { BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT, SDKClientEvents } from '@usertour/constants';

// Element-attached banners keep watching for their target for as long as the
// session lives (same as launchers): in an SPA the target may only render after
// a client-side navigation, long past a short one-shot timeout.
const BANNER_TARGET_MISSING_SECONDS = 3600;

export class UsertourBanner extends UsertourComponent<BannerStore> {
  private watcher: UsertourElementWatcher | null = null;
  // Serialized target the live watcher was built for (idempotency key).
  private watcherTargetKey: string | null = null;

  protected initializeActionHandlers(): void {
    this.registerActionHandlers([new CommonActionHandler(), new BannerActionHandler()]);
  }

  async check(): Promise<void> {
    try {
      await this.checkTargetVisibility();
      await this.checkAndUpdateThemeSettings();
    } catch (error) {
      logger.error('Error in banner checking:', error);
    }
  }

  /**
   * Drives the element watcher from the component's 200ms check loop — the same
   * pattern as launchers/tours. Without this the watcher was only consulted once
   * at setup, so a target that disappeared and REAPPEARED via SPA navigation was
   * never noticed (checkVisibility is what re-finds the element and re-triggers
   * ELEMENT_CHANGED), and the banner stayed unmounted until a full page reload.
   */
  private async checkTargetVisibility(): Promise<void> {
    const store = this.getStoreData();
    if (!store || !this.watcher) {
      return;
    }

    const { isHidden } = await this.watcher.checkVisibility();
    if (!isHidden) {
      if (!store.openState) {
        this.open();
      }
      return;
    }
    if (store.openState) {
      this.hide();
    }
  }

  async show(): Promise<void> {
    const storeData = await this.buildStoreData();
    if (!storeData?.bannerData) {
      return;
    }

    const placement = storeData.bannerData.embedPlacement ?? BannerEmbedPlacement.TOP_OF_PAGE;
    const requiresElement = BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT.includes(placement);

    if (requiresElement) {
      this.setupElementWatcher(storeData);
      return;
    }

    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
      this.watcherTargetKey = null;
    }

    this.setStoreData({ ...storeData, openState: true, targetElement: undefined });
  }

  /**
   * Updates the banner with new session data
   * @param session - The new session data
   */
  async update(session: CustomContentSession): Promise<void> {
    this.updateSession(session);
    await this.refreshStoreData();
    const store = this.getStoreData();
    if (!store?.bannerData) {
      return;
    }
    const placement = store.bannerData.embedPlacement ?? BannerEmbedPlacement.TOP_OF_PAGE;
    const requiresElement = BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT.includes(placement);
    if (requiresElement) {
      this.setupElementWatcher(store);
      return;
    }
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
      this.watcherTargetKey = null;
      this.updateStore({ targetElement: undefined });
    }
  }

  async handleDismiss(): Promise<void> {
    await this.close(contentEndReason.DISMISS_BUTTON);
  }

  async handleOnClick(element: ContentEditorClickableElement): Promise<void> {
    const { type, data } = element;
    if (type === 'button' && data.actions) {
      await this.handleActions(data.actions as RulesCondition[], ActionSource.BUTTON);
    }
  }

  protected getZIndex(): number {
    const bannerData = this.getBannerData();
    if (bannerData?.zIndex != null) {
      return bannerData.zIndex;
    }
    return this.getBaseZIndex();
  }

  protected async getCustomStoreData(
    _context: CustomStoreDataContext,
  ): Promise<Partial<BannerStore>> {
    const bannerData = this.getBannerData();
    const evaluatedContents = bannerData?.contents
      ? await this.evaluateButtonConditionsInData(bannerData.contents)
      : bannerData?.contents;
    const evaluatedBannerData = bannerData
      ? { ...bannerData, contents: evaluatedContents }
      : bannerData;
    return { bannerData: evaluatedBannerData };
  }

  private setupElementWatcher(store: BannerStore): void {
    const data = store.bannerData;
    const targetElement = data?.containerElement;
    if (!targetElement) {
      logger.error('Banner target element not found', { data });
      return;
    }

    // Idempotent for an unchanged target — same rationale as the launcher: a
    // server re-send (ack timeout) re-runs show()/update(), and tearing down a
    // live watcher wipes its found state mid-flight.
    const targetKey = JSON.stringify(targetElement);
    if (this.watcher && this.watcherTargetKey === targetKey) {
      // once(ELEMENT_FOUND) is already consumed if the element was found —
      // re-apply the (possibly refreshed) store with the found element so the
      // re-run still lands the update.
      const el = this.watcher.getElement();
      if (el) {
        this.setStoreData({ ...store, openState: true, targetElement: el });
      }
      return;
    }

    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
      this.watcherTargetKey = null;
    }

    this.watcherTargetKey = targetKey;
    this.watcher = new UsertourElementWatcher(targetElement);

    // Keep looking for the target for the session's lifetime (SPA targets can
    // appear long after load) — the old 6s default gave up for good and the
    // banner never mounted without a full page reload.
    this.watcher.setTargetMissingSeconds(BANNER_TARGET_MISSING_SECONDS);

    this.watcher.once(SDKClientEvents.ELEMENT_FOUND, (el) => {
      if (el instanceof Element) {
        this.setStoreData({ ...store, openState: true, targetElement: el });
      }
    });

    this.watcher.once(SDKClientEvents.ELEMENT_FOUND_TIMEOUT, () => {
      this.hide();
    });

    this.watcher.on(SDKClientEvents.ELEMENT_CHANGED, (el) => {
      if (el instanceof Element) {
        this.updateStore({ targetElement: el });
      }
    });

    this.watcher.findElement();
  }

  /**
   * Banner-specific cleanup: destroy the element watcher to prevent timer/listener leaks.
   */
  protected onDestroy(): void {
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
      this.watcherTargetKey = null;
    }
    this.watcherTargetKey = null;
  }
}
