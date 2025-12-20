import {
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ClientMessageKind, ContentDataType, contentStartReason } from '@usertour/types';

// ============================================================================
// Maximum payload size constant
// ============================================================================

/**
 * Maximum allowed payload size in bytes (100KB)
 * Prevents DoS attacks from oversized payloads
 */
export const MAX_PAYLOAD_SIZE = 100 * 1024;

// ============================================================================
// Payload DTO Classes
// ============================================================================

/**
 * Upsert user payload validator
 */
export class UpsertUserPayload {
  @IsString()
  @MaxLength(255)
  externalUserId: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

/**
 * Upsert company payload validator
 */
export class UpsertCompanyPayload {
  @IsString()
  @MaxLength(255)
  externalCompanyId: string;

  @IsString()
  @MaxLength(255)
  externalUserId: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsObject()
  membership?: Record<string, any>;
}

/**
 * Client context payload validator
 */
export class ClientContextPayload {
  @IsString()
  @MaxLength(2048)
  pageUrl: string;

  @IsNumber()
  viewportWidth: number;

  @IsNumber()
  viewportHeight: number;
}

/**
 * Start content payload validator
 */
export class StartContentPayload {
  @IsString()
  @MaxLength(255)
  contentId: string;

  @IsEnum(contentStartReason)
  startReason: contentStartReason;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  stepCvid?: string;

  @IsOptional()
  @IsBoolean()
  once?: boolean;

  @IsOptional()
  @IsBoolean()
  continue?: boolean;
}

/**
 * End content payload validator
 */
export class EndContentPayload {
  @IsString()
  @MaxLength(255)
  sessionId: string;

  @IsString()
  @MaxLength(255)
  endReason: string;
}

/**
 * Client condition payload validator
 */
export class ClientConditionPayload {
  @IsString()
  @MaxLength(255)
  contentId: string;

  @IsEnum(ContentDataType)
  contentType: ContentDataType;

  @IsString()
  @MaxLength(255)
  versionId: string;

  @IsString()
  @MaxLength(255)
  conditionId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Fire condition wait timer payload validator
 */
export class FireConditionWaitTimerPayload {
  @IsString()
  @MaxLength(255)
  versionId: string;
}

/**
 * Track event payload validator
 */
export class TrackEventPayload {
  @IsString()
  @MaxLength(255)
  eventName: string;

  @IsString()
  @MaxLength(255)
  sessionId: string;

  @IsObject()
  eventData: Record<string, any>;
}

/**
 * Go to step payload validator
 */
export class GoToStepPayload {
  @IsString()
  @MaxLength(255)
  sessionId: string;

  @IsString()
  @MaxLength(255)
  stepId: string;
}

/**
 * Answer question payload validator
 */
export class AnswerQuestionPayload {
  @IsString()
  @MaxLength(255)
  questionCvid: string;

  @IsString()
  @MaxLength(255)
  questionName: string;

  @IsString()
  @MaxLength(255)
  questionType: string;

  @IsString()
  @MaxLength(255)
  sessionId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  listAnswer?: string[];

  @IsOptional()
  @IsNumber()
  numberAnswer?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  textAnswer?: string;
}

/**
 * Click checklist task payload validator
 */
export class ClickChecklistTaskPayload {
  @IsString()
  @MaxLength(255)
  sessionId: string;

  @IsString()
  @MaxLength(255)
  taskId: string;
}

/**
 * Session-only payload validator (for hide/show checklist, activate launcher)
 */
export class SessionOnlyPayload {
  @IsString()
  @MaxLength(255)
  sessionId: string;
}

/**
 * Tooltip target missing payload validator
 */
export class TooltipTargetMissingPayload {
  @IsString()
  @MaxLength(255)
  sessionId: string;

  @IsString()
  @MaxLength(255)
  stepId: string;
}

/**
 * Dismiss launcher payload validator
 */
export class DismissLauncherPayload {
  @IsString()
  @MaxLength(255)
  sessionId: string;

  @IsString()
  @MaxLength(255)
  endReason: string;
}

// ============================================================================
// Payload DTO Map
// ============================================================================

/**
 * Map of message kinds to their corresponding payload validator classes
 */
export const payloadValidatorMap = new Map<ClientMessageKind, new () => object>([
  [ClientMessageKind.UPSERT_USER, UpsertUserPayload],
  [ClientMessageKind.UPSERT_COMPANY, UpsertCompanyPayload],
  [ClientMessageKind.UPDATE_CLIENT_CONTEXT, ClientContextPayload],
  [ClientMessageKind.START_CONTENT, StartContentPayload],
  [ClientMessageKind.END_CONTENT, EndContentPayload],
  [ClientMessageKind.TOGGLE_CLIENT_CONDITION, ClientConditionPayload],
  [ClientMessageKind.FIRE_CONDITION_WAIT_TIMER, FireConditionWaitTimerPayload],
  [ClientMessageKind.TRACK_EVENT, TrackEventPayload],
  [ClientMessageKind.GO_TO_STEP, GoToStepPayload],
  [ClientMessageKind.ANSWER_QUESTION, AnswerQuestionPayload],
  [ClientMessageKind.CLICK_CHECKLIST_TASK, ClickChecklistTaskPayload],
  [ClientMessageKind.HIDE_CHECKLIST, SessionOnlyPayload],
  [ClientMessageKind.SHOW_CHECKLIST, SessionOnlyPayload],
  [ClientMessageKind.REPORT_TOOLTIP_TARGET_MISSING, TooltipTargetMissingPayload],
  [ClientMessageKind.ACTIVATE_LAUNCHER, SessionOnlyPayload],
  [ClientMessageKind.DISMISS_LAUNCHER, DismissLauncherPayload],
  // BEGIN_BATCH, END_BATCH, END_ALL_CONTENT don't require payload validation
]);
