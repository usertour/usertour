import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ResourceCenterContentListBlock,
  ResourceCenterData,
  ResourceCenterNavigationState,
  ResourceCenterPageEntry,
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
import { RC_DEFAULTS } from './constants';

// ============================================================================
// Helper: check if a block is navigable (has a detail view)
// ============================================================================

const isNavigableBlockType = (type: string): boolean =>
  type === ResourceCenterBlockType.SUB_PAGE ||
  type === ResourceCenterBlockType.KNOWLEDGE_BASE ||
  type === ResourceCenterBlockType.CONTENT_LIST;

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
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  onBlockClick?: (blockId: string) => Promise<void>;
  checklistSlot?: React.ReactNode;
  showMadeWith?: boolean;
  contentListItems?: ContentListDisplayItem[];
  onContentListNavigate?: (block: ResourceCenterContentListBlock) => void;
  onContentListItemClick?: (item: ContentListDisplayItem) => void;
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
    themeSettings,
    userAttributes,
    onContentClick,
    onBlockClick,
    checklistSlot,
    showMadeWith = true,
    contentListItems: contentListItemsProp = [],
    onContentListNavigate,
    onContentListItemClick,
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

      // If the tab has exactly one navigable block, auto-push its detail view
      const navigableBlocks = tab.blocks.filter((b) => isNavigableBlockType(b.type));
      if (navigableBlocks.length === 1) {
        const block = navigableBlocks[0];
        const entry = { type: block.type, block } as ResourceCenterPageEntry;
        setNav({ activeTabId: tabId, pageStack: [entry] });

        // Trigger content list fetch if needed
        if (block.type === ResourceCenterBlockType.CONTENT_LIST) {
          onContentListNavigate?.(block as ResourceCenterContentListBlock);
        }
      } else {
        setNav({ activeTabId: tabId, pageStack: [] });
      }
    },
    [data.tabs, onContentListNavigate],
  );

  const push = useCallback(
    (entry: ResourceCenterPageEntry) => {
      // Trigger content list fetch if navigating to a content list
      if (entry.type === ResourceCenterBlockType.CONTENT_LIST) {
        onContentListNavigate?.(entry.block as ResourceCenterContentListBlock);
      }
      setNav((prev) => ({
        ...prev,
        pageStack: [...prev.pageStack, entry],
      }));
    },
    [onContentListNavigate],
  );

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
  const showTabBar = data.tabs.length > 1 && nav.pageStack.length === 0;
  const showBackButton = nav.pageStack.length > 0;

  // ── Animation ───────────────────────────────────────────────────────
  const handleExpandedChange = useCallback(
    async (open: boolean) => {
      const duration =
        themeSetting.resourceCenter?.transitionDuration ?? RC_DEFAULTS.transitionDuration;

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
      userAttributes,
      onContentClick,
      onBlockClick,
      checklistSlot,
      showMadeWith,
      nav,
      actions,
      currentTab,
      currentPage,
      showTabBar,
      showBackButton,
      contentListItems: contentListItemsProp,
      onContentListItemClick,
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
      userAttributes,
      onContentClick,
      onBlockClick,
      checklistSlot,
      showMadeWith,
      nav,
      actions,
      currentTab,
      currentPage,
      showTabBar,
      showBackButton,
      contentListItemsProp,
      onContentListItemClick,
    ],
  );

  return (
    <ResourceCenterRootContext.Provider value={contextValue}>
      {children}
    </ResourceCenterRootContext.Provider>
  );
});

ResourceCenterRoot.displayName = 'ResourceCenterRoot';
