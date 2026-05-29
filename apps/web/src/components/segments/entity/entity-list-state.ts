import { makeVar, type ReactiveVar } from '@apollo/client';
import type { CurrentConditions } from '@usertour/types';

// Shared list state for user / company list pages.
//
// Replaces the prop-drilled `setQuery` / `setCurrentConditions` chain
// from EntityListContent → EntityDataTable → EntityDataTableToolbar.
// Each page tree (user vs company) has its own store so the two side-
// by-side configs don't bleed into each other.
//
// `query` — filter object derived from the typed conditions; goes into
//   the listUsers / listCompanies request as `query` variable.
// `currentConditions` — the unsaved Conditions[] the user has typed
//   into the filter input; read by EntitySegmentFilterSave to decide
//   whether the Save button should appear (typed shape diverges from
//   the segment's saved shape).
//
// Module-level: state survives navigation between segments on the same
// page (typically desired — return to the same filter you left). Cross-
// tab is not shared (in-memory only); each tab gets its own copy. Fresh
// reload starts empty.
export interface BizListState {
  queryVar: ReactiveVar<Record<string, unknown>>;
  currentConditionsVar: ReactiveVar<CurrentConditions | undefined>;
}

const createBizListState = (): BizListState => ({
  queryVar: makeVar<Record<string, unknown>>({}),
  currentConditionsVar: makeVar<CurrentConditions | undefined>(undefined),
});

export const userListState = createBizListState();
export const companyListState = createBizListState();
