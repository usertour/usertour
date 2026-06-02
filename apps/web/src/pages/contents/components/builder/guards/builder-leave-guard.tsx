'use client';

import { useBlocker } from 'react-router-dom';
import { useBuilderMethods, useSaveState } from '@/pages/contents/components/builder/core';
import { LeaveConfirmDialog } from '@/pages/contents/components/builder/guards/leave-confirm-dialog';

// SPA-internal navigation guard. V1 only had `beforeunload` (covers
// browser-level exit: tab close, refresh, external link). React Router
// `useBlocker` covers in-app pathname changes — clicking sidebar
// links, browser back/forward, programmatic navigate() calls.
//
// shouldBlock fires only on pathname change, not on search-param
// changes — the builder updates `?step=N` on every step click and
// those aren't user-perceivable "leaving" actions.
//
// shouldBlock dirty-check covers 'dirty' (edited, not yet saved),
// 'saving' (in flight), and 'error' (failed, still has unsaved
// state). 'idle' and 'saved' are clean and allow navigation through.

export const BuilderLeaveGuard = () => {
  const { saveContent } = useBuilderMethods();
  const saveState = useSaveState();
  const isDirty =
    saveState.status === 'dirty' || saveState.status === 'saving' || saveState.status === 'error';

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty) {
      return false;
    }
    return currentLocation.pathname !== nextLocation.pathname;
  });

  return (
    <LeaveConfirmDialog
      open={blocker.state === 'blocked'}
      onSaveAndLeave={async () => {
        await saveContent();
        blocker.proceed?.();
      }}
      onDiscardAndLeave={() => blocker.proceed?.()}
      onStay={() => blocker.reset?.()}
    />
  );
};

BuilderLeaveGuard.displayName = 'BuilderLeaveGuard';
