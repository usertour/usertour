import { BizEvent } from './biz';
import { ContentVersion } from './contents';
import { PlanType } from './subscription';

export type SDKContent = ContentVersion & {
  name: string;
  totalSessions: number;
  events: BizEvent[];
};

export enum flowEndReason {
  USER_CLOSED = 'user_closed',
  ELEMENT_NOT_FOUND = 'element_not_found',
}

export interface SDKConfig {
  planType: PlanType;
  removeBranding: boolean;
}
