import { BizEvents, EventAttributes, StepSettings } from '@usertour/types';
import { Prisma } from '@prisma/client';
import { VersionWithSteps, Step } from '@/common/types/schema';
import { CustomContentVersion } from '@/common/types/content';

type BizSession = Prisma.BizSessionGetPayload<{
  include: {
    bizEvent: {
      include: {
        event: true;
      };
    };
  };
}>;

export const getEventProgress = (eventCodeName: string, customProgress: number) => {
  if (eventCodeName === BizEvents.FLOW_COMPLETED) {
    return 100;
  }
  if (eventCodeName === BizEvents.FLOW_STEP_SEEN) {
    return customProgress;
  }
  return 0;
};

export const getEventState = (eventCodeName: string) => {
  if (eventCodeName === BizEvents.FLOW_ENDED) {
    return 1;
  }
  if (eventCodeName === BizEvents.CHECKLIST_DISMISSED) {
    return 1;
  }
  if (eventCodeName === BizEvents.LAUNCHER_DISMISSED) {
    return 1;
  }
  return 0;
};

export const getCurrentStepId = (eventCodeName: string, customStepId?: string): string | null => {
  if (eventCodeName === BizEvents.FLOW_STEP_SEEN) {
    return customStepId;
  }
  return null;
};

/**
 * Validates paired events to ensure they alternate properly
 * @param bizEvents - All business events in the session
 * @param currentEventType - The event type being validated
 * @param pairedEventType - The event type that must occur before the current event can be sent again
 * @returns true if the current event is valid, false otherwise
 */
const validatePairedEvent = (
  bizEvents: BizSession['bizEvent'],
  currentEventType: string,
  pairedEventType: string,
) => {
  const currentEvents =
    bizEvents?.filter((event) => event.event?.codeName === currentEventType) || [];

  // If no current events exist, allow the first one
  if (currentEvents.length === 0) {
    return true;
  }

  // Find the latest current event
  const latestCurrentEvent = currentEvents.reduce((latest, current) => {
    return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
  });

  // Find all paired events that occurred after the latest current event
  const pairedEventsAfterCurrent =
    bizEvents?.filter(
      (event) =>
        event.event?.codeName === pairedEventType &&
        new Date(event.createdAt) > new Date(latestCurrentEvent.createdAt),
    ) || [];

  // Allow current event only if there's at least one paired event after the latest current event
  return pairedEventsAfterCurrent.length > 0;
};

// Event validation rules
const EVENT_VALIDATION_RULES = {
  [BizEvents.CHECKLIST_SEEN]: {
    validate: (bizEvents: BizSession['bizEvent']) => {
      return validatePairedEvent(bizEvents, BizEvents.CHECKLIST_SEEN, BizEvents.CHECKLIST_HIDDEN);
    },
  },
  [BizEvents.CHECKLIST_HIDDEN]: {
    validate: (bizEvents: BizSession['bizEvent']) => {
      return validatePairedEvent(bizEvents, BizEvents.CHECKLIST_HIDDEN, BizEvents.CHECKLIST_SEEN);
    },
  },
  [BizEvents.CHECKLIST_COMPLETED]: {
    validate: (bizEvents: BizSession['bizEvent']) => {
      // Find the latest CHECKLIST_TASK_COMPLETED event
      const taskCompletedEvents =
        bizEvents?.filter(
          (event) => event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED,
        ) || [];

      if (taskCompletedEvents.length === 0) {
        return false;
      }

      const latestTaskCompletedEvent = taskCompletedEvents.reduce((latest, current) => {
        return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
      });

      // Find all events that occurred after the latest CHECKLIST_TASK_COMPLETED
      const eventsAfterTaskCompleted =
        bizEvents?.filter(
          (event) => new Date(event.createdAt) > new Date(latestTaskCompletedEvent.createdAt),
        ) || [];

      // Check if there's no CHECKLIST_COMPLETED event after the latest CHECKLIST_TASK_COMPLETED
      const hasChecklistCompletedAfter = eventsAfterTaskCompleted.some(
        (event) => event.event?.codeName === BizEvents.CHECKLIST_COMPLETED,
      );

      return !hasChecklistCompletedAfter;
    },
  },
  // [BizEvents.CHECKLIST_TASK_CLICKED]: {
  //   validate: (bizEvents: BizSession['bizEvent'], events: any) =>
  //     !bizEvents?.some(
  //       (event) =>
  //         event.event?.codeName === BizEvents.CHECKLIST_TASK_CLICKED &&
  //         event.data?.[EventAttributes.CHECKLIST_TASK_ID] ===
  //           events[EventAttributes.CHECKLIST_TASK_ID],
  //     ),
  // },
  [BizEvents.CHECKLIST_TASK_COMPLETED]: {
    validate: (bizEvents: BizSession['bizEvent'], events: any) =>
      !bizEvents?.some(
        (event) =>
          event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED &&
          event.data?.[EventAttributes.CHECKLIST_TASK_ID] ===
            events[EventAttributes.CHECKLIST_TASK_ID],
      ),
  },
};

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

