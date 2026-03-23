// ============================================================================
// Enums
// ============================================================================

export enum ContentConditionLogic {
  SEEN = 'seen',
  UNSEEN = 'unseen',
  COMPLETED = 'completed',
  UNCOMPLETED = 'uncompleted',
  ACTIVED = 'actived',
  UNACTIVED = 'unactived',
}

export enum ContentPriority {
  HIGHEST = 'highest',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  LOWEST = 'lowest',
}

export enum ElementConditionLogic {
  PRESENT = 'present',
  UNPRESENT = 'unpresent',
  DISABLED = 'disabled',
  UNDISABLED = 'undisabled',
  CLICKED = 'clicked',
  UNCLICKED = 'unclicked',
}

export enum Frequency {
  ONCE = 'once',
  MULTIPLE = 'multiple',
  UNLIMITED = 'unlimited',
}

export enum FrequencyUnits {
  DAYES = 'days',
  HOURS = 'hours',
  SECONDS = 'seconds',
  MINUTES = 'minutes',
}

export enum RulesType {
  USER_ATTR = 'user-attr',
  CURRENT_PAGE = 'current-page',
  EVENT = 'event',
  SEGMENT = 'segment',
  CONTENT = 'content',
  ELEMENT = 'element',
  TEXT_INPUT = 'text-input',
  TEXT_FILL = 'text-fill',
  TIME = 'time',
  GROUP = 'group',
  WAIT = 'wait',
  TASK_IS_CLICKED = 'task-is-clicked',
  EVENT_ATTR = 'event-attr',
}

// ============================================================================
// Event Condition Types
// ============================================================================

export enum EventCountLogic {
  AT_LEAST = 'atLeast',
  AT_MOST = 'atMost',
  EXACTLY = 'exactly',
  BETWEEN = 'between',
}

export enum EventTimeLogic {
  IN_THE_LAST = 'inTheLast',
  MORE_THAN = 'moreThan',
  BETWEEN = 'between',
  AT_ANY_POINT_IN_TIME = 'atAnyPointInTime',
}

export enum EventTimeUnit {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
}

export enum EventScope {
  BY_CURRENT_USER_IN_ANY_COMPANY = 'byCurrentUserInAnyCompany',
  BY_CURRENT_USER_IN_CURRENT_COMPANY = 'byCurrentUserInCurrentCompany',
  BY_ANY_USER_IN_CURRENT_COMPANY = 'byAnyUserInCurrentCompany',
}

export interface EventConditionData {
  eventId?: string;
  countLogic?: EventCountLogic;
  count?: number;
  count2?: number;
  timeLogic?: EventTimeLogic;
  windowValue?: number;
  windowValue2?: number;
  timeUnit?: EventTimeUnit;
  scope?: EventScope;
}

export interface EventAttrConditionData {
  eventId?: string;
  attrId?: string;
  logic?: string;
  value?: string;
  value2?: string;
  listValues?: string[];
}

export enum StringConditionLogic {
  IS = 'is',
  NOT = 'not',
  CONTAINS = 'contains',
  NOT_CONTAIN = 'notContain',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  MATCH = 'match',
  UNMATCH = 'unmatch',
  ANY = 'any',
  EMPTY = 'empty',
}

// ============================================================================
// Time Condition Types
// ============================================================================

/**
 * New format: ISO 8601 datetime strings with timezone
 * Example: "2023-12-25T09:30:00Z" (UTC) or "2023-12-25T09:30:00+08:00" (with timezone)
 */
export interface TimeConditionDataV2 {
  startTime?: string; // ISO 8601 format
  endTime?: string; // ISO 8601 format
}

/**
 * Legacy format: Separate date and time components (MM/dd/yyyy format)
 * This format is deprecated but maintained for backward compatibility
 */
export interface TimeConditionDataLegacy {
  startDate?: string; // MM/dd/yyyy format
  startDateHour?: string; // "00"-"23"
  startDateMinute?: string; // "00"-"59"
  endDate?: string; // MM/dd/yyyy format
  endDateHour?: string; // "00"-"23"
  endDateMinute?: string; // "00"-"59"
}

/**
 * Union type for time condition data
 * Automatically detects format based on field presence
 */
export type TimeConditionData = TimeConditionDataV2 | TimeConditionDataLegacy;

// ============================================================================
// Rules Types
// ============================================================================

export type RulesCondition = {
  id: string;
  type: string;
  data: any;
  operators?: 'and' | 'or';
  actived?: boolean;
  conditions?: RulesCondition[];
};

// ============================================================================
// Frequency Types
// ============================================================================

export type RulesFrequencyValueEvery = {
  times?: number;
  duration: number;
  unit: FrequencyUnits;
};

export type RulesFrequencyValueAtLeast = {
  duration: number;
  unit: FrequencyUnits;
};

export type RulesFrequencyValue = {
  frequency: Frequency;
  every: RulesFrequencyValueEvery;
  atLeast?: RulesFrequencyValueAtLeast;
};

// ============================================================================
// Config Types
// ============================================================================

export type autoStartRulesSetting = {
  frequency?: RulesFrequencyValue;
  startIfNotComplete?: boolean;
  priority?: ContentPriority;
  wait?: number;
};

export type ContentConfigObject = {
  name?: string;
  enabledAutoStartRules: boolean;
  enabledHideRules: boolean;
  autoStartRules: RulesCondition[];
  hideRules: RulesCondition[];
  autoStartRulesSetting: autoStartRulesSetting;
  hideRulesSetting: any;
};
