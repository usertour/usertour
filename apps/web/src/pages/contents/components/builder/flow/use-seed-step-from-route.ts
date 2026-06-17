import { useEffect, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { cuid, defaultStep } from '@usertour/helpers';
import type { Step } from '@usertour/types';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { getStepId } from '@/utils/content';
import { getEmptyDataForType } from '@/pages/contents/components/builder/utils/default-data';

// Seeds the Flow edit buffer (currentStep) from the route,
// replacing the old "clone on enter-click" path so navigation, deep-links and
// refresh all land on the right step:
//   step/:stepId   → clone the step whose stable id matches
//   step/new/:type → a fresh, id-less step (the save creates it server-side)
// Runs in a layout effect (before paint) keyed on the route param ONLY — not
// on currentVersion — so a later save re-baseline doesn't clobber in-progress
// buffer edits. The `ready` gate above WebBuilderContent guarantees
// currentVersion is loaded by the time a step route mounts.
export const useSeedStepFromRoute = () => {
  const { stepId, type } = useParams();
  const currentVersion = useBuilderStore((s) => s.currentVersion);
  const setCurrentStep = useBuilderStore((s) => s.setCurrentStep);

  useLayoutEffect(() => {
    const steps = currentVersion?.steps ?? [];
    if (type) {
      setCurrentStep({
        ...defaultStep,
        // Front-end-generated cvid: the new step's stable id for the whole-
        // version upsert, in hand before any server round-trip.
        cvid: cuid(),
        setting: { ...defaultStep.setting },
        type,
        name: 'Untitled',
        data: getEmptyDataForType(),
        sequence: steps.length,
      } as Step);
      return;
    }
    if (stepId === undefined) {
      return;
    }
    const step = steps.find((candidate, i) => getStepId(candidate, i) === stepId);
    if (!step) {
      return;
    }
    setCurrentStep(
      JSON.parse(
        JSON.stringify({ ...step, setting: { ...defaultStep.setting, ...step.setting } }),
      ) as Step,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, type]);

  // Discard the edit buffer when the step view unmounts — going back to the
  // overview, switching sub-views, or leaving the builder. The buffer is
  // scoped to one step-editing session: only Save commits it into
  // currentVersion, and the back button is a discard. Without this the buffer
  // outlives the session, so re-opening the SAME step resurrects the previous,
  // uncommitted edits: the uncontrolled preview editor (keyed by the step id,
  // which is unchanged) re-mounts and inits from the stale buffer before the
  // seed layout effect swaps in the fresh clone — e.g. a deleted action stays
  // gone until a refresh. Clearing to null makes the `!currentStep` guard hold
  // the editor back until the seed provides fresh data.
  useEffect(() => {
    return () => setCurrentStep(null);
  }, [setCurrentStep]);
};
