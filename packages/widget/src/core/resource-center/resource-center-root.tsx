import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ResourceCenterContentListBlock,
  ResourceCenterData,
  ResourceCenterLiveChatBlock,
  ResourceCenterNavigationState,
  ResourceCenterPageEntry,
  SearchKnowledgeBaseResult,
  ListAnnouncementsResult,
  AnnouncementDetail,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import { ResourceCenterBlockType } from '@usertour/types';
import { useSettingsStyles } from '../hooks/use-settings-styles';
import {
  ResourceCenterRootContext,
  type ContentListDisplayItem,
  type ResourceCenterNavigationActions,
} from './context';
import { RESOURCE_CENTER_DEFAULTS } from './constants';

// ============================================================================
// Helper: check if a block is navigable (has a detail view)
// ============================================================================

const isNavigableBlockType = (type: string): boolean =>
  type === ResourceCenterBlockType.SUB_PAGE ||
  type === ResourceCenterBlockType.KNOWLEDGE_BASE ||
  type === ResourceCenterBlockType.CONTENT_LIST ||
  type === ResourceCenterBlockType.ANNOUNCEMENT;

interface ResourceCenterRootProps {
  children: React.ReactNode;
  themeSettings: ThemeTypesSetting;
  data: ResourceCenterData;
  launcherText?: string;
  badgeCount?: number;
  uncompletedCount?: number;
  animateFrame?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => Promise<void>;
  zIndex: number;
  /** Visually hide the entire RC (CSS visibility:hidden) while keeping it mounted */
  hidden?: boolean;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  onBlockClick?: (blockId: string) => Promise<void>;
  checklistSlot?: React.ReactNode;
  showMadeWith?: boolean;
  contentListItems?: ContentListDisplayItem[];
  onContentListNavigate?: (block: ResourceCenterContentListBlock) => void;
  onContentListItemClick?: (item: ContentListDisplayItem) => void;
  onLiveChatClick?: (block: ResourceCenterLiveChatBlock) => void;
  onSearchKnowledgeBase?: (
    blockId: string,
    query: string,
    offset: number,
  ) => Promise<SearchKnowledgeBaseResult>;
  onListAnnouncements?: (cursor: string | null) => Promise<ListAnnouncementsResult>;
  onGetAnnouncement?: (contentId: string) => Promise<AnnouncementDetail | null>;
  onMarkAnnouncementSeen?: (contentId: string, versionId: string) => Promise<boolean>;
  /** When true, the default launcher is hidden (set via SDK API) */
  launcherHidden?: boolean;
}

