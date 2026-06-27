import {
  ContentEditorClickableElement,
  ContentEditorRoot,
  CustomContentSession,
  LiveChatProvider,
  ResourceCenterBlockType,
  ResourceCenterContentListBlock,
  ResourceCenterData,
  ResourceCenterLiveChatBlock,
  ResourceCenterNavigationState,
  ThemeTypesSetting,
  ResourceCenterAnnouncementBlock,
  ResourceCenterBlockContentItem,
  ListAnnouncementsResult,
  AnnouncementDetail,
  contentEndReason,
  contentStartReason,
} from '@usertour/types';
import { ResourceCenterStore } from '@/types/store';
import { UsertourComponent, CustomStoreDataContext } from '@/core/usertour-component';
import { logger } from '@/utils';
import { CommonActionHandler } from '@/core/action-handlers';
import { StorageKeys, WidgetZIndex } from '@usertour/constants';
import { isDisplayOnlyBlockType, storage } from '@usertour/helpers';
import { UsertourLiveChatManager } from '@/core/usertour-live-chat-manager';

export class UsertourResourceCenter extends UsertourComponent<ResourceCenterStore> {
  getAnnouncementBadgeCount(): number {
    const resourceCenterData = this.getStoreData()?.resourceCenterData;
    if (!resourceCenterData?.tabs) {
      return 0;
    }

    // The announcement feed is global (not per-block), and the server writes the
    // same unread count onto every announcement block. So take it once — max
    // guards against any divergence — instead of summing, which would multiply
    // the badge by the number of announcement blocks the resource center has.
    let count = 0;
    for (const tab of resourceCenterData.tabs) {
      for (const block of tab.blocks) {
        if (block.type === ResourceCenterBlockType.ANNOUNCEMENT) {
          count = Math.max(count, (block as ResourceCenterAnnouncementBlock).unreadCount ?? 0);
        }
      }
    }
    return count;
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
    const data = this.getStoreData()?.resourceCenterData;
    if (data) {
      this.liveChatManager.configure(data);
    }
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

    // ACTION is a CTA, not navigation: run any configured actions and
    // collapse back to launcher with the same semantics as the user
    // clicking the close button (clears storage, fires closeResourceCenter).
    // Sub-page / content-list clicks fall through and stay expanded so the
    // user can navigate inside the RC.
    if (block.type === ResourceCenterBlockType.ACTION) {
      if (block.clickedActions?.length > 0) {
        await this.handleActions(block.clickedActions);
      }
      await this.expand(false);
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

      // Enrich server response with per-item config (icon, navigate URL) from block data.
      // Server already filters items by onlyShowItemConditions, so we trust its list.
      const configMap = new Map(block.contentItems.map((ci) => [ci.contentId, ci]));
      const enrichedItems: ResourceCenterBlockContentItem[] = items.map((item) => {
        const config = configMap.get(item.contentId);
        if (!config) return item;
        return {
          ...item,
          ...(config.iconSource && { iconSource: config.iconSource }),
          ...(config.iconType && { iconType: config.iconType }),
          ...(config.iconUrl && { iconUrl: config.iconUrl }),
          ...(config.navigateUrl && { navigateUrl: config.navigateUrl }),
          ...(config.navigateOpenType && { navigateOpenType: config.navigateOpenType }),
        };
      });

      this.updateStore({ contentListItems: enrichedItems });
      return enrichedItems;
    } catch (error) {
      logger.error('Failed to fetch content list items:', error);
      this.updateStore({ contentListItems: [] });
      return [];
    }
  }

  async handleContentListItemClick(item: ResourceCenterBlockContentItem): Promise<void> {
    try {
      await this.socketService.startContent({
        contentId: item.contentId,
        startReason: contentStartReason.START_FROM_ACTION,
      });

      // Navigate to URL if configured on this item
      if (item.navigateUrl && item.navigateUrl.length > 0) {
        this.handleNavigate({
          value: item.navigateUrl,
          openType: item.navigateOpenType ?? 'same',
        });
      }

      // Clicking a list item launches content — collapse with the same
      // semantics as the user clicking the close button.
      await this.expand(false);
    } catch (error) {
      logger.error('Failed to start content from content list:', error);
    }
  }

  // ── Announcement operations ──────────────────────────────────────────

  async listAnnouncements(cursor: string | null): Promise<ListAnnouncementsResult> {
    try {
      return await this.socketService.listAnnouncements({ cursor });
    } catch (error) {
      logger.error('Failed to list announcements:', error);
      return { announcements: [], pageSize: 0, truncated: false };
    }
  }

  async getAnnouncement(contentId: string): Promise<AnnouncementDetail | null> {
    try {
      return await this.socketService.getAnnouncement({ contentId });
    } catch (error) {
      logger.error('Failed to get announcement:', error);
      return null;
    }
  }

