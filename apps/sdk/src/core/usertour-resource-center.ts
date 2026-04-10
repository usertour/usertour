import {
  ContentEditorClickableElement,
  ContentEditorRoot,
  CustomContentSession,
  ResourceCenterBlockType,
  ResourceCenterContentListBlock,
  ResourceCenterData,
  ResourceCenterLiveChatBlock,
  ThemeTypesSetting,
  ResourceCenterBlockContentItem,
  SearchKnowledgeBaseResult,
  contentEndReason,
  contentStartReason,
} from '@usertour/types';
import { ResourceCenterStore } from '@/types/store';
import { UsertourComponent, CustomStoreDataContext } from '@/core/usertour-component';
import { logger } from '@/utils';
import { CommonActionHandler } from '@/core/action-handlers';
import { StorageKeys, WidgetZIndex } from '@usertour-packages/constants';
import { isDisplayOnlyBlockType, storage } from '@usertour/helpers';
import { UsertourChecklist } from '@/core/usertour-checklist';
import { UsertourLiveChatManager } from '@/core/usertour-live-chat-manager';

type ResourceCenterChecklistPresentation = {
  checklist?: UsertourChecklist;
  launcherText?: string;
  badgeCount: number;
  uncompletedCount: number;
};

export class UsertourResourceCenter extends UsertourComponent<ResourceCenterStore> {
  getActivatedChecklist(): UsertourChecklist | null {
    return this.instance.activatedChecklist;
  }

  getChecklistPresentation(): ResourceCenterChecklistPresentation {
    const store = this.getStoreData();
    const resourceCenterData = store?.resourceCenterData;
    const themeSettings = store?.themeSettings;
    const checklist = this.getActivatedChecklist() ?? undefined;

    // Check if any tab contains a checklist block
    const hasChecklistBlock =
      resourceCenterData?.tabs?.some((tab) =>
        tab.blocks.some((block) => block.type === 'checklist'),
      ) ?? false;

    if (!hasChecklistBlock || !checklist) {
      return {
        checklist: undefined,
        launcherText: undefined,
        badgeCount: 0,
        uncompletedCount: 0,
      };
    }

    const checklistStore = checklist.getSnapshot();
    const items =
      checklistStore?.checklistData?.items?.filter(
        (item) => item?.isVisible !== false && !item?.isCompleted,
      ) ?? [];

    return {
      checklist,
      launcherText: checklistStore?.checklistData?.buttonText,
      badgeCount: 0,
      uncompletedCount: themeSettings?.resourceCenterLauncherButton?.showRemainingTasks
        ? items.length
        : 0,
    };
  }

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
    this.liveChatManager.configure(storeData.resourceCenterData);
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

    // When resource center expands, force-close any open live chat provider (bidirectional management)
    if (expanded && this.liveChatManager.isActive) {
      this.liveChatManager.close();
      this.updateStore({ liveChatActive: false, liveChatProviderOpen: false });
    }

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
    // Search for block across all tabs
    let block = null;
    for (const tab of store?.resourceCenterData?.tabs ?? []) {
      block = tab.blocks.find((b) => b.id === blockId);
      if (block) break;
    }
    if (!block || isDisplayOnlyBlockType(block.type)) {
      return;
    }
    const sessionId = this.getSessionId();
    this.socketService.clickResourceCenter({ sessionId, blockId });

    // Handle clickedActions for ACTION blocks
    if (block.type === ResourceCenterBlockType.ACTION && block.clickedActions?.length > 0) {
      await this.handleActions(block.clickedActions);
    }
  }

  async handleContentListNavigate(
    block: ResourceCenterContentListBlock,
  ): Promise<ResourceCenterBlockContentItem[]> {
    const sessionId = this.getSessionId();
    try {
      const items = await this.socketService.listResourceCenterBlockContent({
        sessionId,
        blockId: block.id,
      });
      this.updateStore({ contentListItems: items });
      return items;
    } catch (error) {
      logger.error('Failed to fetch content list items:', error);
      this.updateStore({ contentListItems: [] });
      return [];
    }
  }

  async searchKnowledgeBase(
    blockId: string,
    query: string,
    offset: number,
  ): Promise<SearchKnowledgeBaseResult> {
    const sessionId = this.getSessionId();
    try {
      return await this.socketService.searchKnowledgeBase({
        sessionId,
        blockId,
        query,
        offset,
      });
    } catch (error) {
      logger.error('Failed to search knowledge base:', error);
      return { articles: [], total: 0 };
    }
  }

  async handleContentListItemClick(item: ResourceCenterBlockContentItem): Promise<void> {
    try {
      await this.socketService.startContent({
        contentId: item.contentId,
        startReason: contentStartReason.START_FROM_ACTION,
      });
    } catch (error) {
      logger.error('Failed to start content from content list:', error);
    }
  }

  // ── Live chat provider lifecycle ─────────────────────────────────────

  private liveChatManager = new UsertourLiveChatManager({
    onProviderClose: () => {
      this.updateStore({ liveChatActive: false, liveChatProviderOpen: false });
    },
  });

  handleLiveChatClick = (block: ResourceCenterLiveChatBlock): void => {
    try {
      this.handleBlockClick(block.id);
      this.liveChatManager.open(block);
      this.updateStore({ expanded: false, liveChatActive: true, liveChatProviderOpen: true });
    } catch (error) {
      logger.error('Failed to open live chat:', error);
    }
  };

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
    // Evaluate button conditions in message block contents across all tabs
    if (resourceCenterData?.tabs) {
      for (const tab of resourceCenterData.tabs) {
        for (const block of tab.blocks) {
          if (block.type === 'message' && block.content) {
            block.content = (await this.evaluateButtonConditionsInData(
              block.content as ContentEditorRoot[],
            )) as typeof block.content;
          }
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
