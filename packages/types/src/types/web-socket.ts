import { AttributeBizTypes, BizAttributeTypes } from './attribute';
import { BannerData } from './banner';
import { ChecklistData } from './checklist';
import { Content, ContentDataType, Step } from './contents';
import { ContentConfigObject, RulesCondition } from './config';
import { LauncherData } from './launcher';
import { ResourceCenterData } from './resource-center';
import { ClientContext, contentStartReason } from './sdk';
import { Theme } from './theme';

// ============================================================================
// Core Interfaces and Enums
// ============================================================================

/**
 * Socket authentication data structure
 * Defines the expected structure for socket handshake auth data
 */
export interface SocketAuthData {
  clientContext: ClientContext;
  externalUserId?: string;
  externalCompanyId?: string;
  clientConditions?: ClientCondition[];
  launchers?: string[];
  token?: string;
  flowSessionId?: string;
  checklistSessionId?: string;
  bannerSessionId?: string;
  resourceCenterSessionId?: string;
}

/**
 * WebSocket event names used for communication between client and server
 */
export enum WebSocketEvents {
  // Unified incoming event (from server)
  SERVER_MESSAGE = 'server-message',

  // Unified outgoing event (to server)
  CLIENT_MESSAGE = 'client-message',
}

// ============================================================================
// Message Kind Enums
// ============================================================================

/**
 * Client message kinds (Client -> Server)
 * Using PascalCase for consistency
 */
export enum ClientMessageKind {
  UPSERT_USER = 'UpsertUser',
  UPSERT_COMPANY = 'UpsertCompany',
  TRACK_EVENT = 'TrackEvent',
  START_CONTENT = 'StartContent',
  END_CONTENT = 'EndContent',
  GO_TO_STEP = 'GoToStep',
  ANSWER_QUESTION = 'AnswerQuestion',
  CLICK_CHECKLIST_TASK = 'ClickChecklistTask',
  HIDE_CHECKLIST = 'HideChecklist',
  SHOW_CHECKLIST = 'ShowChecklist',
  UPDATE_CLIENT_CONTEXT = 'UpdateClientContext',
  REPORT_TOOLTIP_TARGET_MISSING = 'ReportTooltipTargetMissing',
  TOGGLE_CLIENT_CONDITION = 'ToggleClientCondition',
  FIRE_CONDITION_WAIT_TIMER = 'FireConditionWaitTimer',
  ACTIVATE_LAUNCHER = 'ActivateLauncher',
  DISMISS_LAUNCHER = 'DismissLauncher',
  TRACK_TRACKER_EVENT = 'TrackTrackerEvent',
  OPEN_RESOURCE_CENTER = 'OpenResourceCenter',
  CLOSE_RESOURCE_CENTER = 'CloseResourceCenter',
  CLICK_RESOURCE_CENTER = 'ClickResourceCenter',
  LIST_RESOURCE_CENTER_BLOCK_CONTENT = 'ListResourceCenterBlockContent',
  SEARCH_KNOWLEDGE_BASE = 'SearchKnowledgeBase',
  BEGIN_BATCH = 'BeginBatch',
  END_BATCH = 'EndBatch',
  END_ALL_CONTENT = 'EndAllContent',
}

/**
 * Server message kinds (Server -> Client)
 * Using PascalCase for consistency
 */