export const hasDismissedEvent = (bizEvents: BizSession['bizEvent']) => {
  return bizEvents?.some((event) =>
    DISMISSED_EVENTS.includes(event.event?.codeName as (typeof DISMISSED_EVENTS)[number]),
  );
};

export const isValidEvent = (eventName: string, bizSession: BizSession, events: any) => {
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
    [EventAttributes.FLOW_START_REASON]: startReason,
    [EventAttributes.FLOW_VERSION_ID]: customContentVersion.id,
    [EventAttributes.FLOW_VERSION_NUMBER]: customContentVersion.sequence,
  };
};

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
    [EventAttributes.CHECKLIST_ID]: customContentVersion.content.id,
    [EventAttributes.CHECKLIST_NAME]: customContentVersion.content.name,
    [EventAttributes.CHECKLIST_START_REASON]: startReason,
    [EventAttributes.CHECKLIST_VERSION_ID]: customContentVersion.id,
    [EventAttributes.CHECKLIST_VERSION_NUMBER]: customContentVersion.sequence,
  };
};

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
    [EventAttributes.LAUNCHER_ID]: customContentVersion.content.id,
    [EventAttributes.LAUNCHER_NAME]: customContentVersion.content.name,
    [EventAttributes.LAUNCHER_START_REASON]: startReason,
    [EventAttributes.LAUNCHER_VERSION_ID]: customContentVersion.id,
    [EventAttributes.LAUNCHER_VERSION_NUMBER]: customContentVersion.sequence,
  };
};

/**
 * Build go to step event data
 * Steps are sorted by sequence in descending order before calculation
 * @param version - The version with steps
 * @param stepId - The step ID
 * @returns Object containing event data and completion status, or null if validation fails
 */
export const buildGoToStepEventData = (
  version: VersionWithSteps,
  stepId: string,
): {
  eventData: Record<string, any>;
  isComplete: boolean;
} | null => {
  const steps = version.steps;
  const stepIndex = steps.findIndex((step: Step) => step.id === stepId);

  if (stepIndex === -1) {
    return null;
  }

  const step = steps[stepIndex];
  const total = steps.length;
  const progress = Math.round(((stepIndex + 1) / total) * 100);
  const isExplicitCompletionStep = (step.setting as StepSettings).explicitCompletionStep;
  const isComplete = isExplicitCompletionStep ? isExplicitCompletionStep : stepIndex + 1 === total;

  // Build event data
  const eventData = {
    [EventAttributes.FLOW_VERSION_ID]: version.id,
    [EventAttributes.FLOW_VERSION_NUMBER]: version.sequence,
    [EventAttributes.FLOW_STEP_ID]: step.id,
    [EventAttributes.FLOW_STEP_NUMBER]: stepIndex,
    [EventAttributes.FLOW_STEP_CVID]: step.cvid,
    [EventAttributes.FLOW_STEP_NAME]: step.name,
    [EventAttributes.FLOW_STEP_PROGRESS]: progress,
  };

  return { eventData, isComplete };
};
