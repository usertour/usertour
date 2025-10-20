import { BizEvents, EventAttributes } from '@usertour/types';
import { Prisma } from '@prisma/client';

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
  [BizEvents.CHECKLIST_TASK_CLICKED]: {
    validate: (bizEvents: BizSession['bizEvent'], events: any) =>
      !bizEvents?.some(
        (event) =>
          event.event?.codeName === BizEvents.CHECKLIST_TASK_CLICKED &&
          event.data?.[EventAttributes.CHECKLIST_TASK_ID] ===
            events[EventAttributes.CHECKLIST_TASK_ID],
      ),
  },
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
