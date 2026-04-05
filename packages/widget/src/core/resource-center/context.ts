import { createContext, useContext } from 'react';
import type {
  ResourceCenterContactBlock,
  ResourceCenterContentListBlock,
  ResourceCenterData,
  ResourceCenterKnowledgeBaseBlock,
  ResourceCenterSubPageBlock,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';

export type ContactPageType = 'email' | 'phone';

export interface ContentListDisplayItem {
  contentId: string;
  contentType: 'flow' | 'checklist';
  name: string;
}

/** A block that supports showInTabBar */
export type TabBarBlock =
  | ResourceCenterSubPageBlock
  | ResourceCenterKnowledgeBaseBlock
  | ResourceCenterContentListBlock;

export interface ResourceCenterContextValue {
  globalStyle: string;
  themeSetting: ThemeTypesSetting;
  data: ResourceCenterData;
  launcherText?: string;
  badgeCount: number;
  uncompletedCount: number;
  isOpen: boolean;
  isAnimating: boolean;
  animateFrame: boolean;
  handleExpandedChange: (expanded: boolean) => Promise<void>;
  zIndex: number;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  onBlockClick?: (blockId: string) => Promise<void>;
  checklistSlot?: React.ReactNode;
  showMadeWith: boolean;
  isSecondaryPage: boolean;
  activeSubPage: ResourceCenterSubPageBlock | null;
  navigateToSubPage: (block: ResourceCenterSubPageBlock) => void;
  activeKnowledgeBase: ResourceCenterKnowledgeBaseBlock | null;
  navigateToKnowledgeBase: (block: ResourceCenterKnowledgeBaseBlock) => void;
  activeContactPage: { block: ResourceCenterContactBlock; page: ContactPageType } | null;
  navigateToContactPage: (block: ResourceCenterContactBlock, page: ContactPageType) => void;
  onLiveChatClick?: (block: ResourceCenterContactBlock) => void;
  activeContentList: ResourceCenterContentListBlock | null;
  navigateToContentList: (block: ResourceCenterContentListBlock) => void;
  contentListItems: ContentListDisplayItem[];
  onContentListItemClick?: (item: ContentListDisplayItem) => void;
  navigateBack: () => void;
  /** Tab bar blocks (blocks with showInTabBar=true). Empty when no tab bar. */
  tabBarBlocks: TabBarBlock[];
  /** Currently active tab block ID, or null for Home tab */
  activeTab: string | null;
  /** Navigate to a specific tab (block ID or null for Home) */
  navigateToTab: (blockId: string | null) => void;
  /** Whether the tab bar should be visible */
  hasTabBar: boolean;
}

export const ResourceCenterRootContext = createContext<ResourceCenterContextValue | null>(null);

export const useResourceCenterContext = () => {
  const context = useContext(ResourceCenterRootContext);
  if (!context) {
    throw new Error('useResourceCenterContext must be used within a ResourceCenterRoot.');
  }
  return context;
};
