import { createContext, useContext } from 'react';
import type {
  ResourceCenterData,
  ResourceCenterLiveChatBlock,
  ResourceCenterNavigationState,
  ResourceCenterPageEntry,
  ResourceCenterTab,
  SearchKnowledgeBaseResult,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';

// ============================================================================
// Content list display item (resolved from ResourceCenterBlockContentItem)
// ============================================================================

export interface ContentListDisplayItem {
  contentId: string;
  contentType: 'flow' | 'checklist';
  name: string;
  iconSource?: string;
  iconType?: string;
  iconUrl?: string;
  navigateUrl?: unknown[];
  navigateOpenType?: 'same' | 'new';
}

// ============================================================================
// Navigation actions
// ============================================================================

export interface ResourceCenterNavigationActions {
  /** Switch to a tab by ID. Clears the page stack. */
  switchTab: (tabId: string) => void;
  /** Push a detail page onto the stack. */
  push: (entry: ResourceCenterPageEntry) => void;
  /** Pop the top page off the stack. If stack is empty, does nothing. */
  pop: () => void;
  /** Clear the entire page stack, staying on the current tab. */
  popToRoot: () => void;
}

// ============================================================================
// Context value
// ============================================================================

export interface ResourceCenterContextValue {
  // Config
  data: ResourceCenterData;
  themeSetting: ThemeTypesSetting;
  globalStyle: string;

  // Navigation
  nav: ResourceCenterNavigationState;
  actions: ResourceCenterNavigationActions;

  // Derived navigation state
  currentTab: ResourceCenterTab;
  currentPage: ResourceCenterPageEntry | null;
  autoExpandedPage: ResourceCenterPageEntry | null;
  showTabBar: boolean;
  showBackButton: boolean;

  // UI state
  isOpen: boolean;
  isAnimating: boolean;
  animateFrame: boolean;
  handleExpandedChange: (expanded: boolean) => Promise<void>;
  zIndex: number;
  /** When true, the entire RC panel is visually hidden (CSS visibility:hidden) but stays mounted */
  hidden: boolean;

  // External data & callbacks
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  onBlockClick?: (blockId: string) => Promise<void>;
  onContentListItemClick?: (item: ContentListDisplayItem) => void;
  onLiveChatClick?: (block: ResourceCenterLiveChatBlock) => void;
  onSearchKnowledgeBase?: (
    blockId: string,
    query: string,
    offset: number,
  ) => Promise<SearchKnowledgeBaseResult>;

  // Content list
  contentListItems: ContentListDisplayItem[];

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  showMadeWith: boolean;

  // Launcher
  badgeCount: number;
  /** When true, the default launcher is hidden (set via SDK API) */
  launcherHidden: boolean;
}

export const ResourceCenterRootContext = createContext<ResourceCenterContextValue | null>(null);

export const useResourceCenterContext = () => {
  const context = useContext(ResourceCenterRootContext);
  if (!context) {
    throw new Error('useResourceCenterContext must be used within a ResourceCenterRoot.');
  }
  return context;
};