export const ResourceCenterRoot = memo((props: ResourceCenterRootProps) => {
  const {
    children,
    data,
    launcherText,
    badgeCount = 0,
    uncompletedCount = 0,
    animateFrame = true,
    expanded = false,
    onExpandedChange,
    zIndex,
    hidden = false,
    themeSettings,
    userAttributes,
    onContentClick,
    onBlockClick,
    checklistSlot,
    showMadeWith = true,
    contentListItems: contentListItemsProp = [],
    onContentListNavigate,
    onContentListItemClick,
    onLiveChatClick,
    onSearchKnowledgeBase,
    onListAnnouncements,
    onGetAnnouncement,
    onMarkAnnouncementSeen,
    launcherHidden = false,
  } = props;
  const { globalStyle, themeSetting } = useSettingsStyles(themeSettings);

  const isOpen = expanded;
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimerRef = useRef<number | null>(null);

  // ── Navigation state ────────────────────────────────────────────────
  const defaultTabId = data.tabs[0]?.id ?? '';

  const [nav, setNav] = useState<ResourceCenterNavigationState>({
    activeTabId: defaultTabId,
    pageStack: [],
  });

  // Reset navigation when data changes (e.g. tabs restructured)
  useEffect(() => {
    const tabExists = data.tabs.some((t) => t.id === nav.activeTabId);
    if (!tabExists) {
      setNav({ activeTabId: data.tabs[0]?.id ?? '', pageStack: [] });
    }
  }, [data.tabs, nav.activeTabId]);

  // ── Navigation actions ──────────────────────────────────────────────
  const switchTab = useCallback(
    (tabId: string) => {
      const tab = data.tabs.find((t) => t.id === tabId);
      if (!tab) return;
      setNav({ activeTabId: tabId, pageStack: [] });
    },
    [data.tabs],
  );

  const push = useCallback((entry: ResourceCenterPageEntry) => {
    setNav((prev) => ({
      ...prev,
      pageStack: [...prev.pageStack, entry],
    }));
  }, []);

  const pop = useCallback(() => {
    setNav((prev) => ({
      ...prev,
      pageStack: prev.pageStack.slice(0, -1),
    }));
  }, []);

  const popToRoot = useCallback(() => {
    setNav((prev) => ({
      ...prev,
      pageStack: [],
    }));
  }, []);

  const actions: ResourceCenterNavigationActions = useMemo(
    () => ({ switchTab, push, pop, popToRoot }),
    [switchTab, push, pop, popToRoot],
  );

  // ── Derived state ───────────────────────────────────────────────────
  const currentTab = useMemo(
    () => data.tabs.find((t) => t.id === nav.activeTabId) ?? data.tabs[0],
    [data.tabs, nav.activeTabId],
  );

  const currentPage = nav.pageStack.length > 0 ? nav.pageStack[nav.pageStack.length - 1] : null;

  // Auto-expand: if tab has exactly one block and it's navigable, show its detail view directly
  // (without pushing to pageStack, so tab bar stays visible and no back button)
  const autoExpandedPage = useMemo(() => {
    if (currentPage) return null;
    const blocks = currentTab?.blocks ?? [];
    if (blocks.length === 1 && isNavigableBlockType(blocks[0].type)) {
      return { type: blocks[0].type, block: blocks[0] } as ResourceCenterPageEntry;
    }
    return null;
  }, [currentTab, currentPage]);

  // Trigger content list fetch for auto-expanded or pushed content list pages
  const activeContentListBlock =
    autoExpandedPage?.type === ResourceCenterBlockType.CONTENT_LIST
      ? (autoExpandedPage.block as ResourceCenterContentListBlock)
      : currentPage?.type === ResourceCenterBlockType.CONTENT_LIST
        ? (currentPage.block as ResourceCenterContentListBlock)
        : null;

  const activeContentListBlockId = activeContentListBlock?.id ?? null;
  useEffect(() => {
    if (activeContentListBlock && activeContentListBlockId) {
      onContentListNavigate?.(activeContentListBlock);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContentListBlockId]);

  const showTabBar = data.tabs.length > 1 && nav.pageStack.length === 0;
  const showBackButton = nav.pageStack.length > 0;

  // ── Search state ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when navigation changes
  useEffect(() => {
    setSearchQuery('');
  }, [nav.activeTabId, nav.pageStack.length]);

  // ── Animation ───────────────────────────────────────────────────────
  const handleExpandedChange = useCallback(
    async (open: boolean) => {
      const duration =
        themeSetting.resourceCenter?.transitionDuration ??
        RESOURCE_CENTER_DEFAULTS.transitionDuration;

      setIsAnimating(true);
      if (animationTimerRef.current != null) {
        window.clearTimeout(animationTimerRef.current);
      }
      await onExpandedChange?.(open);
      animationTimerRef.current = window.setTimeout(() => {
        setIsAnimating(false);
      }, duration);
    },
    [onExpandedChange, themeSetting.resourceCenter?.transitionDuration],
  );

  useEffect(() => {
    return () => {
      if (animationTimerRef.current != null) {
        window.clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  // ── Context value ───────────────────────────────────────────────────
  const contextValue = useMemo(
    () => ({
      globalStyle,
      themeSetting,
      data,
      launcherText,
      badgeCount,
      uncompletedCount,
      isOpen,
      isAnimating,
      animateFrame,
      handleExpandedChange,
      zIndex,
      hidden,
      userAttributes,
      onContentClick,
      onBlockClick,
      checklistSlot,
      showMadeWith,
      nav,
      actions,
      currentTab,
      currentPage,
      autoExpandedPage,
      showTabBar,
      showBackButton,
      searchQuery,
      setSearchQuery,
      contentListItems: contentListItemsProp,
      onContentListItemClick,
      onLiveChatClick,
      onSearchKnowledgeBase,
      onListAnnouncements,
      onGetAnnouncement,
      onMarkAnnouncementSeen,
      launcherHidden,
    }),
    [
      globalStyle,
      themeSetting,
      data,
      launcherText,
      badgeCount,
      uncompletedCount,
      isOpen,
      isAnimating,
      animateFrame,
      handleExpandedChange,
      zIndex,
      hidden,
      userAttributes,
      onContentClick,
      onBlockClick,
      checklistSlot,
      showMadeWith,
      nav,
      actions,
      currentTab,
      currentPage,
      autoExpandedPage,
      showTabBar,
      showBackButton,
      searchQuery,
      setSearchQuery,
      contentListItemsProp,
      onContentListItemClick,
      onLiveChatClick,
      onSearchKnowledgeBase,
      onListAnnouncements,
      onGetAnnouncement,
      onMarkAnnouncementSeen,
      launcherHidden,
    ],
  );

  return (
    <ResourceCenterRootContext.Provider value={contextValue}>
      {children}
    </ResourceCenterRootContext.Provider>
  );
});

ResourceCenterRoot.displayName = 'ResourceCenterRoot';
