import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BuilderMode, useBuilderStore } from '../core';

// The `?step` query param <-> active Flow step binding. The builder owns it
// directly — it already runs inside the app's react-router context (the
// leave guard uses useBlocker) — so there's no need to thread the step in
// and out through props/callbacks of the host. `useStepUrlParam` reads the
// initial step to open; `useStepUrlSync` mirrors the active step back.

// The initial step index from `?step` (absent / non-numeric -> undefined).
// Read once at mount by useBuilderInit to open a deep-linked or refreshed
// step. Not reactive: in-session navigation is store-driven, the URL only
// seeds the first render and mirrors thereafter.
export const useStepUrlParam = (): number | undefined => {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get('step');
  return raw !== null ? Number.parseInt(raw, 10) : undefined;
};

// Mirrors the active Flow step index into the URL (store -> URL) once
// `ready`. Uses `replace` so internal step flips don't pollute history;
// runs only after `ready` so it can't clobber the initial `?step` before
// useBuilderInit has read it.
export const useStepUrlSync = (ready: boolean) => {
  const [, setSearchParams] = useSearchParams();
  const currentMode = useBuilderStore((state) => state.currentMode);
  const currentIndex = useBuilderStore((state) => state.currentIndex);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const isStepMode =
      currentMode.mode === BuilderMode.FLOW_STEP_DETAIL ||
      currentMode.mode === BuilderMode.FLOW_STEP_TRIGGER;
    const desired = isStepMode ? String(currentIndex) : null;
    setSearchParams(
      (prev) => {
        if (prev.get('step') === desired) {
          return prev;
        }
        const next = new URLSearchParams(prev);
        if (desired === null) {
          next.delete('step');
        } else {
          next.set('step', desired);
        }
        return next;
      },
      { replace: true },
    );
  }, [currentMode.mode, currentIndex, ready, setSearchParams]);
};
