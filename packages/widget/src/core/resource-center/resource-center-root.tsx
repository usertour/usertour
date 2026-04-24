import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ResourceCenterContentListBlock,
  ResourceCenterData,
  ResourceCenterLiveChatBlock,
  ResourceCenterNavigationState,
  ResourceCenterPageEntry,
  ResourceCenterPageRef,
  ResourceCenterSubPageBlock,
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
  type === ResourceCenterBlockType.SUB_PAGE || type === ResourceCenterBlockType.CONTENT_LIST;

interface ResourceCenterRootProps {
  children: React.ReactNode;
  themeSettings: ThemeTypesSetting;
  data: ResourceCenterData;
  animateFrame?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => Promise<void>;
  zIndex: number;
  /** Visually hide the entire RC (CSS visibility:hidden) while keeping it mounted */
  hidden?: boolean;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  onBlockClick?: (blockId: string) => Promise<void>;
  showMadeWith?: boolean;
  contentListItems?: ContentListDisplayItem[];
  onContentListNavigate?: (block: ResourceCenterContentListBlock) => void;
  onContentListItemClick?: (item: ContentListDisplayItem) => void;
  onLiveChatClick?: (block: ResourceCenterLiveChatBlock) => void;
  /** When true, the default launcher is hidden (set via SDK API) */
  launcherHidden?: boolean;
}

export const ResourceCenterRoot = memo((props: ResourceCenterRootProps) => {
  const {
    children,
    data,
    animateFrame = true,
    expanded = false,
    onExpandedChange,
    zIndex,
    hidden = false,
    themeSettings,
    userAttributes,
    onContentClick,
    onBlockClick,
    showMadeWith = true,
    contentListItems: contentListItemsProp = [],
    onContentListNavigate,
    onContentListItemClick,
    onLiveChatClick,
    launcherHidden = false,
  } = props;
  const { globalStyle, themeSetting } = useSettingsStyles(themeSettings);

  const isOpen = expanded;
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimerRef = useRef<number | null>(null);

  // ── Visible tabs ────────────────────────────────────────────────────
  // First tab is always kept (so the RC always has a landing tab, even if
  // conditions currently filter out all its blocks). Subsequent tabs are
  // dropped when empty, so e.g. a "Paid users" tab configured as a single
  // condition-gated content list does not show as an empty slot to free users.
  const visibleTabs = useMemo(
    () => data.tabs.filter((tab, index) => index === 0 || tab.blocks.length > 0),
    [data.tabs],
  );

  // ── Navigation state ────────────────────────────────────────────────
  const defaultTabId = visibleTabs[0]?.id ?? '';

  const [nav, setNav] = useState<ResourceCenterNavigationState>({
    activeTabId: defaultTabId,
    pageStack: [],
  });

  // Reconcile navigation when data changes (tabs restructured, blocks edited/removed,
  // or the active tab becomes empty and is filtered out of visibleTabs).
  // The stack stores only { type, blockId } refs; stale refs (whose block was
  // removed from the current tab) are pruned so the detail view and the
  // back-button state stay consistent.
  useEffect(() => {
    const activeTab = visibleTabs.find((t) => t.id === nav.activeTabId);
    if (!activeTab) {
      setNav({ activeTabId: visibleTabs[0]?.id ?? '', pageStack: [] });
      return;
    }
    const blockIds = new Set(activeTab.blocks.map((b) => b.id));
    const prunedStack = nav.pageStack.filter((ref) => blockIds.has(ref.blockId));
    if (prunedStack.length !== nav.pageStack.length) {
      setNav((prev) => ({ ...prev, pageStack: prunedStack }));
    }
  }, [visibleTabs, nav.activeTabId, nav.pageStack]);

  // ── Navigation actions ──────────────────────────────────────────────
  const switchTab = useCallback(
    (tabId: string) => {
      const tab = visibleTabs.find((t) => t.id === tabId);
      if (!tab) return;
      setNav({ activeTabId: tabId, pageStack: [] });
    },
    [visibleTabs],
  );

  const push = useCallback((ref: ResourceCenterPageRef) => {
    setNav((prev) => ({
      ...prev,
      pageStack: [...prev.pageStack, ref],
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
    () => visibleTabs.find((t) => t.id === nav.activeTabId) ?? visibleTabs[0],
    [visibleTabs, nav.activeTabId],
  );

  // Resolve the top-of-stack ref against the latest tab blocks so admin edits
  // propagate into the open detail view. If the ref no longer resolves, the
  // pruning effect above will clean it up on the next render.
  const currentPage = useMemo<ResourceCenterPageEntry | null>(() => {
    if (nav.pageStack.length === 0) return null;
    const ref = nav.pageStack[nav.pageStack.length - 1];
    const block = currentTab?.blocks.find((b) => b.id === ref.blockId);
    if (!block) return null;
    if (ref.type === ResourceCenterBlockType.SUB_PAGE) {
      return { type: ref.type, block: block as ResourceCenterSubPageBlock };
    }
    return { type: ref.type, block: block as ResourceCenterContentListBlock };
  }, [nav.pageStack, currentTab]);

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

  // Refetch when the block's identity OR its item/visibility configuration changes.
  // Using a stable serialization of the relevant fields avoids thrashing on unrelated
  // session updates while still catching admin edits and condition-driven changes.
  const activeContentListBlockSignature = useMemo(() => {
    if (!activeContentListBlock) return null;
    return JSON.stringify({
      id: activeContentListBlock.id,
      contentItems: activeContentListBlock.contentItems,
      onlyShowBlockConditions: activeContentListBlock.onlyShowBlockConditions,
    });
  }, [activeContentListBlock]);

  useEffect(() => {
    if (activeContentListBlock) {
      onContentListNavigate?.(activeContentListBlock);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContentListBlockSignature]);

  const showTabBar = visibleTabs.length > 1 && currentPage === null;
  const showBackButton = currentPage !== null;

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
      isOpen,
      isAnimating,
      animateFrame,
      handleExpandedChange,
      zIndex,
      hidden,
      userAttributes,
      onContentClick,
      onBlockClick,
      showMadeWith,
      nav,
      actions,
      visibleTabs,
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
      launcherHidden,
    }),
    [
      globalStyle,
      themeSetting,
      data,
      isOpen,
      isAnimating,
      animateFrame,
      handleExpandedChange,
      zIndex,
      hidden,
      userAttributes,
      onContentClick,
      onBlockClick,
      showMadeWith,
      nav,
      actions,
      visibleTabs,
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
