import type { Environment } from '@prisma/client';
import type {
  ClientCondition,
  ClientContext,
  ConditionWaitTimer,
  CustomContentSession,
} from '@usertour/types';

/**
 * Socket data type for storage
 */
export interface SocketData {
  environment: Environment;
  externalUserId: string;
  bizUserId: string; // Required - ensured during connection via ensureBizUser
  externalCompanyId?: string;
  bizCompanyId?: string;
  clientContext: ClientContext;
  clientConditions?: ClientCondition[];
  waitTimers?: ConditionWaitTimer[];
  flowSession?: CustomContentSession;
  checklistSession?: CustomContentSession;
  bannerSession?: CustomContentSession;
  resourceCenterSession?: CustomContentSession;
  launcherSessions?: CustomContentSession[];
  trackerSessions?: CustomContentSession[];
  lastDismissedFlowId?: string;
  lastDismissedChecklistId?: string;
  lastDismissedBannerId?: string;
  lastDismissedResourceCenterId?: string;
}