  async markAnnouncementSeen(contentId: string, versionId: string): Promise<boolean> {
    // Optimistically drop the launcher badge so collapsing back to the launcher
    // reflects the just-opened feed without waiting for the next session rebuild.
    // The server's unreadCount stays the source of truth and reconciles on the
    // next build; this only avoids a stale badge for the rest of this session.
    // The feed only marks its unseen items, so each call maps to one unread
    // announcement and a single decrement is correct.
    this.decrementAnnouncementUnreadCount();
    try {
      return await this.socketService.markAnnouncementSeen({ contentId, versionId });
    } catch (error) {
      logger.error('Failed to mark announcement seen:', error);
      return false;
    }
  }

  /**
   * Decrement the announcement unreadCount by one (clamped at zero) on every
   * announcement block. The server mirrors the same global count onto each block
   * and the badge sums them, so decrementing every block in step keeps the local
   * badge consistent with both.
   */
  private decrementAnnouncementUnreadCount(): void {
    const resourceCenterData = this.getStoreData()?.resourceCenterData;
    if (!resourceCenterData?.tabs) {
      return;
    }

    let changed = false;
    const tabs = resourceCenterData.tabs.map((tab) => ({
      ...tab,
      blocks: tab.blocks.map((block) => {
        if (block.type !== ResourceCenterBlockType.ANNOUNCEMENT) {
          return block;
        }
        const announcementBlock = block as ResourceCenterAnnouncementBlock;
        if ((announcementBlock.unreadCount ?? 0) <= 0) {
          return block;
        }
        changed = true;
        return { ...announcementBlock, unreadCount: (announcementBlock.unreadCount ?? 0) - 1 };
      }),
    }));

    if (!changed) {
      return;
    }
    this.updateStore({ resourceCenterData: { ...resourceCenterData, tabs } });
  }

  // ── Live chat provider lifecycle ─────────────────────────────────────

  private liveChatManager = new UsertourLiveChatManager({
    onProviderClose: () => {
      this.updateStore({ liveChatActive: false, liveChatProviderOpen: false });
    },
    isEvalJsDisabled: () => this.isEvalJsDisabled(),
  });

  handleLiveChatClick = async (block: ResourceCenterLiveChatBlock): Promise<void> => {
    try {
      await this.handleBlockClick(block.id);
      // CUSTOM provider is fire-and-forget: run the user's code and collapse
      // to launcher with the same semantics as the user clicking the close
      // button. Unlike managed providers, there's no "session" to hide the
      // RC for — doing so would leave RC invisible forever (no close signal
      // ever arrives to flip liveChatActive back to false).
      if (block.liveChatProvider === LiveChatProvider.CUSTOM) {
        this.liveChatManager.executeCustomCode(block);
        await this.expand(false);
        return;
      }
      this.liveChatManager.open(block);
      // Hide RC and mark live chat active in a single render to avoid the
      // launcher flashing between expanded:false and liveChatActive:true.
      // Mirror expand(false)'s persistence + analytics so closing-via-chat
      // matches closing-via-button.
      const sessionId = this.getSessionId();
      this.setExpandedStateStorage(sessionId, false);
      this.updateStore({ expanded: false, liveChatActive: true, liveChatProviderOpen: true });
      this.socketService.closeResourceCenter({ sessionId });
    } catch (error) {
      logger.error('Failed to open live chat:', error);
    }
  };

  protected onDestroy(): void {
    this.liveChatManager.dispose();
  }

  isExpandable(): boolean {
    const store = this.getStoreData();
    return store?.expanded === false;
  }

  setLauncherHidden(hidden: boolean): void {
    this.updateStore({ launcherHidden: hidden });
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
    if (resourceCenterData) {
      for (const tab of resourceCenterData.tabs) {
        for (const block of tab.blocks) {
          if (block.type === ResourceCenterBlockType.RICH_TEXT && block.content) {
            block.content = (await this.evaluateButtonConditionsInData(
              block.content as ContentEditorRoot[],
            )) as typeof block.content;
          }
        }
      }
    }
    const expanded = this.getExpandedStateStorage(this.getSessionId());
    const initialNav = this.getNavStateStorage(this.getSessionId());
    return {
      resourceCenterData,
      expanded,
      initialNav,
    };
  }

  /**
   * Persist the widget's current navigation state (activeTabId + pageStack)
   * so refreshing the page restores the user where they left off.
   */
  persistNavState = (nav: ResourceCenterNavigationState): void => {
    this.setNavStateStorage(this.getSessionId(), nav);
  };

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

  private setNavStateStorage(sessionId: string, nav: ResourceCenterNavigationState): void {
    const key = `${StorageKeys.RESOURCE_CENTER_NAV}-${sessionId}`;
    storage.setSessionStorage(key, nav);
  }

  private getNavStateStorage(sessionId: string): ResourceCenterNavigationState | null {
    const key = `${StorageKeys.RESOURCE_CENTER_NAV}-${sessionId}`;
    return (storage.getSessionStorage(key) as ResourceCenterNavigationState | undefined) ?? null;
  }
}
