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

export enum flowStartReason {
  START_CONDITION = 'start_condition',
  MANUAL_START = 'manual_start',
  ACTION = 'action',
}

export const flowReasonTitleMap = {
  [flowStartReason.START_CONDITION]: 'Matched auto-start condition',
  [flowStartReason.MANUAL_START]: 'Manually started',
  [flowStartReason.ACTION]: 'Button clicked',
  [flowEndReason.USER_CLOSED]: 'User closed',
  [flowEndReason.ELEMENT_NOT_FOUND]: 'Element not found',
};

export interface SDKConfig {
  planType: PlanType;
  removeBranding: boolean;
}
