'use client';

import { useBlocker } from 'react-router-dom';
import { useEvent } from 'react-use';
import {
  useBuilderMethods,
  useIsBusy,
  useSaveState,
} from '@/pages/contents/components/builder/core';
import { LeaveConfirmDialog } from '@/pages/contents/components/builder/core/lifecycle/leave-confirm-dialog';

// Unsaved-work leave protection — both exit routes run through ONE predicate:
//
//   - beforeunload — browser-level exit (tab close, hard reload, external link).
//   - useBlocker   — SPA pathname changes (sidebar links, back/forward, navigate()).
//
// `hasUnsavedWork` folds every state that means "don't lose this": a non-FSM
// mutation or the initial load still in flight (isBusy = isLoading + saving),
// local edits not yet saved (dirty), and a failed save that still holds local
// state (error). 'idle' / 'saved' are clean and let navigation through.
// 'conflict' also passes: the draft can never be saved from this mount (the
// conflict dialog already said so), and blocking would offer a "save and
// leave" that is guaranteed to fail.
//
// Both paths share this one predicate on purpose: they used to live in two
// files with two slightly different booleans (beforeunload counted isLoading
// but missed error; the blocker counted error but missed isLoading), so the
// same "is there unsaved work?" question got two answers. One predicate, two
// consumers.
//
// useBlocker compares pathname only, so search-param-only changes (sub-view
// route params) pass through — they aren't user-perceivable "leaving".
export const BuilderLeaveGuard = () => {
  const { saveContent } = useBuilderMethods();
  const saveState = useSaveState();
  const isBusy = useIsBusy();
  const hasUnsavedWork = isBusy || saveState.status === 'dirty' || saveState.status === 'error';

  useEvent('beforeunload', (event: BeforeUnloadEvent) => {
    if (hasUnsavedWork) {
      event.preventDefault();
    }
  });

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!hasUnsavedWork) {
      return false;
    }
    return currentLocation.pathname !== nextLocation.pathname;
  });

  return (
    <LeaveConfirmDialog
      open={blocker.state === 'blocked'}
      onSaveAndLeave={async () => {
        // Only leave if the save actually succeeded — otherwise stay put (the
        // error toast is already shown) so we don't silently drop the edits.
        if (await saveContent()) {
          blocker.proceed?.();
        }
      }}
      onDiscardAndLeave={() => blocker.proceed?.()}
      onStay={() => blocker.reset?.()}
    />
  );
};

BuilderLeaveGuard.displayName = 'BuilderLeaveGuard';
