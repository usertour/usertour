import {
  BizEvents,
  EventAttributes,
  StepSettings,
  ChecklistData,
  ClientContext,
} from '@usertour/types';
import { isNullish } from '@usertour/helpers';
import {
  VersionWithSteps,
  Step,
  Content,
  Version,
  BizEventWithEvent,
  BizSessionWithEvents,
} from '@/common/types/schema';
import { CustomContentVersion } from '@/common/types/content';
import type { AnswerQuestionDto } from '@usertour/types';
import { isAfter } from 'date-fns';

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
  // BizEvents.CHECKLIST_COMPLETED,
  BizEvents.CHECKLIST_DISMISSED,
  BizEvents.CHECKLIST_STARTED,
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
const calculateStepProgress = (steps: Step[], stepIndex: number): number => {
  // Validate inputs: stepIndex must be valid
  if (stepIndex < 0 || stepIndex >= steps.length) {
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

  // Validate total
  if (total <= 1) {
    return -1;
  }

  // If there's an explicit completion step and current step is after it, it's not complete
  if (firstExplicitCompletionStepIndex !== -1 && stepIndex > firstExplicitCompletionStepIndex) {
    return -1;
  }

  // Check if current step has explicitCompletionStep setting
  const isExplicitCompletionStep = (step.setting as StepSettings)?.explicitCompletionStep;

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
  [BizEvents.CHECKLIST_COMPLETED]: {
    validate: (bizEvents: BizEventWithEvent[]) => {
      // Find the latest CHECKLIST_TASK_COMPLETED event
      const taskCompletedEvents =
        bizEvents?.filter(
          (event) => event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED,
        ) || [];

      if (taskCompletedEvents.length === 0) {
        return false;
      }

      // Find the latest task completed event using date-fns isAfter for consistent date comparison
      const latestTaskCompletedEvent = taskCompletedEvents.reduce((latest, current) => {
        return isAfter(new Date(current.createdAt), new Date(latest.createdAt)) ? current : latest;
      });

      // Pre-calculate the date to avoid repeated Date parsing
      const latestTaskCompletedDate = new Date(latestTaskCompletedEvent.createdAt);

      // Find all events that occurred after the latest CHECKLIST_TASK_COMPLETED
      const eventsAfterTaskCompleted =
        bizEvents?.filter((event) => isAfter(new Date(event.createdAt), latestTaskCompletedDate)) ||
        [];

      // Check if there's no CHECKLIST_COMPLETED event after the latest CHECKLIST_TASK_COMPLETED
      const hasChecklistCompletedAfter = eventsAfterTaskCompleted.some(
        (event) => event.event?.codeName === BizEvents.CHECKLIST_COMPLETED,
      );

      return !hasChecklistCompletedAfter;
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
  events: Record<string, unknown> | undefined,
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

export const getEventState = (eventCodeName: string) => {
  // Reuse DISMISSED_EVENTS constant for consistency
  return DISMISSED_EVENTS.includes(eventCodeName as (typeof DISMISSED_EVENTS)[number]) ? 1 : 0;
};

export const getCurrentStepId = (eventCodeName: string, customStepId?: string): string | null => {
  if (eventCodeName === BizEvents.FLOW_STEP_SEEN) {
    return customStepId;
  }
  return null;
};

// ============================================================================
// Base Event Data Builders
// ============================================================================

/**
 * Build base event data for flow events
 * @param content - The content object with id and name
 * @param version - The version object with id and sequence
 * @returns Base flow event data
 */
export const buildFlowBaseEventData = (
  content: Pick<Content, 'id' | 'name'>,
  version: Pick<Version, 'id' | 'sequence'>,
): Record<string, any> => {
  return {
    [EventAttributes.FLOW_ID]: content.id,
    [EventAttributes.FLOW_NAME]: content.name,
    [EventAttributes.FLOW_VERSION_ID]: version.id,
    [EventAttributes.FLOW_VERSION_NUMBER]: version.sequence,
  };
};

/**
 * Build base event data for checklist events
 * @param content - The content object with id and name
 * @param version - The version object with id and sequence
 * @returns Base checklist event data
 */
export const buildChecklistBaseEventData = (
  content: Pick<Content, 'id' | 'name'>,
  version: Pick<Version, 'id' | 'sequence'>,
): Record<string, any> => {
  return {
    [EventAttributes.CHECKLIST_ID]: content.id,
    [EventAttributes.CHECKLIST_VERSION_NUMBER]: version.sequence,
    [EventAttributes.CHECKLIST_VERSION_ID]: version.id,
    [EventAttributes.CHECKLIST_NAME]: content.name,
  };
};

/**
 * Build base event data for launcher events
 * @param content - The content object with id and name
 * @param version - The version object with id and sequence
 * @returns Base launcher event data
 */
export const buildLauncherBaseEventData = (
  content: Pick<Content, 'id' | 'name'>,
  version: Pick<Version, 'id' | 'sequence'>,
): Record<string, any> => {
  return {
    [EventAttributes.LAUNCHER_ID]: content.id,
    [EventAttributes.LAUNCHER_NAME]: content.name,
    [EventAttributes.LAUNCHER_VERSION_ID]: version.id,
    [EventAttributes.LAUNCHER_VERSION_NUMBER]: version.sequence,
  };
};

// ============================================================================
// Flow Event Data Builders
// ============================================================================

/**
 * Build event data for flow start events
 * @param customContentVersion - The custom content version
 * @param startReason - The start reason
 * @returns Flow start event data
 */
export const buildFlowStartEventData = (
  customContentVersion: CustomContentVersion,
  startReason: string,
): Record<string, any> => {
  return {
    ...buildFlowBaseEventData(customContentVersion.content, customContentVersion),
    [EventAttributes.FLOW_START_REASON]: startReason,
  };
};

/**
 * Build go to step event data
 * Steps are sorted by sequence in descending order before calculation
 * @param content - The content object with id and name
 * @param version - The version with steps
 * @param stepId - The step ID
 * @returns Object containing event data and completion status, or null if validation fails
 */
export const buildStepEventData = (
  content: Pick<Content, 'id' | 'name'>,
  version: VersionWithSteps,
  stepId: string,
): Record<string, any> | null => {
  const steps = version.steps;
  const stepIndex = steps.findIndex((step: Step) => step.id === stepId);

  if (stepIndex === -1) {
    return null;
  }

  const step = steps[stepIndex];

  // Calculate progress using the extracted function
  const progress = calculateStepProgress(steps, stepIndex);

  // Build event data
  const eventData = {
    ...buildFlowBaseEventData(content, version),
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

export const buildFlowEndedEventData = (
  content: Pick<Content, 'id' | 'name'>,
  version: VersionWithSteps,
  currentStepId: string,
  endReason: string,
): Record<string, any> | null => {
  const eventData = buildStepEventData(content, version, currentStepId);
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
 * @param content - The content object with id and name
 * @param version - The version object with id and sequence
 * @param params - The parameters for the question answered event (sessionId will be ignored)
 * @returns Question answered event data
 */
export const buildQuestionAnsweredEventData = (
  content: Pick<Content, 'id' | 'name'>,
  version: Pick<Version, 'id' | 'sequence'>,
  params: AnswerQuestionDto,
): Record<string, any> => {
  const eventData: Record<string, any> = {
    ...buildFlowBaseEventData(content, version),
    [EventAttributes.QUESTION_CVID]: params.questionCvid,
    [EventAttributes.QUESTION_NAME]: params.questionName,
    [EventAttributes.QUESTION_TYPE]: params.questionType,
  };

  if (!isNullish(params.listAnswer)) {
    eventData[EventAttributes.LIST_ANSWER] = params.listAnswer;
  }
  if (!isNullish(params.numberAnswer)) {
    eventData[EventAttributes.NUMBER_ANSWER] = params.numberAnswer;
  }
  if (!isNullish(params.textAnswer)) {
    eventData[EventAttributes.TEXT_ANSWER] = params.textAnswer;
  }

  return eventData;
};

// ============================================================================
// Checklist Event Data Builders
// ============================================================================

/**
 * Build event data for checklist start events
 * @param customContentVersion - The custom content version
 * @param startReason - The start reason
 * @returns Checklist start event data
 */
export const buildChecklistStartEventData = (
  customContentVersion: CustomContentVersion,
  startReason: string,
): Record<string, any> => {
  return {
    ...buildChecklistBaseEventData(customContentVersion.content, customContentVersion),
    [EventAttributes.CHECKLIST_START_REASON]: startReason,
  };
};

/**
 * Build event data for checklist dismissed events
 * @param content - The content object with id and name
 * @param version - The version object with id and sequence
 * @param endReason - The end reason
 * @returns Checklist dismissed event data
 */
export const buildChecklistDismissedEventData = (
  content: Pick<Content, 'id' | 'name'>,
  version: Pick<Version, 'id' | 'sequence'>,
  endReason: string,
): Record<string, any> => {
  return {
    ...buildChecklistBaseEventData(content, version),
    [EventAttributes.CHECKLIST_END_REASON]: endReason,
  };
};

/**
 * Build event data for checklist task events (clicked or completed)
 * @param content - The content object with id and name
 * @param version - The version object with id and sequence (must have data property with ChecklistData)
 * @param taskId - The task ID to find in checklist items
 * @returns Checklist task event data, or null if task not found
 */
export const buildChecklistTaskEventData = (
  content: Pick<Content, 'id' | 'name'>,
  version: Pick<Version, 'id' | 'sequence' | 'data'>,
  taskId: string,
): Record<string, any> | null => {
  const checklistData = version.data as unknown as ChecklistData;
  const checklistItem = checklistData?.items?.find((item) => item.id === taskId);
  if (!checklistItem) {
    return null;
  }
  return {
    ...buildChecklistBaseEventData(content, version),
    [EventAttributes.CHECKLIST_TASK_ID]: checklistItem.id,
    [EventAttributes.CHECKLIST_TASK_NAME]: checklistItem.name,
  };
};

// ============================================================================
// Launcher Event Data Builders
// ============================================================================

/**
 * Build event data for launcher seen events
 * @param customContentVersion - The custom content version
 * @param startReason - The start reason
 * @returns Launcher seen event data
 */
export const buildLauncherSeenEventData = (
  customContentVersion: CustomContentVersion,
  startReason: string,
): Record<string, any> => {
  return {
    ...buildLauncherBaseEventData(customContentVersion.content, customContentVersion),
    [EventAttributes.LAUNCHER_START_REASON]: startReason,
  };
};

/**
 * Build event data for launcher dismissed events
 * @param content - The content object with id and name
 * @param version - The version object with id and sequence
 * @param endReason - The end reason
 * @returns Launcher dismissed event data
 */
export const buildLauncherDismissedEventData = (
  content: Pick<Content, 'id' | 'name'>,
  version: Pick<Version, 'id' | 'sequence'>,
  endReason: string,
): Record<string, any> => {
  return {
    ...buildLauncherBaseEventData(content, version),
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
