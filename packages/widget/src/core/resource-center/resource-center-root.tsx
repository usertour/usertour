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
import { useSettingsStyles } from '../hooks/use-settings-styles';
import {
  ResourceCenterRootContext,
  type ContactPageType,
  type ContentListDisplayItem,
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
  const animationTimerRef = useRef<number | null>(null);

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

  const navigateBack = useCallback(() => {
    setActiveSubPage(null);
    setActiveKnowledgeBase(null);
    setActiveContactPage(null);
    setActiveContentList(null);
  }, []);

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

  const isSecondaryPage = !!(
    activeSubPage ||
    activeKnowledgeBase ||
    activeContactPage ||
    activeContentList
  );

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
    ],
  );

  return (
    <ResourceCenterRootContext.Provider value={contextValue}>
      {children}
    </ResourceCenterRootContext.Provider>
  );
});

ResourceCenterRoot.displayName = 'ResourceCenterRoot';
