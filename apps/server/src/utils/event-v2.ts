import {
  BizEvents,
  EventAttributes,
  StepSettings,
  ChecklistData,
  ClientContext,
  ContentDataType,
} from '@usertour/types';
import { isEmptyString, isNullish } from '@usertour/helpers';
import {
  Step,
  BizEventWithEvent,
  BizSessionWithEvents,
  BizSessionWithRelations,
} from '@/common/types/schema';
import type { AnswerQuestionDto } from '@usertour/types';
import { isAfter } from 'date-fns';
import type { EventBuildParams } from '@/common/types/track';
import { findStepIdByLatestCvid } from './content-utils';

// ============================================================================
// Constants
// ============================================================================

// Answer attribute keys in priority order
const ANSWER_ATTRIBUTES = [
  EventAttributes.LIST_ANSWER,
  EventAttributes.NUMBER_ANSWER,
  EventAttributes.TEXT_ANSWER,
] as const;

// Events that should only occur once
const SINGLE_OCCURRENCE_EVENTS = [
  BizEvents.FLOW_STARTED,
  BizEvents.FLOW_COMPLETED,
  BizEvents.FLOW_ENDED,
  BizEvents.CHECKLIST_STARTED,
  BizEvents.CHECKLIST_COMPLETED,
  BizEvents.CHECKLIST_DISMISSED,
  BizEvents.LAUNCHER_SEEN,
  BizEvents.LAUNCHER_DISMISSED,
] as const;

