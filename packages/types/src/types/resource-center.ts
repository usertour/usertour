import type { ContentEditorRoot } from './editor';
import type { RulesCondition } from './config';
import type { LauncherIconSource } from './launcher';

// ============================================================================
// Block Type Enum
// ============================================================================

export enum ResourceCenterBlockType {
  ACTION = 'action',
  MESSAGE = 'message',
  DIVIDER = 'divider',
  SUB_PAGE = 'sub-page',
  CONTACT = 'contact',
  CONTENT_LIST = 'content-list',
  AI_ASSISTANT = 'ai-assistant',
  ANNOUNCEMENTS = 'announcements',
  KNOWLEDGE_BASE = 'knowledge-base',
  CHECKLIST = 'checklist',
}

// ============================================================================
// Block Definitions
// ============================================================================

export interface ResourceCenterMessageBlock {
  id: string;
  name?: string;
  type: ResourceCenterBlockType.MESSAGE;
  content: ContentEditorRoot[];
  onlyShowTask: boolean;
  onlyShowTaskConditions: RulesCondition[];
}

export interface ResourceCenterChecklistBlock {
  id: string;
  name?: string;
  type: ResourceCenterBlockType.CHECKLIST;
  onlyShowTask: boolean;
  onlyShowTaskConditions: RulesCondition[];
}

export interface ResourceCenterDividerBlock {
  id: string;
  name?: string;
  type: ResourceCenterBlockType.DIVIDER;
  onlyShowTask: boolean;
  onlyShowTaskConditions: RulesCondition[];
}

export interface ResourceCenterActionBlock {
  id: string;
  name: string;
  type: ResourceCenterBlockType.ACTION;
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
  clickedActions: RulesCondition[];
  onlyShowTask: boolean;
  onlyShowTaskConditions: RulesCondition[];
}

export interface ResourceCenterSubPageBlock {
  id: string;
  name: string;
  type: ResourceCenterBlockType.SUB_PAGE;
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
  content: ContentEditorRoot[];
  onlyShowTask: boolean;
  onlyShowTaskConditions: RulesCondition[];
}

export enum KnowledgeBaseSearchProvider {
  GOOGLE = 'google',
  FRESHDESK = 'freshdesk',
  HUBSPOT = 'hubspot',
  ZENDESK = 'zendesk',
}

export interface ResourceCenterKnowledgeBaseBlock {
  id: string;
  name: string;
  type: ResourceCenterBlockType.KNOWLEDGE_BASE;
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
  searchProvider: KnowledgeBaseSearchProvider;
  knowledgeBaseUrl: string;
  defaultSearchQuery: string;
  onlyShowTask: boolean;
  onlyShowTaskConditions: RulesCondition[];
}

/** Union of all implemented block types. */
export type ResourceCenterBlock =
  | ResourceCenterMessageBlock
  | ResourceCenterChecklistBlock
  | ResourceCenterDividerBlock
  | ResourceCenterActionBlock
  | ResourceCenterSubPageBlock
  | ResourceCenterKnowledgeBaseBlock;

// ============================================================================
// Resource Center Data
// ============================================================================

export interface ResourceCenterData {
  buttonText: string;
  headerText: string;
  blocks: ResourceCenterBlock[];
}

export const DEFAULT_RESOURCE_CENTER_DATA: ResourceCenterData = {
  buttonText: 'Help',
  headerText: 'Resource Center',
  blocks: [],
};

// ============================================================================
// Theme Settings
// ============================================================================

export type ResourceCenterPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ResourceCenterThemeSettings = {
  placement: ResourceCenterPlacement;
  offsetX: number;
  offsetY: number;
  normalWidth: number;
  largeWidth: number;
  maxHeight?: number;
  zIndex?: number;
  transitionDuration: number;
  dividerLines: boolean;
};

export type ResourceCenterLauncherIconType =
  | 'default-question-mark'
  | 'plaintext-question-mark'
  | 'custom';

export type ResourceCenterLauncherTextMode =
  | 'active-checklist-text'
  | 'resource-center-text'
  | 'no-text';

export type ResourceCenterLauncherButtonThemeSettings = {
  iconType: ResourceCenterLauncherIconType;
  iconUrl?: string;
  height: number;
  imageHeight: number;
  borderRadius: number | null;
  textMode: ResourceCenterLauncherTextMode;
  showRemainingTasks: boolean;
};

export type ResourceCenterUnreadBadgeThemeSettings = {
  backgroundColor: string;
  textColor: string;
};
