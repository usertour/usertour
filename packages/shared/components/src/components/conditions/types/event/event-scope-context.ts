import { createContext, useContext } from 'react';

// Provides the parent event's id to nested event-attr children. event-attr
// is structurally only valid inside an event editor's where section, so the
// scope eventId is always derivable from the React tree — there's no need
// to persist a copy on each condition's data, and no risk of the stored
// copy drifting from the parent's actual id (which was the source of a
// real bug where the editor's attribute picker queried a stale event).
export const EventScopeContext = createContext<string | undefined>(undefined);

export function useEventScope(): string | undefined {
  return useContext(EventScopeContext);
}
