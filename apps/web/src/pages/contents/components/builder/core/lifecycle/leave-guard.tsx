'use client';

import { useEffect, useRef, useState } from 'react';
import { useBlocker, useParams } from 'react-router-dom';
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
//   - useBlocker   — SPA navigations that leave the builder (sidebar links,
//                    back/forward, navigate()).
//
// `hasUnsavedWork` folds every state that means "don't lose this": a save in
// flight (isBusy), local edits not yet saved (dirty), and a failed save that
// still holds local state (error). 'idle' / 'saved' are clean and let
// navigation through. 'conflict' also passes: the draft can never be saved
// from this mount (the conflict dialog already said so), and blocking would
// offer a "save and leave" that is guaranteed to fail.
//
// Both paths share this one predicate on purpose: they used to live in two
// files with two slightly different booleans, so the same "is there unsaved
// work?" question got two answers. One predicate, two consumers. The initial
// load is deliberately not part of it: leaving before the draft has arrived
// loses nothing.
//
// The blocker guards only navigations that leave the builder. The builders'
// sub-views (a flow's step, a launcher's target or tooltip, a resource
// center's tab or block) are route segments under the builder's own path,
// `/env/:envId/:contentType/:contentId/builder/*`, and switching between
// them keeps the draft mounted, so there is nothing to lose there.
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

  const { envId, contentType, contentId } = useParams();
  const builderPath = `/env/${envId}/${contentType}/${contentId}/builder`;
  const blocker = useBlocker(({ nextLocation }) => {
    if (!hasUnsavedWork) {
      return false;
    }
    const { pathname } = nextLocation;
    return pathname !== builderPath && !pathname.startsWith(`${builderPath}/`);
  });
  // Save & Leave outlives its render: it reads the blocker through a ref so
  // it acts on the blocker the router holds when the save returns (a later
  // navigation attempt may have replaced the one it was clicked for).
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;

  // Save & Leave in progress. The dialog disables both leave buttons while
  // `leaving` is set. Each click takes the next attempt number, and the
  // callback acts only if its number is still current when the save
  // returns: Stay, unmount and a later click all move the number on, so a
  // save that returns for an earlier click does nothing (a plain flag would
  // let the earlier save navigate on behalf of the later click, whose own
  // save is still queued behind it).
  const [leaving, setLeaving] = useState(false);
  const leaveAttemptRef = useRef(0);
  const endLeave = () => {
    leaveAttemptRef.current += 1;
    setLeaving(false);
  };
  useEffect(() => {
    return () => {
      leaveAttemptRef.current += 1;
    };
  }, []);

  return (
    <LeaveConfirmDialog
      open={blocker.state === 'blocked'}
      leaving={leaving}
      onSaveAndLeave={async () => {
        const attempt = leaveAttemptRef.current + 1;
        leaveAttemptRef.current = attempt;
        setLeaving(true);
        const saved = await saveContent();
        if (leaveAttemptRef.current !== attempt) {
          // Stay, unmount or a later Save & Leave superseded this click.
          return;
        }
        endLeave();
        // Only leave if the save actually succeeded — otherwise stay put (the
        // error toast is already shown) so we don't silently drop the edits.
        if (!saved) {
          return;
        }
        const current = blockerRef.current;
        if (current.state === 'blocked') {
          current.proceed();
        }
      }}
      onDiscardAndLeave={() => blocker.proceed?.()}
      onStay={() => {
        endLeave();
        blocker.reset?.();
      }}
    />
  );
};

BuilderLeaveGuard.displayName = 'BuilderLeaveGuard';
