import { useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { defaultStep } from '@usertour/helpers';
import type { Step } from '@usertour/types';
import { useBuilderStore } from '../../core';
import { getEmptyDataForType } from '../../utils/default-data';

// Seeds the Flow edit buffer (currentStep + currentIndex) from the route,
// replacing the old "clone on enter-click" path so navigation, deep-links and
// refresh all land on the right step:
//   step/:index    → clone currentVersion.steps[index]
//   step/new/:type → a fresh, id-less step (the save creates it server-side)
// Runs in a layout effect (before paint) keyed on the route param ONLY — not
// on currentVersion — so a later save re-baseline doesn't clobber in-progress
// buffer edits. The `ready` gate above WebBuilderContent guarantees
// currentVersion is loaded by the time a step route mounts.
export const useSeedStepFromRoute = () => {
  const { index, type } = useParams();
  const currentVersion = useBuilderStore((s) => s.currentVersion);
  const setCurrentStep = useBuilderStore((s) => s.setCurrentStep);
  const setCurrentIndex = useBuilderStore((s) => s.setCurrentIndex);

  useLayoutEffect(() => {
    const steps = currentVersion?.steps ?? [];
    if (type) {
      setCurrentStep({
        ...defaultStep,
        setting: { ...defaultStep.setting },
        type,
        name: 'Untitled',
        data: getEmptyDataForType(),
        sequence: steps.length,
      } as Step);
      setCurrentIndex(steps.length);
      return;
    }
    if (index === undefined) {
      return;
    }
    const stepIndex = Number.parseInt(index, 10);
    const step = steps[stepIndex];
    if (!step) {
      return;
    }
    setCurrentStep(
      JSON.parse(
        JSON.stringify({ ...step, setting: { ...defaultStep.setting, ...step.setting } }),
      ) as Step,
    );
    setCurrentIndex(stepIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, type]);
};
