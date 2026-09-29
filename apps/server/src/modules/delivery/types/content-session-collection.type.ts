import type { BizEventWithEvent } from './biz-event-with-event.type';
import type { BizSessionWithEvents } from './biz-session-with-events.type';

export type ContentSessionCollection = {
  activeSession?: BizSessionWithEvents;
  totalSessions: number;
  completedSessions: number;
  /** The user's latest event on ANOTHER content of the same type: the quiet period (`frequency.atLeast`) measures from it. */
  latestSiblingEvent?: BizEventWithEvent;
  latestDismissedEvent?: BizEventWithEvent; // Latest dismissed event for current content (for every frequency check)
};
