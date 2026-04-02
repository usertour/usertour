import {
  ContactLiveChatProvider,
  ContentEditorClickableElement,
  ContentEditorRoot,
  CustomContentSession,
  ResourceCenterBlockType,
  ResourceCenterContactBlock,
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

    const hasChecklistBlock =
      resourceCenterData?.blocks?.some((block) => block.type === 'checklist') ?? false;

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
    const block = store?.resourceCenterData?.blocks?.find((b) => b.id === blockId);
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

  handleLiveChatClick(block: ResourceCenterContactBlock): void {
    try {
      const provider = block.liveChatProvider;
      switch (provider) {
        case ContactLiveChatProvider.CRISP:
          if (typeof (window as any).$crisp !== 'undefined') {
            (window as any).$crisp.push(['do', 'chat:open']);
          }
          break;
        case ContactLiveChatProvider.FRESHCHAT:
          if (typeof (window as any).fcWidget !== 'undefined') {
            (window as any).fcWidget.open();
          }
          break;
        case ContactLiveChatProvider.HELP_SCOUT:
          if (typeof (window as any).Beacon !== 'undefined') {
            (window as any).Beacon('open');
          }
          break;
        case ContactLiveChatProvider.HUBSPOT:
          if (typeof (window as any).HubSpotConversations !== 'undefined') {
            (window as any).HubSpotConversations.widget.open();
          }
          break;
        case ContactLiveChatProvider.INTERCOM:
          if (typeof (window as any).Intercom !== 'undefined') {
            (window as any).Intercom('show');
          }
          break;
        case ContactLiveChatProvider.ZENDESK_CLASSIC:
          if (typeof (window as any).zE !== 'undefined') {
            (window as any).zE('webWidget', 'open');
          }
          break;
        case ContactLiveChatProvider.ZENDESK_MESSENGER:
          if (typeof (window as any).zE !== 'undefined') {
            (window as any).zE('messenger', 'open');
          }
          break;
        case ContactLiveChatProvider.CUSTOM:
          if (block.customLiveChatCode) {
            const fn = new Function(block.customLiveChatCode);
            fn();
          }
          break;
      }
    } catch (error) {
      logger.error('Failed to open live chat:', error);
    }
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
