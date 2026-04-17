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
  KNOWLEDGE_BASE = 'knowledge-base',
  LIVE_CHAT = 'live-chat',
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

export enum KnowledgeBaseSearchProvider {
  FRESHDESK = 'freshdesk',
  HUBSPOT = 'hubspot',
  ZENDESK = 'zendesk',
}

export interface ResourceCenterKnowledgeBaseBlock extends ResourceCenterBlockConditionFields {
  id: string;
  name: RichTextNode[];
  type: ResourceCenterBlockType.KNOWLEDGE_BASE;
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
  searchProvider: KnowledgeBaseSearchProvider;
  knowledgeBaseUrl: string;
  defaultSearchQuery: string;
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

export interface ContentListItem {
  contentId: string;
  contentType: 'flow' | 'checklist';
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
  | ResourceCenterKnowledgeBaseBlock
  | ResourceCenterContentListBlock
  | ResourceCenterLiveChatBlock;

/** Navigable block types — blocks that push a detail view when clicked. */
export type ResourceCenterNavigableBlock =
  | ResourceCenterSubPageBlock
  | ResourceCenterKnowledgeBaseBlock
  | ResourceCenterContentListBlock;

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
}

export const DEFAULT_RESOURCE_CENTER_DATA: ResourceCenterData = {
  buttonText: 'Help',
  headerText: 'Resource Center',
  tabs: [],
};

// ============================================================================
// Navigation (used by widget)
// ============================================================================

export type ResourceCenterPageEntry =
  | { type: ResourceCenterBlockType.SUB_PAGE; block: ResourceCenterSubPageBlock }
  | { type: ResourceCenterBlockType.KNOWLEDGE_BASE; block: ResourceCenterKnowledgeBaseBlock }
  | { type: ResourceCenterBlockType.CONTENT_LIST; block: ResourceCenterContentListBlock };

export interface ResourceCenterNavigationState {
  activeTabId: string;
  pageStack: ResourceCenterPageEntry[];
}