// Events that should invalidate subsequent events
const DISMISSED_EVENTS = [
  BizEvents.CHECKLIST_DISMISSED,
  BizEvents.LAUNCHER_DISMISSED,
  BizEvents.FLOW_ENDED,
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

const isCompletedEvent = (eventCodeName: string) => {
  return [
    BizEvents.FLOW_COMPLETED,
    BizEvents.CHECKLIST_COMPLETED,
    BizEvents.LAUNCHER_ACTIVATED,
  ].includes(eventCodeName as BizEvents);
};

/**
 * Calculate step progress percentage
 * @param steps - The array of steps
 * @param stepIndex - The current step index (0-based)
 * @returns Progress percentage (0-100), or -1 if the calculation is invalid
 */
export const calculateStepProgress = (steps: Step[], stepIndex: number): number => {
  // Validate inputs: steps array must not be empty and stepIndex must be valid
  if (!steps?.length || stepIndex < 0 || stepIndex >= steps.length) {
    return -1;
  }

  const step = steps[stepIndex];

  // Find the first explicit completion step
  const firstExplicitCompletionStepIndex = steps.findIndex(
    (s: Step) => (s.setting as StepSettings)?.explicitCompletionStep === true,
  );

  // Calculate total: if any step has explicitCompletionStep, use the first one as completion step
  // Otherwise, use the total number of steps
  const total =
    firstExplicitCompletionStepIndex !== -1 ? firstExplicitCompletionStepIndex + 1 : steps.length;

  // If there's an explicit completion step and current step is after it, it's not complete
  if (firstExplicitCompletionStepIndex !== -1 && stepIndex > firstExplicitCompletionStepIndex) {
    return -1;
  }

  // Check if current step has explicitCompletionStep setting
  const isExplicitCompletionStep = (step.setting as StepSettings)?.explicitCompletionStep === true;

  // Calculate isComplete:
  // - If step has explicitCompletionStep, it's complete
  // - Otherwise, check if it's the last step (stepIndex + 1 === total)
  const isComplete = isExplicitCompletionStep || stepIndex + 1 === total;

  // If complete, progress is always 100%
  if (isComplete) {
    return 100;
  }

  // Calculate progress: stepIndex / (total - 1) to ensure first step is 0% and last step is 100%
  return Math.round((stepIndex / (total - 1)) * 100);
};

/**
 * Validates paired events to ensure they alternate properly
 * @param bizEvents - All business events in the session
 * @param currentEventType - The event type being validated
 * @param pairedEventType - The event type that must occur before the current event can be sent again
 * @returns true if the current event is valid, false otherwise
 */
const validatePairedEvent = (
  bizEvents: BizEventWithEvent[],
  currentEventType: string,
  pairedEventType: string,
) => {
  const currentEvents =
    bizEvents?.filter((event) => event.event?.codeName === currentEventType) || [];

  // If no current events exist, allow the first one
  if (currentEvents.length === 0) {
    return true;
  }

  // Find the latest current event using date-fns isAfter for consistent date comparison
  const latestCurrentEvent = currentEvents.reduce((latest, current) => {
    return isAfter(new Date(current.createdAt), new Date(latest.createdAt)) ? current : latest;
  });

  // Pre-calculate the date of the latest current event to avoid repeated Date parsing
  const latestCurrentEventDate = new Date(latestCurrentEvent.createdAt);

  // Find all paired events that occurred after the latest current event
  const pairedEventsAfterCurrent =
    bizEvents?.filter(
      (event) =>
        event.event?.codeName === pairedEventType &&
        isAfter(new Date(event.createdAt), latestCurrentEventDate),
    ) || [];

  // Allow current event only if there's at least one paired event after the latest current event
  return pairedEventsAfterCurrent.length > 0;
};

// ============================================================================
// Event Validation
// ============================================================================

// Event validation rules
const EVENT_VALIDATION_RULES = {
  [BizEvents.CHECKLIST_SEEN]: {
    validate: (bizEvents: BizEventWithEvent[]) => {
      return validatePairedEvent(bizEvents, BizEvents.CHECKLIST_SEEN, BizEvents.CHECKLIST_HIDDEN);
    },
  },
  [BizEvents.CHECKLIST_HIDDEN]: {
    validate: (bizEvents: BizEventWithEvent[]) => {
      return validatePairedEvent(bizEvents, BizEvents.CHECKLIST_HIDDEN, BizEvents.CHECKLIST_SEEN);
    },
  },
  [BizEvents.CHECKLIST_TASK_COMPLETED]: {
    validate: (bizEvents: BizEventWithEvent[], events: Record<string, unknown>) =>
      !bizEvents?.some(
        (event) =>
          event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED &&
          event.data?.[EventAttributes.CHECKLIST_TASK_ID] ===
            events[EventAttributes.CHECKLIST_TASK_ID],
      ),
  },
};

export const hasDismissedEvent = (bizEvents: BizEventWithEvent[]) => {
  return bizEvents?.some((event) =>
    DISMISSED_EVENTS.includes(event.event?.codeName as (typeof DISMISSED_EVENTS)[number]),
  );
};

export const isValidEvent = (
  eventName: string,
  bizSession: BizSessionWithEvents,
  events: Record<string, unknown>,
) => {
  const bizEvents = bizSession.bizEvent;

  // Check if any dismissed event has occurred
  if (hasDismissedEvent(bizEvents)) {
    return false;
  }

  // Check if event has specific validation rules
  const validationRule = EVENT_VALIDATION_RULES[eventName as keyof typeof EVENT_VALIDATION_RULES];
  if (validationRule) {
    return validationRule.validate(bizEvents, events);
  }

  // Check if event should only occur once
  if (SINGLE_OCCURRENCE_EVENTS.includes(eventName as (typeof SINGLE_OCCURRENCE_EVENTS)[number])) {
    return !bizEvents?.some((event) => event.event?.codeName === eventName);
  }

  return true;
};

// ============================================================================
// Progress and State Functions
// ============================================================================

/**
 * Calculate session progress based on event data and current progress
 * @param events - The event data object (may be undefined)
 * @param eventCodeName - The event code name
 * @param currentProgress - The current session progress
 * @returns The calculated progress to update, or null if no update is needed
 */
export const calculateSessionProgress = (
  events: Record<string, unknown>,
  eventCodeName: string,
  currentProgress: number,
): number | null => {
  const stepProgress = (events?.[EventAttributes.FLOW_STEP_PROGRESS] as number | undefined) ?? 0;
  // Calculate new progress from event
  const newProgress = isCompletedEvent(eventCodeName) ? 100 : stepProgress;

  // Calculate max progress: take the maximum of newProgress and currentProgress, but cap at 100
  const maxProgress = Math.min(Math.max(newProgress, currentProgress), 100);

  // Return the calculated progress only if it's different from current progress
  return maxProgress !== currentProgress ? maxProgress : null;
};

export const getEventState = (eventCodeName: string, currentState: number): number | null => {
  // Reuse DISMISSED_EVENTS constant for consistency
  const newState = DISMISSED_EVENTS.includes(eventCodeName as (typeof DISMISSED_EVENTS)[number])
    ? 1
    : 0;

  // Return the calculated state only if it's different from current state
  return newState !== currentState ? newState : null;
};

export const getCurrentStepId = (
  events: Record<string, unknown>,
  eventCodeName: string,
  currentStepId?: string | null,
): string | null => {
  if (eventCodeName === BizEvents.FLOW_STEP_SEEN) {
    const newStepId = events[EventAttributes.FLOW_STEP_ID] as string | undefined;

    // If newStepId is missing or empty, keep current value (return null means no update)
    if (isNullish(newStepId) || isEmptyString(newStepId)) {
      return null;
    }

    // Return the new stepId only if it's different from current stepId
    return newStepId !== currentStepId ? newStepId : null;
  }
  // For other events, no update needed
  return null;
};

// ============================================================================
// Base Event Data Builders
// ============================================================================

/**
 * Build base event data for flow events
 * @param session - The business session with content and version
 * @returns Base flow event data
 */
export const buildFlowBaseEventData = (
  session: Pick<BizSessionWithRelations, 'content' | 'version'>,
): Record<string, any> => {
  return {
    [EventAttributes.FLOW_ID]: session.content.id,
    [EventAttributes.FLOW_NAME]: session.content.name,
    [EventAttributes.FLOW_VERSION_ID]: session.version.id,
    [EventAttributes.FLOW_VERSION_NUMBER]: session.version.sequence,
  };
};

/**
 * Build base event data for checklist events
 * @param session - The business session with content and version
 * @returns Base checklist event data
 */
export const buildChecklistBaseEventData = (
  session: Pick<BizSessionWithRelations, 'content' | 'version'>,
): Record<string, any> => {
  return {
    [EventAttributes.CHECKLIST_ID]: session.content.id,
    [EventAttributes.CHECKLIST_VERSION_NUMBER]: session.version.sequence,
    [EventAttributes.CHECKLIST_VERSION_ID]: session.version.id,
    [EventAttributes.CHECKLIST_NAME]: session.content.name,
  };
};

/**
 * Build base event data for launcher events
 * @param session - The business session with content and version
 * @returns Base launcher event data
 */
export const buildLauncherBaseEventData = (
  session: Pick<BizSessionWithRelations, 'content' | 'version'>,
): Record<string, any> => {
  return {
    [EventAttributes.LAUNCHER_ID]: session.content.id,
    [EventAttributes.LAUNCHER_NAME]: session.content.name,
    [EventAttributes.LAUNCHER_VERSION_ID]: session.version.id,
    [EventAttributes.LAUNCHER_VERSION_NUMBER]: session.version.sequence,
  };
};

// ============================================================================
// Flow Event Data Builders
// ============================================================================

/**
 * Build event data for flow start events
 * @param session - The business session with content and version
 * @param params - Event build parameters containing startReason
 * @returns Flow start event data, or null if startReason is missing
 */
export const buildFlowStartEventData = (
  session: Pick<BizSessionWithRelations, 'content' | 'version'>,
  params?: EventBuildParams,
): Record<string, any> | null => {
  const startReason = params?.startReason;
  if (!startReason) {
    return null;
  }

  return {
    ...buildFlowBaseEventData(session),
    [EventAttributes.FLOW_START_REASON]: startReason,
  };
};

/**
 * Build go to step event data
 * Steps are sorted by sequence in descending order before calculation
 * @param session - The business session with content and version
 * @param params - Event build parameters containing stepId, or stepId directly for backward compatibility
 * @returns Object containing event data and completion status, or null if validation fails
 */
export const buildStepEventData = (
  session: BizSessionWithRelations,
  params?: EventBuildParams | string | null,
): Record<string, any> | null => {
  // Support both new params object and legacy stepId string for backward compatibility
  const stepId = typeof params === 'string' || params === null ? params : params?.stepId;
  if (!stepId) {
    return null;
  }

  const steps = session.version.steps;
  if (!steps) {
    return null;
  }

  const stepIndex = steps.findIndex((step: Step) => step.id === stepId);

  if (stepIndex === -1) {
    return null;
  }

  const step = steps[stepIndex];

  // Calculate progress using the extracted function
  const progress = calculateStepProgress(steps, stepIndex);

  // Build event data
  const eventData = {
    ...buildFlowBaseEventData(session),
    [EventAttributes.FLOW_STEP_ID]: step.id,
    [EventAttributes.FLOW_STEP_NUMBER]: stepIndex,
    [EventAttributes.FLOW_STEP_CVID]: step.cvid,
    [EventAttributes.FLOW_STEP_NAME]: step.name,
  };

  if (progress !== -1) {
    eventData[EventAttributes.FLOW_STEP_PROGRESS] = progress;
  }

  return eventData;
};

/**
 * Build event data for flow ended events
 * @param session - The business session with content, version, and currentStepId
 * @param params - Event build parameters containing endReason
 * @returns Flow ended event data, or null if validation fails
 */
export const buildFlowEndedEventData = (
  session: BizSessionWithRelations,
  params?: EventBuildParams,
): Record<string, any> | null => {
  const endReason = params?.endReason;
  if (!endReason) {
    return null;
  }

  // Prefer currentStepId if available, otherwise find the latest step from events
  const stepId = !isEmptyString(session.currentStepId)
    ? session.currentStepId
    : findStepIdByLatestCvid(session);
  if (!stepId) {
    return null;
  }

  const eventData = buildStepEventData(session, stepId);
  if (!eventData) {
    return null;
  }

  return {
    ...eventData,
    [EventAttributes.FLOW_END_REASON]: endReason,
  };
};

/**
 * Build event data for question answered events
 * @param session - The business session with content and version
 * @param params - Event build parameters containing answer, or answer directly for backward compatibility
 * @returns Question answered event data, or null if params is missing or invalid
 */
export const buildQuestionAnsweredEventData = (
  session: Pick<BizSessionWithRelations, 'content' | 'version'>,
  params?: EventBuildParams | AnswerQuestionDto,
): Record<string, any> | null => {
  // Support both new params object and legacy answer object for backward compatibility
  const answer =
    params && 'answer' in params ? params.answer : (params as AnswerQuestionDto | undefined);
  if (!answer || !answer.questionCvid) {
    return null;
  }

  const eventData: Record<string, any> = {
    ...buildFlowBaseEventData(session),
    [EventAttributes.QUESTION_CVID]: answer.questionCvid,
    [EventAttributes.QUESTION_NAME]: answer.questionName,
    [EventAttributes.QUESTION_TYPE]: answer.questionType,
  };

  if (!isNullish(answer.listAnswer)) {
    eventData[EventAttributes.LIST_ANSWER] = answer.listAnswer;
  }
  if (!isNullish(answer.numberAnswer)) {
    eventData[EventAttributes.NUMBER_ANSWER] = answer.numberAnswer;
  }
  if (!isNullish(answer.textAnswer)) {
    eventData[EventAttributes.TEXT_ANSWER] = answer.textAnswer;
  }

  return eventData;
};

// ============================================================================
// Checklist Event Data Builders
// ============================================================================

/**
 * Build event data for checklist start events
 * @param session - The business session with content and version
 * @param params - Event build parameters containing startReason
 * @returns Checklist start event data, or null if startReason is missing
 */
export const buildChecklistStartEventData = (
  session: Pick<BizSessionWithRelations, 'content' | 'version'>,
  params?: EventBuildParams,
): Record<string, any> | null => {
  const startReason = params?.startReason;
  if (!startReason) {
    return null;
  }

  return {
    ...buildChecklistBaseEventData(session),
    [EventAttributes.CHECKLIST_START_REASON]: startReason,
  };
};

/**
 * Build event data for checklist dismissed events
 * @param session - The business session with content and version
 * @param params - Event build parameters containing endReason
 * @returns Checklist dismissed event data, or null if endReason is missing
 */
export const buildChecklistDismissedEventData = (
  session: Pick<BizSessionWithRelations, 'content' | 'version'>,
  params?: EventBuildParams,
): Record<string, any> | null => {
  const endReason = params?.endReason;
  if (!endReason) {
    return null;
  }

  return {
    ...buildChecklistBaseEventData(session),
    [EventAttributes.CHECKLIST_END_REASON]: endReason,
  };
};

/**
 * Build event data for checklist task events (clicked or completed)
 * @param session - The business session with content and version (version must have data property with ChecklistData)
 * @param params - Event build parameters containing taskId
 * @returns Checklist task event data, or null if task not found
 */
export const buildChecklistTaskEventData = (
  session: BizSessionWithRelations,
  params?: EventBuildParams,
): Record<string, any> | null => {
  const taskId = params?.taskId;
  if (!taskId) {
    return null;
  }

  const checklistData = session.version.data as unknown as ChecklistData;
  const checklistItem = checklistData?.items?.find((item) => item.id === taskId);
  if (!checklistItem) {
    return null;
  }
  return {
    ...buildChecklistBaseEventData(session),
    [EventAttributes.CHECKLIST_TASK_ID]: checklistItem.id,
    [EventAttributes.CHECKLIST_TASK_NAME]: checklistItem.name,
  };
};

// ============================================================================
// Launcher Event Data Builders
// ============================================================================

/**
 * Build event data for launcher seen events
 * @param session - The business session with content and version
 * @param params - Event build parameters containing startReason
 * @returns Launcher seen event data, or null if startReason is missing
 */
export const buildLauncherSeenEventData = (
  session: Pick<BizSessionWithRelations, 'content' | 'version'>,
  params?: EventBuildParams,
): Record<string, any> | null => {
  const startReason = params?.startReason;
  if (!startReason) {
    return null;
  }

  return {
    ...buildLauncherBaseEventData(session),
    [EventAttributes.LAUNCHER_START_REASON]: startReason,
  };
};

/**
 * Build event data for launcher dismissed events
 * @param session - The business session with content and version
 * @param params - Event build parameters containing endReason
 * @returns Launcher dismissed event data, or null if endReason is missing
 */
export const buildLauncherDismissedEventData = (
  session: Pick<BizSessionWithRelations, 'content' | 'version'>,
  params?: EventBuildParams,
): Record<string, any> | null => {
  const endReason = params?.endReason;
  if (!endReason) {
    return null;
  }

  return {
    ...buildLauncherBaseEventData(session),
    [EventAttributes.LAUNCHER_END_REASON]: endReason,
  };
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get answer from event data
 * @param event - The event data
 * @returns The answer
 */
export const getAnswer = (event: Record<string, any>) => {
  for (const attr of ANSWER_ATTRIBUTES) {
    const value = event[attr];
    if (!isNullish(value)) {
      return value;
    }
  }
  return null;
};

/**
 * Assign client context to event data
 * @param data - The event data
 * @param clientContext - The client context
 * @returns Event data with client context assigned
 */
export const assignClientContext = (
  data: Record<string, unknown>,
  clientContext: ClientContext,
): Record<string, unknown> => {
  return {
    ...data,
    [EventAttributes.PAGE_URL]: clientContext.pageUrl,
    [EventAttributes.VIEWPORT_WIDTH]: clientContext.viewportWidth,
    [EventAttributes.VIEWPORT_HEIGHT]: clientContext.viewportHeight,
  };
};

/**
 * Get the start event type for a given content type
 * @param contentType - The content type (FLOW, CHECKLIST, or LAUNCHER)
 * @returns The corresponding start event type, or null if content type is not supported
 */
export const getStartEventType = (contentType: ContentDataType): BizEvents | null => {
  if (contentType === ContentDataType.FLOW) {
    return BizEvents.FLOW_STARTED;
  }
  if (contentType === ContentDataType.CHECKLIST) {
    return BizEvents.CHECKLIST_STARTED;
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return BizEvents.LAUNCHER_SEEN;
  }
  return null;
};

/**
 * Get the end event type for a given content type
 * @param contentType - The content type (FLOW, CHECKLIST, or LAUNCHER)
 * @returns The corresponding end event type, or null if content type is not supported
 */
export const getEndEventType = (contentType: ContentDataType): BizEvents | null => {
  if (contentType === ContentDataType.FLOW) {
    return BizEvents.FLOW_ENDED;
  }
  if (contentType === ContentDataType.CHECKLIST) {
    return BizEvents.CHECKLIST_DISMISSED;
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return BizEvents.LAUNCHER_DISMISSED;
  }
  return null;
};
