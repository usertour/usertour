import { BizEvents, EventAttributes } from '@/common/consts/attribute';
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

export const getEventProgress = (eventName: string, customProgress: number) => {
  if (eventName === BizEvents.FLOW_COMPLETED) {
    return 100;
  }
  if (eventName === BizEvents.FLOW_STEP_SEEN) {
    return customProgress;
  }
  return 0;
};

export const getEventState = (eventName: string) => {
  if (eventName === BizEvents.FLOW_ENDED) {
    return 1;
  }
  if (eventName === BizEvents.CHECKLIST_DISMISSED) {
    return 1;
  }
  if (eventName === BizEvents.LAUNCHER_DISMISSED) {
    return 1;
  }
  return 0;
};

// Event validation rules
const EVENT_VALIDATION_RULES = {
  [BizEvents.FLOW_STEP_SEEN]: {
    validate: (bizEvents: BizSession['bizEvent'], events: any, bizSession: BizSession) => {
      if (events.flow_step_progress < bizSession.progress) {
        return false;
      }
      return !bizEvents?.some(
        (event) =>
          event.event?.codeName === BizEvents.FLOW_STEP_SEEN &&
          event.data?.[EventAttributes.FLOW_STEP_CVID] === events[EventAttributes.FLOW_STEP_CVID],
      );
    },
  },
  [BizEvents.QUESTION_ANSWERED]: {
    validate: (bizEvents: BizSession['bizEvent'], events: any) =>
      !bizEvents?.some(
        (event) =>
          event.event?.codeName === BizEvents.QUESTION_ANSWERED &&
          event.data?.[EventAttributes.QUESTION_CVID] === events[EventAttributes.QUESTION_CVID],
      ),
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
  BizEvents.CHECKLIST_COMPLETED,
  BizEvents.CHECKLIST_DISMISSED,
  BizEvents.CHECKLIST_STARTED,
  BizEvents.LAUNCHER_DISMISSED,
] as const;

// Events that should invalidate subsequent events
const INVALIDATING_EVENTS = [
  BizEvents.CHECKLIST_DISMISSED,
  BizEvents.LAUNCHER_DISMISSED,
  BizEvents.FLOW_ENDED,
] as const;

const hasInvalidatingEvent = (bizEvents: BizSession['bizEvent']) => {
  return bizEvents?.some((event) =>
    INVALIDATING_EVENTS.includes(event.event?.codeName as (typeof INVALIDATING_EVENTS)[number]),
  );
};

export const isValidEvent = (eventName: string, bizSession: BizSession, events: any) => {
  const bizEvents = bizSession.bizEvent;

  // Check if any invalidating event has occurred
  if (hasInvalidatingEvent(bizEvents)) {
    return false;
  }

  // Check if event has specific validation rules
  const validationRule = EVENT_VALIDATION_RULES[eventName as keyof typeof EVENT_VALIDATION_RULES];
  if (validationRule) {
    return validationRule.validate(bizEvents, events, bizSession);
  }

  // Check if event should only occur once
  if (SINGLE_OCCURRENCE_EVENTS.includes(eventName as (typeof SINGLE_OCCURRENCE_EVENTS)[number])) {
    return !bizEvents?.some((event) => event.event?.codeName === eventName);
  }

  return true;
};
