import type { PopupAnnouncement } from './announcement';
import type { ContentEditorRoot } from './editor';
import type { RulesCondition } from './config';
import type { LauncherIconSource } from './launcher';
import type { RichTextNode } from './common';

// ============================================================================
// Block Type Enum
// ============================================================================

export enum ResourceCenterBlockType {
  ACTION = 'action',
  RICH_TEXT = 'richtext',
  DIVIDER = 'divider',
  SUB_PAGE = 'sub-page',
  CONTENT_LIST = 'content-list',
  LIVE_CHAT = 'live-chat',
  ANNOUNCEMENT = 'announcement',
}

// ============================================================================
// Block Condition Fields (shared by all blocks — used by builder, ignored by widget)
// ============================================================================

export interface ResourceCenterBlockConditionFields {
  onlyShowBlock: boolean;
  onlyShowBlockConditions: RulesCondition[];
  isVisible?: boolean;
}

// ============================================================================
// Block Definitions
// ============================================================================

export interface ResourceCenterRichTextBlock extends ResourceCenterBlockConditionFields {
  id: string;
  name?: string;
  type: ResourceCenterBlockType.RICH_TEXT;
  content: ContentEditorRoot[];
}

export interface ResourceCenterDividerBlock extends ResourceCenterBlockConditionFields {
  id: string;
  name?: string;
  type: ResourceCenterBlockType.DIVIDER;
}

export interface ResourceCenterActionBlock extends ResourceCenterBlockConditionFields {
  id: string;
  name: RichTextNode[];
  type: ResourceCenterBlockType.ACTION;
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
  clickedActions: RulesCondition[];
}

export interface ResourceCenterSubPageBlock extends ResourceCenterBlockConditionFields {
  id: string;
  name: RichTextNode[];
  type: ResourceCenterBlockType.SUB_PAGE;
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
  content: ContentEditorRoot[];
}

export enum LiveChatProvider {
  CRISP = 'crisp',
  CUSTOM = 'custom',
  FRESHCHAT = 'freshchat',
  HELP_SCOUT = 'help-scout',
  HUBSPOT = 'hubspot',
  INTERCOM = 'intercom',
  ZENDESK_CLASSIC = 'zendesk-classic',
  ZENDESK_MESSENGER = 'zendesk-messenger',
}

export interface ResourceCenterLiveChatBlock extends ResourceCenterBlockConditionFields {
  id: string;
  name: RichTextNode[];
  type: ResourceCenterBlockType.LIVE_CHAT;
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
  liveChatProvider: LiveChatProvider;
  customLiveChatCode: string;
}

export interface ResourceCenterAnnouncementBlock extends ResourceCenterBlockConditionFields {
  id: string;
  name: RichTextNode[];
  type: ResourceCenterBlockType.ANNOUNCEMENT;
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
}

export interface ContentListItem {
  contentId: string;
  contentType: 'flow' | 'checklist';
  /**
   * Optional display name for this list entry; empty falls back to the
   * content's admin name. Lives in the resource center's own version data,
   * which makes it part of the resource center's translatable surface — the
   * admin name itself never localizes.
   */
  label?: string;
  iconSource?: LauncherIconSource;
  iconType?: string;
  iconUrl?: string;
  navigateUrl?: RichTextNode[];
  navigateOpenType?: 'same' | 'new';
  onlyShowItem: boolean;
  onlyShowItemConditions: RulesCondition[];
  isVisible?: boolean;
}

export interface ResourceCenterContentListBlock extends ResourceCenterBlockConditionFields {
  id: string;
  name: RichTextNode[];
  type: ResourceCenterBlockType.CONTENT_LIST;
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
  flowIconSource: LauncherIconSource;
  flowIconType: string;
  flowIconUrl?: string;
  checklistIconSource: LauncherIconSource;
  checklistIconType: string;
  checklistIconUrl?: string;
  showSearchField: boolean;
  contentItems: ContentListItem[];
}

/** Union of all block types. */
export type ResourceCenterBlock =
  | ResourceCenterRichTextBlock
  | ResourceCenterDividerBlock
  | ResourceCenterActionBlock
  | ResourceCenterSubPageBlock
  | ResourceCenterContentListBlock
  | ResourceCenterLiveChatBlock
  | ResourceCenterAnnouncementBlock;

/** Navigable block types — blocks that push a detail view when clicked. */
export type ResourceCenterNavigableBlock =
  | ResourceCenterSubPageBlock
  | ResourceCenterContentListBlock
  | ResourceCenterAnnouncementBlock;

// ============================================================================
// Tab
// ============================================================================

export interface ResourceCenterTab {
  id: string;
  name: string;
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
  blocks: ResourceCenterBlock[];
}

// ============================================================================
// Resource Center Data
// ============================================================================

export interface ResourceCenterData {
  buttonText: string;
  headerText: string;
  tabs: ResourceCenterTab[];
  /**
   * Number of unread announcements for this user (populated by server at
   * session build time). Announcement state is global — the block is only a
   * navigation entry — so this lives here, not on the block. Absent when the
   * resource center has no announcement block.
   */
  announcementUnreadCount?: number;
  /**
   * The newest unseen POPUP-level announcement for this user (populated by
   * server at session build time, like announcementUnreadCount). Absent when
   * there is nothing to pop or the resource center has no announcement block.
   */
  popupAnnouncement?: PopupAnnouncement;
}

// ============================================================================
// Navigation (used by widget)
// ============================================================================

/**
 * Derived page shape used by the widget to render a detail view. The `block`
 * is resolved from the latest `ResourceCenterData` on every render. The
 * `announcement_detail` page additionally carries the id of the single
 * announcement being viewed (not a block — the announcement content is fetched
 * on demand from the server).
 */
export type ResourceCenterPageEntry =
  | { type: ResourceCenterBlockType.SUB_PAGE; block: ResourceCenterSubPageBlock }
  | { type: ResourceCenterBlockType.CONTENT_LIST; block: ResourceCenterContentListBlock }
  | { type: ResourceCenterBlockType.ANNOUNCEMENT; block: ResourceCenterAnnouncementBlock }
  | {
      type: 'announcement_detail';
      block: ResourceCenterAnnouncementBlock;
      announcementId: string;
    };

/**
 * Stored page reference. The stack keeps only an id + type so admin edits
 * (content, contentItems, visibility) propagate into the open detail view. The
 * `announcement_detail` ref also stores `announcementId` — a detail-request
 * parameter that does not resolve to a block, so it is safe to persist here.
 */
export type ResourceCenterPageRef =
  | {
      type:
        | ResourceCenterBlockType.SUB_PAGE
        | ResourceCenterBlockType.CONTENT_LIST
        | ResourceCenterBlockType.ANNOUNCEMENT;
      blockId: string;
    }
  | { type: 'announcement_detail'; blockId: string; announcementId: string };

export interface ResourceCenterNavigationState {
  activeTabId: string;
  pageStack: ResourceCenterPageRef[];
}
