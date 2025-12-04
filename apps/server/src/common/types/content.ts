import { BizSessionWithEvents, VersionWithStepsAndContent, BizEventWithEvent } from './schema';
import {
  ClientCondition,
  CustomContentSession,
  ConditionWaitTimer,
  TrackCondition,
  StartContentOptions,
  ClientContext,
  ContentConfigObject,
  ContentDataType,
} from '@usertour/types';
import { Environment } from './schema';
import { Server, Socket } from 'socket.io';

export type ContentSessionCollection = {
  activeSession?: BizSessionWithEvents;
  totalSessions: number;
  completedSessions: number;
  latestEvent?: BizEventWithEvent; // Latest event across all same-type contents (for atLeast frequency check)
  latestDismissedEvent?: BizEventWithEvent; // Latest dismissed event for current content (for every frequency check)
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
  session: ContentSessionCollection;
  config: ContentConfigObject;
};

/**
 * Socket data type for storage
 */
export interface SocketData {
  environment: Environment;
  externalUserId: string;
  externalCompanyId?: string;
  clientContext: ClientContext;
  clientConditions?: ClientCondition[];
  waitTimers?: ConditionWaitTimer[];
  flowSession?: CustomContentSession;
  checklistSession?: CustomContentSession;
  launcherSessions?: CustomContentSession[];
  lastDismissedFlowId?: string;
  lastDismissedChecklistId?: string;
}

export interface ContentStartContext {
  server: Server;
  socket: Socket;
  contentType: ContentDataType;
  socketData: SocketData;
  options?: StartContentOptions;
}

export interface ContentCancelContext {
  server: Server;
  socket: Socket;
  sessionId: string;
  cancelOtherSessions?: boolean;
  unsetCurrentSession?: boolean;
  endReason: string;
}

export interface ContentStartResult {
  success: boolean;
  session?: CustomContentSession;
  preTracks?: TrackCondition[];
  hideConditions?: TrackCondition[];
  checklistConditions?: TrackCondition[];
  waitTimers?: ConditionWaitTimer[];
  reason?: string;
  forceGoToStep?: boolean;
  isActivateOtherSockets?: boolean;
  hideRulesActivated?: boolean;
}

export interface CancelSessionParams {
  server: Server;
  socket: Socket;
  socketData: SocketData;
  contentType: ContentDataType;
  sessionId: string;
  trackConditions?: TrackCondition[];
  contentId?: string;
  unsetSession?: boolean;
  setLastDismissedId?: boolean;
}

export interface ActivateSessionParams {
  server: Server;
  socket: Socket;
  session: CustomContentSession;
  forceGoToStep: boolean;
  socketData?: SocketData;
  trackConditions?: TrackCondition[];
}

/**
 * Configuration options for tryAutoStartContent method
 */
export interface TryAutoStartContentOptions {
  excludeContentIds?: string[];
  allowWaitTimers?: boolean;
  fallback?: boolean;
}
