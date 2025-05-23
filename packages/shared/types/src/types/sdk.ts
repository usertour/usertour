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
  CONTENT_NOT_FOUND = 'content_not_found',
  SESSION_TIMEOUT = 'session_timeout',
}

export enum contentStartReason {
  START_CONDITION = 'start_condition',
  START_FROM_URL = 'start_from_url',
  START_FROM_SESSION = 'start_from_session',
  MANUAL_START = 'manual_start',
  START_FROM_PROGRAM = 'start_from_program',
  START_FROM_CONTENT_ID = 'start_from_content_id',
  ACTION = 'action',
}

export const flowReasonTitleMap = {
  [contentStartReason.START_CONDITION]: 'Matched auto-start condition',
  [contentStartReason.START_FROM_URL]: 'Started from URL',
  [contentStartReason.START_FROM_SESSION]: 'Started from session',
  [contentStartReason.START_FROM_PROGRAM]: 'Started from program',
  [contentStartReason.START_FROM_CONTENT_ID]: 'Started from content id',
  [contentStartReason.MANUAL_START]: 'Manually started',
  [contentStartReason.ACTION]: 'Button clicked',
  [contentEndReason.USER_CLOSED]: 'User closed',
  [contentEndReason.TOOLTIP_TARGET_MISSING]: 'Tooltip target missing',
  [contentEndReason.CONTENT_NOT_FOUND]: 'Content not found',
  [contentEndReason.SESSION_TIMEOUT]: 'Session timeout',
  [contentEndReason.SYSTEM_CLOSED]: 'System closed',
};

export interface SDKConfig {
  planType: PlanType;
  removeBranding: boolean;
}
