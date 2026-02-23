import {
  BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT,
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
import { SDKClientEvents } from '@usertour-packages/constants';

export class UsertourBanner extends UsertourComponent<BannerStore> {
  private watcher: UsertourElementWatcher | null = null;

  protected initializeActionHandlers(): void {
    this.registerActionHandlers([new CommonActionHandler(), new BannerActionHandler()]);
  }

  async check(): Promise<void> {
    try {
      await this.checkAndUpdateThemeSettings();
    } catch (error) {
      logger.error('Error in banner checking:', error);
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
    await this.show();
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

    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }

    this.watcher = new UsertourElementWatcher(targetElement);

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
}
