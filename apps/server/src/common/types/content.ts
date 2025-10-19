import { BizSessionWithEvents, VersionWithStepsAndContent } from './schema';
import {
  ClientCondition,
  Environment,
  CustomContentSession,
  ConditionWaitTimer,
  TrackCondition,
  StartContentOptions,
} from '@/common/types';
import { ClientContext, ContentConfigObject, ContentDataType } from '@usertour/types';
import { Server, Socket } from 'socket.io';

export type ContentSessionCollection = {
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
}

export interface ContentStartResult {
  success: boolean;
  activate?: boolean;
  session?: CustomContentSession;
  preTracks?: TrackCondition[];
  postTracks?: TrackCondition[];
  waitTimers?: ConditionWaitTimer[];
  reason?: string;
  forceGoToStep?: boolean;
  isActivateOtherSockets?: boolean;
}

export interface CancelSessionParams {
  server: Server;
  socket: Socket;
  socketData: SocketData;
  sessionId: string;
  unsetSession?: boolean;
  setLastDismissedId?: boolean;
}

export interface ActivateSessionParams {
  server: Server;
  socket: Socket;
  socketData?: SocketData;
  session: CustomContentSession;
  postTracks: TrackCondition[] | undefined;
  forceGoToStep: boolean;
}

/**
 * Configuration options for tryAutoStartContent method
 */
export interface TryAutoStartContentOptions {
  excludeContentIds?: string[];
  isActivateOtherSockets?: boolean;
  allowWaitTimers?: boolean;
  fallback?: boolean;
}
