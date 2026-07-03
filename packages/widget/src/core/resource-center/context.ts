import { createContext, useContext } from 'react';
import type {
  AnnouncementDetail,
  AnnouncementListItem,
  ListAnnouncementsResult,
  PopupAnnouncement,
  ResourceCenterContentListBlock,
  ResourceCenterData,
  ResourceCenterLiveChatBlock,
  ResourceCenterNavigationState,
  ResourceCenterPageEntry,
  ResourceCenterPageRef,
  ResourceCenterTab,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';

// ============================================================================
// Announcement feed session cache
// ============================================================================

/**
 * The feed's state for one browsing session (while the panel stays expanded):
 * navigating into a detail page unmounts the list, and without this the Back
 * button would remount it — refetching, re-running the seen side effects, and
 * losing the scroll position. Cleared when the panel collapses, so the next
 * open fetches fresh data again.
 */
export interface AnnouncementFeedCache {
  announcements: AnnouncementListItem[];
  attributes?: Record<string, any>;
  scrollTop: number;
}

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
  push: (ref: ResourceCenterPageRef) => void;
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
  /** Raw theme settings as passed in — the popup falls back to these when the announcement has no theme of its own. */
  themeSettings: ThemeTypesSetting;
  themeSetting: ThemeTypesSetting;
  globalStyle: string;

  // Navigation
  nav: ResourceCenterNavigationState;
  actions: ResourceCenterNavigationActions;

  /**
   * Tabs that should appear in the tab bar. The first tab is always included
   * (even if empty), so users always have a landing tab; subsequent tabs are
   * dropped when their blocks array is empty (e.g. all blocks filtered out by
   * show conditions server-side).
   */
  visibleTabs: ResourceCenterTab[];

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

  // Content list
  contentListItems: ContentListDisplayItem[];
  contentListLoading?: boolean;
  /** Content-list fetch failed — render a retry instead of "No items". */
  contentListError?: boolean;
  /** Re-runs the content-list fetch (used by the error-state retry button). */
  onContentListNavigate?: (block: ResourceCenterContentListBlock) => void;

  // Announcements
  onListAnnouncements?: () => Promise<ListAnnouncementsResult | null>;
  onGetAnnouncement?: (contentId: string) => Promise<AnnouncementDetail | null>;
  onMarkAnnouncementsSeen?: (items: { contentId: string }[]) => Promise<boolean>;
  /** The gated popup payload — when set, the popup renders (gating lives in the SDK). */
  popupAnnouncement?: PopupAnnouncement;
  /** Any popup interaction (close, backdrop, read more, content action) — marks seen and hides. */
  onPopupDismiss?: () => void;
  /** Mutable on purpose: reads/writes must not re-render the tree. */
  announcementFeedCache: React.MutableRefObject<AnnouncementFeedCache | null>;
  /** The body's scroll container — pages read/restore their scroll position through it. */
  bodyScrollRef: React.RefObject<HTMLDivElement>;

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
