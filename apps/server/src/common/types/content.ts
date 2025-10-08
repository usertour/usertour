import { BizSessionWithEvents, VersionWithStepsAndContent } from './schema';
import {
  ClientCondition,
  Environment,
  SDKContentSession,
  ConditionWaitTimer,
  TrackCondition,
  StartContentOptions,
} from '@/common/types';
import { ClientContext, ContentConfigObject, ContentDataType } from '@usertour/types';
import { Server, Socket } from 'socket.io';

export type CustomContentSession = {
  contentId: string;
  latestSession?: BizSessionWithEvents;
  totalSessions: number;
  dismissedSessions: number;
  completedSessions: number;
  seenSessions: number;
};

/**
 * Enum for condition extraction mode
 */
export enum ConditionExtractionMode {
  AUTO_START_ONLY = 'auto_start_only',
  HIDE_ONLY = 'hide_only',
  BOTH = 'both',
}

export type CustomContentVersion = Omit<VersionWithStepsAndContent, 'config'> & {
  session: CustomContentSession;
  config: ContentConfigObject;
};

/**
 * Socket client data type for storage
 */
export interface SocketClientData {
  environment: Environment;
  externalUserId: string;
  externalCompanyId?: string;
  clientContext: ClientContext;
  clientConditions?: ClientCondition[];
  conditionWaitTimers?: ConditionWaitTimer[];
  flowSession?: SDKContentSession;
  checklistSession?: SDKContentSession;
  lastDismissedFlowId?: string;
  lastDismissedChecklistId?: string;
  lastUpdated: number;
  socketId: string;
}

export interface ContentStartContext {
  server: Server;
  socket: Socket;
  contentType: ContentDataType;
  socketClientData: SocketClientData;
  options?: StartContentOptions;
}

export interface ContentCancelContext {
  server: Server;
  socket: Socket;
  sessionId: string;
  cancelOtherSessions?: boolean;
}

export interface ContentStartResult {
  success: boolean;
  activate?: boolean;
  session?: SDKContentSession;
  trackConditions?: TrackCondition[];
  trackHideConditions?: TrackCondition[];
  conditionWaitTimers?: ConditionWaitTimer[];
  reason?: string;
  invalidSession?: SDKContentSession;
  forceGoToStep?: boolean;
  isActivateOtherSockets?: boolean;
}

export interface CancelSessionParams {
  server: Server;
  socket: Socket;
  socketClientData: SocketClientData;
  sessionId: string;
  shouldUnsetSession?: boolean;
  shouldSetLastDismissedId?: boolean;
}

export interface ActivateSessionParams {
  server: Server;
  socket: Socket;
  socketClientData?: SocketClientData;
  session: SDKContentSession;
  trackHideConditions: TrackCondition[] | undefined;
  forceGoToStep: boolean;
}

/**
 * Configuration options for tryAutoStartContent method
 */
export interface TryAutoStartContentOptions {
  excludeContentIds?: string[];
  isActivateOtherSockets?: boolean;
  allowConditionWaitTimers?: boolean;
  fallback?: boolean;
}
