export type Attribute = {
  id: string;
  bizType: number;
  projectId: string;
  displayName: string;
  codeName: string;
  description: string;
  dataType: number;
  createdAt: string;
  predefined: boolean;
};

export type BizUserInfo = {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: any;
  bizCompanyId?: string;
  deleted?: boolean;
  // environmentId: string;
  externalId: string;
};

export enum BizAttributeTypes {
  Nil = 0,
  Number = 1,
  String = 2,
  Boolean = 3,
  List = 4,
  DateTime = 5,
  RandomAB = 6,
  RandomNumber = 7,
}

export enum AttributeBizTypes {
  Nil = 0,
  User = 1,
  Company = 2,
  Membership = 3,
  Event = 4,
}

export enum AttributeDataType {
  Number = 1,
  String = 2,
  Boolean = 3,
  List = 4,
  DateTime = 5,
  RandomAB = 6,
  RandomNumber = 7,
}

export interface SelectItemType {
  id: string;
  name: string;
}

export interface RulesUserAttributeData {
  logic?: string;
  attrId?: string;
  value?: string;
  value2?: string;
  listValues?: string[];
}
export interface RulesUserAttributeProps {
  index: number;
  type: string;
  data?: RulesUserAttributeData;
}

// export enum EventAttributes {
//   FLOW_ID = "flow_id",
//   FLOW_NAME = "flow_name",
//   FLOW_END_REASON = "flow_end_reason",
//   FLOW_SESSION_ID = "flow_session_id",
//   FLOW_START_REASON = "flow_start_reason",
//   FLOW_STEP_ID = "flow_step_id",
//   FLOW_STEP_NAME = "flow_step_name",
//   FLOW_STEP_NUMBER = "flow_step_number",
//   FLOW_STEP_PROGRESS = "flow_step_progress",
//   FLOW_VERSION_ID = "flow_version_id",
//   FLOW_VERSION_NUMBER = "flow_version_number",
// }

// export enum CompanyAttributes {
//   NAME = "name",
//   FIRST_SEEN_AT = "first_seen_at",
//   LAST_SEEN_AT = "last_seen_at",
//   SIGNED_UP_AT = "signed_up_at",
// }

// export enum UserAttributes {
//   EMAIL = "email",
//   NAME = "name",
//   FIRST_SEEN_AT = "first_seen_at",
//   LAST_SEEN_AT = "last_seen_at",
//   SIGNED_UP_AT = "signed_up_at",
// }

export enum BizEvents {
  PAGE_VIEWED = 'page_viewed',
  FLOW_STEP_SEEN = 'flow_step_seen',
  FLOW_COMPLETED = 'flow_completed',
  FLOW_STARTED = 'flow_started',
  FLOW_ENDED = 'flow_ended',
  TOOLTIP_TARGET_MISSING = 'tooltip_target_missing',
  FLOW_STEP_COMPLETED = 'flow_step_completed',
  LAUNCHER_ACTIVATED = 'launcher_activated',
  LAUNCHER_DISMISSED = 'launcher_dismissed',
  LAUNCHER_SEEN = 'launcher_seen',
  CHECKLIST_COMPLETED = 'checklist_completed',
  CHECKLIST_DISMISSED = 'checklist_dismissed',
  CHECKLIST_HIDDEN = 'checklist_hidden',
  CHECKLIST_SEEN = 'checklist_seen',
  CHECKLIST_STARTED = 'checklist_started',
  CHECKLIST_TASK_CLICKED = 'checklist_task_clicked',
  CHECKLIST_TASK_COMPLETED = 'checklist_task_completed',
  EVENT_TRACKER_COMPLETED = 'event_tracker_completed',
  QUESTION_ANSWERED = 'question_answered',
}

export enum EventAttributes {
  // Flow attributes
  FLOW_ID = 'flow_id',
  FLOW_NAME = 'flow_name',
  FLOW_END_REASON = 'flow_end_reason',
  FLOW_SESSION_ID = 'flow_session_id',
  FLOW_START_REASON = 'flow_start_reason',
  FLOW_STEP_ID = 'flow_step_id',
  FLOW_STEP_CVID = 'flow_step_cvid',
  FLOW_STEP_NAME = 'flow_step_name',
  FLOW_STEP_NUMBER = 'flow_step_number',
  FLOW_STEP_PROGRESS = 'flow_step_progress',
  FLOW_VERSION_ID = 'flow_version_id',
  FLOW_VERSION_NUMBER = 'flow_version_number',
  // Launcher attributes
  LAUNCHER_ID = 'launcher_id',
  LAUNCHER_NAME = 'launcher_name',
  LAUNCHER_SESSION_ID = 'launcher_session_id',
  LAUNCHER_VERSION_ID = 'launcher_version_id',
  LAUNCHER_VERSION_NUMBER = 'launcher_version_number',
  // Checklist attributes
  CHECKLIST_ID = 'checklist_id',
  CHECKLIST_NAME = 'checklist_name',
  CHECKLIST_SESSION_ID = 'checklist_session_id',
  CHECKLIST_VERSION_ID = 'checklist_version_id',
  CHECKLIST_VERSION_NUMBER = 'checklist_version_number',
  CHECKLIST_END_REASON = 'checklist_end_reason',
  CHECKLIST_START_REASON = 'checklist_start_reason',
  CHECKLIST_TASK_CVID = 'checklist_task_cvid',
  CHECKLIST_TASK_ID = 'checklist_task_id',
  CHECKLIST_TASK_NAME = 'checklist_task_name',
  // Event tracker attributes
  EVENT_TRACKER_ID = 'event_tracker_id',
  EVENT_TRACKER_NAME = 'event_tracker_name',
  EVENT_TRACKER_VERSION_ID = 'event_tracker_version_id',
  EVENT_TRACKER_VERSION_NUMBER = 'event_tracker_version_number',
  // Common attributes
  PAGE_URL = 'page_url',
  VIEWPORT_WIDTH = 'viewport_width',
  VIEWPORT_HEIGHT = 'viewport_height',
  LOCALE_CODE = 'locale_code',
  // Question attributes
  LIST_ANSWER = 'list_answer',
  NUMBER_ANSWER = 'number_answer',
  QUESTION_CVID = 'question_cvid',
  QUESTION_NAME = 'question_name',
  QUESTION_TYPE = 'question_type',
  TEXT_ANSWER = 'text_answer',
}
