import { BizSessionWithEvents, VersionWithStepsAndContent } from './schema';
import {
  ClientCondition,
  Environment,
  SDKContentSession,
  ConditionWaitTimer,
} from '@/common/types';
import { ClientContext, ContentConfigObject } from '@usertour/types';

export type CustomContentSession = {
  contentId: string;
  latestSession?: BizSessionWithEvents;
  totalSessions: number;
  dismissedSessions: number;
  completedSessions: number;
  seenSessions: number;
};

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
  lastActivatedFlowSession?: SDKContentSession;
  lastActivatedChecklistSession?: SDKContentSession;
  lastUpdated: number;
  socketId: string;
}
