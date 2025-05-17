import { BizEvent } from './biz';
import { ContentVersion } from './contents';
import { BizSession } from './statistics';
import { PlanType } from './subscription';

export type SDKContent = ContentVersion & {
  name: string;
  totalSessions: number;
  dismissedSessions: number;
  completedSessions: number;
  latestSession?: BizSession;
  events: BizEvent[];
};

export enum contentEndReason {
  USER_CLOSED = 'user_closed',
  TOOLTIP_TARGET_MISSING = 'tooltip_target_missing',
  SYSTEM_CLOSED = 'system_closed',
}

export enum contentStartReason {
  START_CONDITION = 'start_condition',
  START_FROM_URL = 'start_from_url',
  START_FROM_SESSION = 'start_from_session',
  MANUAL_START = 'manual_start',
  ACTION = 'action',
}

export const flowReasonTitleMap = {
  [contentStartReason.START_CONDITION]: 'Matched auto-start condition',
  [contentStartReason.START_FROM_URL]: 'Started from URL',
  [contentStartReason.START_FROM_SESSION]: 'Started from session',
  [contentStartReason.MANUAL_START]: 'Manually started',
  [contentStartReason.ACTION]: 'Button clicked',
  [contentEndReason.USER_CLOSED]: 'User closed',
  [contentEndReason.TOOLTIP_TARGET_MISSING]: 'Tooltip target missing',
};

export interface SDKConfig {
  planType: PlanType;
  removeBranding: boolean;
}
