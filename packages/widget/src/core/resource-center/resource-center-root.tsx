import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ResourceCenterContactBlock,
  ResourceCenterContentListBlock,
  ResourceCenterData,
  ResourceCenterKnowledgeBaseBlock,
  ResourceCenterSubPageBlock,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import { ResourceCenterBlockType } from '@usertour/types';
import { useSettingsStyles } from '../hooks/use-settings-styles';
import {
  ResourceCenterRootContext,
  type ContactPageType,
  type ContentListDisplayItem,
  type TabBarBlock,
} from './context';
import { RC_DEFAULTS } from './constants';

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
  onLiveChatClick?: (block: ResourceCenterContactBlock) => void;
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
    onLiveChatClick,
    contentListItems: contentListItemsProp = [],
    onContentListNavigate,
    onContentListItemClick,
  } = props;
  const { globalStyle, themeSetting } = useSettingsStyles(themeSettings);

  const isOpen = expanded;
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeSubPage, setActiveSubPage] = useState<ResourceCenterSubPageBlock | null>(null);
  const [activeKnowledgeBase, setActiveKnowledgeBase] =
    useState<ResourceCenterKnowledgeBaseBlock | null>(null);
  const [activeContactPage, setActiveContactPage] = useState<{
    block: ResourceCenterContactBlock;
    page: ContactPageType;
  } | null>(null);
  const [activeContentList, setActiveContentList] = useState<ResourceCenterContentListBlock | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const animationTimerRef = useRef<number | null>(null);

  // Compute tab bar blocks (blocks with showInTabBar=true)
  const tabBarBlocks = useMemo(() => {
    return data.blocks.filter(
      (b): b is TabBarBlock =>
        (b.type === ResourceCenterBlockType.SUB_PAGE ||
          b.type === ResourceCenterBlockType.KNOWLEDGE_BASE ||
          b.type === ResourceCenterBlockType.CONTENT_LIST) &&
        b.showInTabBar === true,
    );
  }, [data.blocks]);

  const hasTabBar = tabBarBlocks.length > 0;

  const navigateToSubPage = useCallback((block: ResourceCenterSubPageBlock) => {
    setActiveSubPage(block);
    setActiveKnowledgeBase(null);
    setActiveContactPage(null);
    setActiveContentList(null);
  }, []);

  const navigateToKnowledgeBase = useCallback((block: ResourceCenterKnowledgeBaseBlock) => {
    setActiveKnowledgeBase(block);
    setActiveSubPage(null);
    setActiveContactPage(null);
    setActiveContentList(null);
  }, []);

  const navigateToContactPage = useCallback(
    (block: ResourceCenterContactBlock, page: ContactPageType) => {
      setActiveContactPage({ block, page });
      setActiveSubPage(null);
      setActiveKnowledgeBase(null);
      setActiveContentList(null);
    },
    [],
  );

  const navigateToContentList = useCallback(
    (block: ResourceCenterContentListBlock) => {
      setActiveContentList(block);
      setActiveSubPage(null);
      setActiveKnowledgeBase(null);
      setActiveContactPage(null);
      onContentListNavigate?.(block);
    },
    [onContentListNavigate],
  );

  const navigateToTab = useCallback(
    (blockId: string | null) => {
      // Clear any deeper navigation state
      setActiveSubPage(null);
      setActiveKnowledgeBase(null);
      setActiveContactPage(null);
      setActiveContentList(null);
      setActiveTab(blockId);

      // When navigating to a tab, auto-navigate to the block's content view
      if (blockId !== null) {
        const block = data.blocks.find((b) => b.id === blockId);
        if (block) {
          if (block.type === ResourceCenterBlockType.SUB_PAGE) {
            setActiveSubPage(block as ResourceCenterSubPageBlock);
          } else if (block.type === ResourceCenterBlockType.KNOWLEDGE_BASE) {
            setActiveKnowledgeBase(block as ResourceCenterKnowledgeBaseBlock);
          } else if (block.type === ResourceCenterBlockType.CONTENT_LIST) {
            const clBlock = block as ResourceCenterContentListBlock;
            setActiveContentList(clBlock);
            onContentListNavigate?.(clBlock);
          }
        }
      }
    },
    [data.blocks, onContentListNavigate],
  );

  const navigateBack = useCallback(() => {
    // If on a tab (first-level page), back goes to Home
    if (activeTab !== null) {
      setActiveTab(null);
      setActiveSubPage(null);
      setActiveKnowledgeBase(null);
      setActiveContactPage(null);
      setActiveContentList(null);
      return;
    }
    // Otherwise, clear the secondary page
    setActiveSubPage(null);
    setActiveKnowledgeBase(null);
    setActiveContactPage(null);
    setActiveContentList(null);
  }, [activeTab]);

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

  // A page is "secondary" (shows back button, hides tab bar) when navigating
  // to a sub-page/kb/contact/content-list from Home (i.e. not via a tab).
  // Tab pages are first-level (no back button, tab bar visible).
  const isSecondaryPage =
    activeTab === null &&
    !!(activeSubPage || activeKnowledgeBase || activeContactPage || activeContentList);

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
      isSecondaryPage,
      activeSubPage,
      navigateToSubPage,
      activeKnowledgeBase,
      navigateToKnowledgeBase,
      activeContactPage,
      navigateToContactPage,
      onLiveChatClick,
      navigateBack,
      activeContentList,
      navigateToContentList,
      contentListItems: contentListItemsProp,
      onContentListItemClick,
      tabBarBlocks,
      activeTab,
      navigateToTab,
      hasTabBar,
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
      isSecondaryPage,
      activeSubPage,
      navigateToSubPage,
      activeKnowledgeBase,
      navigateToKnowledgeBase,
      activeContactPage,
      navigateToContactPage,
      onLiveChatClick,
      navigateBack,
      activeContentList,
      navigateToContentList,
      contentListItemsProp,
      onContentListItemClick,
      tabBarBlocks,
      activeTab,
      navigateToTab,
      hasTabBar,
    ],
  );

  return (
    <ResourceCenterRootContext.Provider value={contextValue}>
      {children}
    </ResourceCenterRootContext.Provider>
  );
});

ResourceCenterRoot.displayName = 'ResourceCenterRoot';
