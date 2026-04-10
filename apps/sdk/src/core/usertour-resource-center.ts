import {
  ContentEditorClickableElement,
  ContentEditorRoot,
  CustomContentSession,
  LiveChatProvider,
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

  private liveChatCleanup: (() => void) | null = null;

  handleLiveChatClick = (block: ResourceCenterLiveChatBlock): void => {
    try {
      this.handleBlockClick(block.id);
      this.expand(false);

      // Clean up previous live chat listener if any
      this.liveChatCleanup?.();
      this.liveChatCleanup = null;

      if (block.liveChatProvider === LiveChatProvider.HUBSPOT) {
        this.liveChatCleanup = this.initHubSpot(() => this.expand(true));
      } else {
        this.openLiveChatWidget(block);
        this.liveChatCleanup = this.listenProviderClose(block, () => {
          this.expand(true);
        });
      }
    } catch (error) {
      logger.error('Failed to open live chat:', error);
    }
  };

  // ── Generic providers (non-HubSpot) ────────────────────────────────

  private openLiveChatWidget(block: ResourceCenterLiveChatBlock): void {
    const w = window as any;
    switch (block.liveChatProvider) {
      case LiveChatProvider.CRISP:
        w.$crisp?.push(['do', 'chat:open']);
        break;
      case LiveChatProvider.INTERCOM:
        w.Intercom?.('show');
        break;
      case LiveChatProvider.ZENDESK_CLASSIC:
        w.zE?.('webWidget', 'open');
        break;
      case LiveChatProvider.ZENDESK_MESSENGER:
        w.zE?.('messenger', 'open');
        break;
      case LiveChatProvider.FRESHCHAT:
        if (w.FreshworksWidget) {
          w.FreshworksWidget('open');
        } else {
          (w.fcWidget ?? w.fdWidget)?.open?.();
        }
        break;
      case LiveChatProvider.HELP_SCOUT:
        w.Beacon?.('open');
        break;
      case LiveChatProvider.CUSTOM:
        if (block.customLiveChatCode) {
          try {
            new Function(block.customLiveChatCode)();
          } catch (e) {
            logger.error('Custom live chat code error:', e);
          }
        }
        break;
    }
  }

  private listenProviderClose(
    block: ResourceCenterLiveChatBlock,
    onClose: () => void,
  ): (() => void) | null {
    const w = window as any;
    switch (block.liveChatProvider) {
      case LiveChatProvider.CRISP:
        w.$crisp?.push(['on', 'chat:closed', onClose]);
        return () => w.$crisp?.push(['off', 'chat:closed']);
      case LiveChatProvider.INTERCOM:
        w.Intercom?.('onHide', onClose);
        return null;
      case LiveChatProvider.ZENDESK_CLASSIC:
        w.zE?.('webWidget:on', 'close', onClose);
        return () => w.zE?.('webWidget:on', 'close', () => {});
      case LiveChatProvider.ZENDESK_MESSENGER:
        w.zE?.('messenger:on', 'close', onClose);
        return () => w.zE?.('messenger:on', 'close', () => {});
      case LiveChatProvider.FRESHCHAT:
        if (w.FreshworksWidget) {
          w.FreshworksWidget('onClose', onClose);
        } else {
          (w.fcWidget ?? w.fdWidget)?.on?.('widget:closed', onClose);
        }
        return null;
      case LiveChatProvider.HELP_SCOUT:
        w.Beacon?.('on', 'close', onClose);
        return () => w.Beacon?.('off', 'close');
      default:
        return null;
    }
  }

  // ── HubSpot: MutationObserver + CSS visibility + ready polling ─────

  private initHubSpot(onClose: () => void): () => void {
    const w = window as any;
    let pollTimer: number | null = null;
    let observer: MutationObserver | null = null;
    let disposed = false;

    const CONTAINER_ID = 'hubspot-messages-iframe-container';

    const showHubSpotWidget = () => {
      document
        .getElementById(CONTAINER_ID)
        ?.style.setProperty('visibility', 'visible', 'important');
    };

    const hideHubSpotWidget = () => {
      document.getElementById(CONTAINER_ID)?.style.setProperty('visibility', 'hidden', 'important');
    };

    const setup = () => {
      const container = document.getElementById(CONTAINER_ID);
      if (!w.HubSpotConversations || !container) return;

      // API and DOM both ready — stop polling
      if (pollTimer != null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (disposed) return;

      // Open the chat
      showHubSpotWidget();
      w.HubSpotConversations.widget.open();

      // Detect close via MutationObserver on .hs-shadow-container.active
      let isOpen = true;
      const checkState = () => {
        const active = !!container.querySelector('.hs-shadow-container.active');
        if (isOpen && !active) {
          isOpen = false;
          hideHubSpotWidget();
          onClose();
        } else if (!isOpen && active) {
          isOpen = true;
        }
      };

      observer = new MutationObserver(checkState);
      observer.observe(container, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class'],
      });
    };

    // Poll every 100ms until HubSpotConversations + DOM are ready
    pollTimer = window.setInterval(setup, 100);
    setup(); // try immediately

    // Cleanup
    return () => {
      disposed = true;
      if (pollTimer != null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      observer?.disconnect();
      observer = null;
    };
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
