import { useEffect, useRef } from 'react';
import { BuilderMode, useBuilderStore } from '../core';

// Mirrors the active Flow step index into the URL (store → URL) once the
// builder is `ready`. The callback is held in a ref so a fresh callback
// identity from the parent doesn't re-fire the mirror — the effect keys
// only on the step state + ready. Runs only after `ready` so it can't
// clobber the initial ?step before useBuilderInit has read it.
export const useStepUrlSync = (
  ready: boolean,
  onStepIndexChange?: (stepIndex: number | undefined) => void,
) => {
  const currentMode = useBuilderStore((state) => state.currentMode);
  const currentIndex = useBuilderStore((state) => state.currentIndex);
  const callbackRef = useRef(onStepIndexChange);

  useEffect(() => {
    callbackRef.current = onStepIndexChange;
  }, [onStepIndexChange]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const isStepMode =
      currentMode.mode === BuilderMode.FLOW_STEP_DETAIL ||
      currentMode.mode === BuilderMode.FLOW_STEP_TRIGGER;
    callbackRef.current?.(isStepMode ? currentIndex : undefined);
  }, [currentMode.mode, currentIndex, ready]);
};
