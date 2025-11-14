import { AttributeBizTypes, BizAttributeTypes } from './attribute';
import { ChecklistData } from './checklist';
import { Content, ContentDataType, RulesCondition, Step } from './contents';
import { LauncherData } from './launcher';
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
  UNSET_FLOW_SESSION = 'UnsetFlowSession',
  UNSET_CHECKLIST_SESSION = 'UnsetChecklistSession',
  ADD_LAUNCHER = 'AddLauncher',
  REMOVE_LAUNCHER = 'RemoveLauncher',
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
  externalUserId: string;
  eventName: string;
  sessionId: string;
  eventData: Record<string, any>;
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
    steps?: SessionStep[];
    theme?: SessionTheme;
    checklist?: ChecklistData;
    launcher?: LauncherData;
  };
};

/**
 * Options for starting content
 */
export type StartContentOptions = {
  startReason: contentStartReason;
  contentId?: string;
  stepCvid?: string;
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