export enum ServerMessageKind {
  SET_FLOW_SESSION = 'SetFlowSession',
  SET_CHECKLIST_SESSION = 'SetChecklistSession',
  SET_BANNER_SESSION = 'SetBannerSession',
  SET_RESOURCE_CENTER_SESSION = 'SetResourceCenterSession',
  UNSET_FLOW_SESSION = 'UnsetFlowSession',
  UNSET_CHECKLIST_SESSION = 'UnsetChecklistSession',
  UNSET_BANNER_SESSION = 'UnsetBannerSession',
  UNSET_RESOURCE_CENTER_SESSION = 'UnsetResourceCenterSession',
  ADD_LAUNCHER = 'AddLauncher',
  REMOVE_LAUNCHER = 'RemoveLauncher',
  ADD_TRACKER = 'AddTracker',
  REMOVE_TRACKER = 'RemoveTracker',
  FORCE_GO_TO_STEP = 'ForceGoToStep',
  TRACK_CLIENT_CONDITION = 'TrackClientCondition',
  UNTRACK_CLIENT_CONDITION = 'UntrackClientCondition',
  START_CONDITION_WAIT_TIMER = 'StartConditionWaitTimer',
  CANCEL_CONDITION_WAIT_TIMER = 'CancelConditionWaitTimer',
  CHECKLIST_TASK_COMPLETED = 'ChecklistTaskCompleted',
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Project configuration
 */
export type ProjectConfig = {
  removeBranding: boolean;
  planType: string;
};

// ============================================================================
// Business Data Operation DTOs
// ============================================================================

/**
 * Upsert user request
 */
export type UpsertUserDto = {
  externalUserId: string;
  attributes?: Record<string, any>;
};

/**
 * Upsert company request
 */
export type UpsertCompanyDto = {
  externalCompanyId: string;
  externalUserId: string;
  attributes?: Record<string, any>;
  membership?: Record<string, any>;
};

/**
 * Track event request
 */
export type TrackEventDto = {
  name: string;
  attributes?: Record<string, any>;
  userOnly?: boolean;
};

/**
 * Identity request (for testing)
 */
export type IdentityDto = {
  data: number;
};

// ============================================================================
// Content Management DTOs
// ============================================================================

/**
 * Start content request
 */
export type StartContentDto = {
  contentId: string;
  startReason: contentStartReason;
  stepCvid?: string;
  once?: boolean;
  continue?: boolean; // If true, continue the content if it's in progress. Default is false (restart)
};

/**
 * End content request
 */
export type EndContentDto = {
  sessionId: string;
  endReason: string;
};

/**
 * Go to step request
 */
export type GoToStepDto = {
  sessionId: string;
  stepId: string;
};

/**
 * Answer question request
 */
export type AnswerQuestionDto = {
  questionCvid: string;
  questionName: string;
  questionType: string;
  sessionId: string;
  listAnswer?: string[];
  numberAnswer?: number;
  textAnswer?: string;
};

// ============================================================================
// Checklist DTOs
// ============================================================================

/**
 * Click checklist task request
 */
export type ClickChecklistTaskDto = {
  sessionId: string;
  taskId: string;
};

/**
 * Hide checklist request
 */
export type HideChecklistDto = {
  sessionId: string;
};

/**
 * Show checklist request
 */
export type ShowChecklistDto = {
  sessionId: string;
};

// ============================================================================
// Tooltip DTOs
// ============================================================================

/**
 * Report tooltip target missing request
 */
export type TooltipTargetMissingDto = {
  sessionId: string;
  stepId: string;
};

// ============================================================================
// Condition and Launcher DTOs
// ============================================================================

/**
 * Fire condition wait timer request
 */
export type FireConditionWaitTimerDto = {
  versionId: string;
};

/**
 * Track tracker event request
 */
export type TrackTrackerEventDto = {
  contentId: string;
  versionId: string;
};

/**
 * Activate launcher request
 */
export type ActivateLauncherDto = {
  sessionId: string;
};

/**
 * Dismiss launcher request
 */
export type DismissLauncherDto = {
  sessionId: string;
  endReason: string;
};

// ============================================================================
// Resource Center DTOs
// ============================================================================

/**
 * Open resource center request
 */
export type OpenResourceCenterDto = {
  sessionId: string;
};

/**
 * Close resource center request
 */
export type CloseResourceCenterDto = {
  sessionId: string;
};

/**
 * Click resource center block request
 */
export type ClickResourceCenterDto = {
  sessionId: string;
  blockId: string;
};

/**
 * List resource center block content request
 */
export type ListResourceCenterBlockContentDto = {
  sessionId: string;
  blockId: string;
};

/**
 * List resource center block content response item
 */
export type ResourceCenterBlockContentItem = {
  contentId: string;
  contentType: 'flow' | 'checklist';
  name: string;
  iconSource?: string;
  iconType?: string;
  iconUrl?: string;
  navigateUrl?: unknown[];
  navigateOpenType?: 'same' | 'new';
};

/**
 * Search knowledge base request
 */
export type SearchKnowledgeBaseDto = {
  sessionId: string;
  blockId: string;
  query: string;
  offset: number;
};

/**
 * Search knowledge base response
 */
export type SearchKnowledgeBaseResult = {
  articles: KnowledgeBaseArticleItem[];
  total: number;
};

/**
 * Knowledge base article item
 */
export type KnowledgeBaseArticleItem = {
  title: string;
  snippet: string;
  url: string;
};

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session attribute with value
 */
export type SessionAttribute = {
  id: string;
  codeName: string;
  bizType: AttributeBizTypes;
  dataType: BizAttributeTypes;
  value: any;
};

/**
 * Session theme with optional attributes
 */
export type SessionTheme = Pick<Theme, 'settings' | 'variations'> & {
  attributes?: SessionAttribute[];
};

/**
 * Session step with optional theme
 */
export type SessionStep = Step & {
  theme?: SessionTheme;
};

/**
 * Custom content session data
 */
export type CustomContentSession = {
  id?: string;
  type: ContentDataType;
  draftMode: boolean;
  attributes: SessionAttribute[];
  content: Pick<Content, 'id' | 'name' | 'type'> & {
    project: {
      id: string;
      removeBranding: boolean;
    };
  };
  expandPending?: boolean;
  currentStep?: Pick<Step, 'id' | 'cvid'>;
  version: {
    id: string;
    config?: ContentConfigObject;
    steps?: SessionStep[];
    theme?: SessionTheme;
    checklist?: ChecklistData;
    launcher?: LauncherData;
    banner?: BannerData;
    resourceCenter?: ResourceCenterData;
    tracker?: { eventId: string };
  };
};

/**
 * Options for starting content
 */
export type StartContentOptions = {
  startReason: contentStartReason;
  contentId?: string;
  stepCvid?: string;
  once?: boolean;
  continue?: boolean;
};

// ============================================================================
// Condition Types
// ============================================================================

/**
 * Track condition for content
 */
export type TrackCondition = {
  contentId: string;
  contentType: ContentDataType;
  versionId: string;
  condition: RulesCondition;
};

/**
 * Condition wait timer
 */
export type ConditionWaitTimer = {
  contentId: string;
  contentType: ContentDataType;
  versionId: string;
  waitTime: number;
  activated?: boolean;
};

/**
 * Client condition
 */
export type ClientCondition = {
  contentId: string;
  contentType: ContentDataType;
  versionId: string;
  conditionId: string;
  isActive?: boolean;
};

/**
 * Untracked condition
 */
export type UnTrackedCondition = {
  conditionId: string;
};
