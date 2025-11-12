import { contentStartReason, ClientContext } from '@usertour/types';
import { IsString, IsObject, IsOptional } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { SocketData } from '@/common/types/content';
import { ClientCondition } from '@/common/types/sdk';

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

// Upsert user request
export type UpsertUserDto = {
  externalUserId: string;
  attributes?: Record<string, any>;
};

// Upsert company request
export type UpsertCompanyDto = {
  externalCompanyId: string;
  externalUserId: string;
  attributes?: Record<string, any>;
  membership?: Record<string, any>;
};

// Track event request
export type TrackEventDto = {
  externalUserId: string;
  eventName: string;
  sessionId: string;
  eventData: Record<string, any>;
};

// Identity request (for testing)
export type IdentityDto = {
  data: number;
};

export type StartContentDto = {
  contentId: string;
  startReason: contentStartReason;
  stepCvid?: string;
};

export type EndContentDto = {
  sessionId: string;
  endReason: string;
};

export type GoToStepDto = {
  sessionId: string;
  stepId: string;
};

export type AnswerQuestionDto = {
  questionCvid: string;
  questionName: string;
  questionType: string;
  sessionId: string;
  listAnswer?: string[];
  numberAnswer?: number;
  textAnswer?: string;
};

export type ClickChecklistTaskDto = {
  sessionId: string;
  taskId: string;
};

export type HideChecklistDto = {
  sessionId: string;
};

export type ShowChecklistDto = {
  sessionId: string;
};

export type TooltipTargetMissingDto = {
  sessionId: string;
  stepId: string;
};

export type FireConditionWaitTimerDto = {
  versionId: string;
};

export type ActivateLauncherDto = {
  sessionId: string;
};

export type DismissLauncherDto = {
  sessionId: string;
  endReason: string;
};

/**
 * WebSocket context containing server, socket, and client data
 * Used to pass common parameters to message handlers
 */
export interface WebSocketContext {
  server: Server;
  socket: Socket;
  socketData: SocketData;
}
