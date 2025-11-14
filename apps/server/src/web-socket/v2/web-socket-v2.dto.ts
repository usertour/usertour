import { contentStartReason, ClientContext } from '@usertour/types';
import { IsString, IsObject, IsOptional } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { SocketData } from '@/common/types/content';
import { ClientCondition } from '@usertour/types';

// ============================================================================
// Type Definitions and Interfaces
// ============================================================================

export type ProjectConfig = {
  removeBranding: boolean;
  planType: string;
};

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
 * WebSocket context containing server, socket, and client data
 * Used to pass common parameters to message handlers
 */
export interface WebSocketContext {
  server: Server;
  socket: Socket;
  socketData: SocketData;
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
// Message DTO Classes
// ============================================================================

/**
 * Unified client message structure (Client -> Server)
 * All messages are executed in order to maintain Socket.IO's ordering semantics
 */
export class ClientMessageDto {
  @IsString()
  kind: string;

  @IsObject()
  payload: any;

  @IsOptional()
  @IsString()
  requestId?: string;
}

/**
 * Unified server message structure (Server -> Client)
 * Consistent format for all server-to-client messages
 */
export class ServerMessageDto {
  @IsString()
  kind: string;

  @IsObject()
  payload: any;

  @IsOptional()
  @IsString()
  messageId?: string;
}

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

// ============================================================================
// Event Tracking DTOs
// ============================================================================

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
 * Go to step request
 */
export type GoToStepDto = {
  sessionId: string;
  stepId: string;
};

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
// Testing DTOs
// ============================================================================

/**
 * Identity request (for testing)
 */
export type IdentityDto = {
  data: number;
};
