import { AttributeBizTypes, BizAttributeTypes } from './attribute';
import { ContentVersion } from './contents';
import { RulesType, RulesCondition } from './config';
import { BizSession } from './statistics';
import { PlanType } from './subscription';
import { Theme } from './theme';
import { Attributes } from './usertour';

export type ContentSession = {
  contentId: string;
  latestSession?: BizSession;
  totalSessions: number;
  dismissedSessions: number;
  completedSessions: number;
  seenSessions: number;
};

export type SDKContent = ContentVersion &
  ContentSession & {
    name: string;
  };

export enum contentEndReason {
  // === Existing values (kept for backward compatibility) ===
  USER_CLOSED = 'user_closed',
  ACTION = 'action',
  REPLACED = 'replaced',
  TOOLTIP_TARGET_MISSING = 'tooltip_target_missing',
  SYSTEM_CLOSED = 'system_closed',
  AUTO_DISMISSED = 'auto_dismissed',
  CONTENT_NOT_FOUND = 'content_not_found',
  SESSION_TIMEOUT = 'session_timeout',
  URL_START_CLOSED = 'url_start_closed',
  USER_STARTED_OTHER_CONTENT = 'user_started_other_content',
  PROGRAM_STARTED_OTHER_CONTENT = 'program_started_other_content',
  STEP_NOT_FOUND = 'step_not_found',
  UNPUBLISHED_CONTENT = 'unpublished_content',
  END_FROM_PROGRAM = 'end_from_program',
  LAUNCHER_DEACTIVATED = 'launcher_deactivated',

  // === New action-type specific values ===
  // Close button dismiss (user clicks X/close button in content)
  CLOSE_BUTTON_DISMISS = 'close_button_dismiss',
  // Backdrop click dismiss (user clicks modal backdrop to dismiss)
  BACKDROP_DISMISS = 'backdrop_dismiss',
  // Dismiss button click (user clicks "Dismiss checklist" or "Yes, dismiss" text button)
  DISMISS_BUTTON = 'dismiss_button',
  // StepTrigger-based dismiss (automated trigger from StepTrigger conditions)
  TRIGGER_DISMISS = 'trigger_dismiss',
  // Action-triggered dismiss (from configured button actions)
  ACTION_DISMISS = 'action_dismiss',
  // System/error specific
  STORE_NOT_FOUND = 'store_not_found',
  // Server-side admin manually ended the session via the analytics dashboard
  ADMIN_ENDED = 'admin_ended',
}

export enum contentStartReason {
  START_FROM_CONDITION = 'start_from_condition',
  START_FROM_URL = 'start_from_url',
  START_FROM_SESSION = 'start_from_session',
  START_FROM_MANUAL = 'start_from_manual',
  START_FROM_PROGRAM = 'start_from_program',
  START_FROM_CONTENT_ID = 'start_from_content_id',
  START_FROM_ACTION = 'start_from_action',
}

export interface SDKConfig {
  planType: PlanType;
  removeBranding: boolean;
}

export interface GetProjectSettingsResponse {
  config: SDKConfig;
  themes: Theme[];
}

/**
 * Client context information for condition evaluation
 */
export interface ClientContext {
  pageUrl: string;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Control which rule types to evaluate
 * Default behavior: all rule types are disabled unless explicitly enabled
 * Set to true to enable evaluation for specific rule types
 */
export type RulesTypeControl = Partial<Record<RulesType, boolean>>;

/**
 * Custom evaluation function for specific rule types
 * @param rule - The rule condition to evaluate
 * @param options - The evaluation options
 * @returns boolean | Promise<boolean> - Whether the rule condition is satisfied
 */
export type CustomRuleEvaluator = (
  rule: RulesCondition,
  options: RulesEvaluationOptions,
) => boolean | Promise<boolean>;

/**
 * Custom evaluators for specific rule types
 * Override default evaluation logic for specific rule types
 */
export type CustomRuleEvaluators = Partial<Record<RulesType, CustomRuleEvaluator>>;

/**
 * Simplified attribute type with only required fields
 */
export interface SimpleAttribute {
  id: string;
  codeName: string;
  dataType: BizAttributeTypes;
  bizType: AttributeBizTypes;
}

/**
 * Options for evaluating rules conditions
 */
export interface RulesEvaluationOptions {
  clientContext?: ClientContext;
  attributes?: SimpleAttribute[];
  userAttributes?: Attributes;
  companyAttributes?: Attributes;
  membershipAttributes?: Attributes;
  typeControl?: RulesTypeControl;
  activatedIds?: string[];
  deactivatedIds?: string[];
  customEvaluators?: CustomRuleEvaluators;
}
