import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ResourceCenterContactBlock,
  ResourceCenterData,
  ResourceCenterKnowledgeBaseBlock,
  ResourceCenterSubPageBlock,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import { useSettingsStyles } from '../hooks/use-settings-styles';
import { ResourceCenterRootContext, type ContactPageType } from './context';
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
  const animationTimerRef = useRef<number | null>(null);

  const navigateToSubPage = useCallback((block: ResourceCenterSubPageBlock) => {
    setActiveSubPage(block);
    setActiveKnowledgeBase(null);
    setActiveContactPage(null);
  }, []);

  const navigateToKnowledgeBase = useCallback((block: ResourceCenterKnowledgeBaseBlock) => {
    setActiveKnowledgeBase(block);
    setActiveSubPage(null);
    setActiveContactPage(null);
  }, []);

  const navigateToContactPage = useCallback(
    (block: ResourceCenterContactBlock, page: ContactPageType) => {
      setActiveContactPage({ block, page });
      setActiveSubPage(null);
      setActiveKnowledgeBase(null);
    },
    [],
  );

  const navigateBack = useCallback(() => {
    setActiveSubPage(null);
    setActiveKnowledgeBase(null);
    setActiveContactPage(null);
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
      activeSubPage,
      navigateToSubPage,
      activeKnowledgeBase,
      navigateToKnowledgeBase,
      activeContactPage,
      navigateToContactPage,
      onLiveChatClick,
      navigateBack,
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
      activeSubPage,
      navigateToSubPage,
      activeKnowledgeBase,
      navigateToKnowledgeBase,
      activeContactPage,
      navigateToContactPage,
      onLiveChatClick,
      navigateBack,
    ],
  );

  return (
    <ResourceCenterRootContext.Provider value={contextValue}>
      {children}
    </ResourceCenterRootContext.Provider>
  );
});

ResourceCenterRoot.displayName = 'ResourceCenterRoot';
