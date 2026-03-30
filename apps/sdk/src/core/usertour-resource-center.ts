import {
  ContentEditorClickableElement,
  ContentEditorRoot,
  CustomContentSession,
  ResourceCenterData,
  ThemeTypesSetting,
  contentEndReason,
} from '@usertour/types';
import { ResourceCenterStore } from '@/types/store';
import { UsertourComponent, CustomStoreDataContext } from '@/core/usertour-component';
import { logger } from '@/utils';
import { CommonActionHandler } from '@/core/action-handlers';
import { StorageKeys, WidgetZIndex } from '@usertour-packages/constants';
import { isDisplayOnlyBlockType, storage } from '@usertour/helpers';

export class UsertourResourceCenter extends UsertourComponent<ResourceCenterStore> {
  protected initializeActionHandlers(): void {
    this.registerActionHandlers([new CommonActionHandler()]);
  }

  async check(): Promise<void> {
    try {
      await this.checkAndUpdateThemeSettings();
    } catch (error) {
      logger.error('Error in resource center checking:', error);
    }
  }

  async show(): Promise<void> {
    const storeData = await this.buildStoreData();
    if (!storeData) {
      logger.warn('Resource center: buildStoreData returned null (missing theme?)');
      return;
    }
    if (!storeData.resourceCenterData) {
      logger.warn('Resource center: resourceCenterData is missing from session');
      return;
    }
    this.setStoreData({ ...storeData, openState: true });
  }

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
      await this.handleActions(data.actions);
    }
  }

  async expand(expanded: boolean): Promise<void> {
    const store = this.getStoreData();
    if (!store) return;
    if (store.expanded === expanded) return;
    this.setExpandedStateStorage(this.getSessionId(), expanded);
    this.updateStore({ expanded });

    // Report open/close events
    const sessionId = this.getSessionId();
    if (expanded) {
      this.socketService.openResourceCenter({ sessionId });
    } else {
      this.socketService.closeResourceCenter({ sessionId });
    }
  }

  async handleBlockClick(blockId: string): Promise<void> {
    const store = this.getStoreData();
    const block = store?.resourceCenterData?.blocks?.find((b) => b.id === blockId);
    if (!block || isDisplayOnlyBlockType(block.type)) {
      return;
    }
    const sessionId = this.getSessionId();
    this.socketService.clickResourceCenter({ sessionId, blockId });
  }

  isExpandable(): boolean {
    const store = this.getStoreData();
    return store?.expanded === false;
  }

  protected getZIndex(themeSettings?: ThemeTypesSetting): number {
    const themeZIndex = themeSettings?.resourceCenter?.zIndex;
    if (themeZIndex != null) {
      return themeZIndex;
    }
    return this.getBaseZIndex() + WidgetZIndex.RESOURCE_CENTER_OFFSET;
  }

  protected async getCustomStoreData(
    _context: CustomStoreDataContext,
  ): Promise<Partial<ResourceCenterStore>> {
    const resourceCenterData = this.getResourceCenterData();
    // Evaluate button conditions in message block contents
    if (resourceCenterData?.blocks) {
      for (const block of resourceCenterData.blocks) {
        if (block.type === 'message' && block.content) {
          block.content = (await this.evaluateButtonConditionsInData(
            block.content as ContentEditorRoot[],
          )) as typeof block.content;
        }
      }
    }
    const expanded = this.getExpandedStateStorage(this.getSessionId());
    return {
      resourceCenterData,
      expanded,
    };
  }

  private getResourceCenterData(): ResourceCenterData | undefined {
    return this.session.getResourceCenterData();
  }

  private setExpandedStateStorage(sessionId: string, expanded: boolean): void {
    const key = `${StorageKeys.RESOURCE_CENTER_EXPANDED}-${sessionId}`;
    if (expanded) {
      storage.setSessionStorage(key, true);
    } else {
      storage.removeSessionStorage(key);
    }
  }

  private getExpandedStateStorage(sessionId: string): boolean {
    const key = `${StorageKeys.RESOURCE_CENTER_EXPANDED}-${sessionId}`;
    return (storage.getSessionStorage(key) as boolean | undefined) ?? false;
  }
}
