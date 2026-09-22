import type { BizEventWithEvent } from './biz-event-with-event.type';
import type { BizSessionWithEvents } from './biz-session-with-events.type';

export type ContentSessionCollection = {
  activeSession?: BizSessionWithEvents;
  totalSessions: number;
  completedSessions: number;
  latestEvent?: BizEventWithEvent; // Latest event across all same-type contents (for atLeast frequency check)
  latestDismissedEvent?: BizEventWithEvent; // Latest dismissed event for current content (for every frequency check)
};
