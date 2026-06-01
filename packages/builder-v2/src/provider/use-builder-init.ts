import { defaultStep } from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';
import { useEffect, useState } from 'react';
import { BuilderMode, deriveInitialMode, useBuilderMethods, useBuilderStore } from '../contexts';

export interface BuilderInitParams {
  contentId: string;
  versionId: string;
  environmentId: string;
  projectId: string;
  initialStepIndex?: number;
}

// The whole builder load lifecycle, in one place. Replaces the v1
// `initContent(message: any)` kitchen-sink + the mount effect +
// `isInitializing` flag. Keyed on (contentId, versionId): a change
// re-hydrates (no remount-only reliance). Hydration stays controlled
// one-way (server → store draft via fetchContentAndVersion) — the draft
// model is deliberate; this hook never binds the cache.
//
// Invariants: I1 hydrate only here + on save re-baseline; I2 re-run on
// id change; I3 clearHistory only on initial load (not on save's
// fetchContentAndVersion); I4 initial mode via deriveInitialMode; I5
// initialStepIndex opens the step; I6 single `ready` gate.
export const useBuilderInit = (params: BuilderInitParams): { ready: boolean } => {
  const { contentId, versionId, environmentId, projectId, initialStepIndex } = params;
  const { fetchContentAndVersion } = useBuilderMethods();
  // Store setters are stable refs — no subscription churn.
  const setEnvironmentId = useBuilderStore((s) => s.setEnvironmentId);
  const setProjectId = useBuilderStore((s) => s.setProjectId);
  const setCurrentMode = useBuilderStore((s) => s.setCurrentMode);
  const setCurrentStep = useBuilderStore((s) => s.setCurrentStep);
  const setCurrentIndex = useBuilderStore((s) => s.setCurrentIndex);
  const clearHistory = useBuilderStore((s) => s.clearHistory);

  const [ready, setReady] = useState(false);

  // environmentId / projectId / initialStepIndex are read at hydrate time
  // but deliberately NOT in the dep array — re-hydration is keyed on the
  // (contentId, versionId) identity only, matching pre-C3 semantics.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setEnvironmentId(environmentId);
    setProjectId(projectId);

    (async () => {
      const result = await fetchContentAndVersion(contentId, versionId);
      if (cancelled) {
        return;
      }
      if (!result) {
        // Fetch failed (e.g. soft-deleted). Unblock — currentContent stays
        // undefined and Container renders nothing, same as pre-C3.
        setReady(true);
        return;
      }
      // I3: the freshly-fetched version is the undo origin.
      clearHistory();

      const { content, version } = result;
      if (
        content.type === ContentDataType.FLOW &&
        initialStepIndex !== undefined &&
        version.steps?.[initialStepIndex]
      ) {
        const step = version.steps[initialStepIndex];
        setCurrentStep(
          JSON.parse(
            JSON.stringify({ ...step, setting: { ...defaultStep.setting, ...step.setting } }),
          ),
        );
        setCurrentIndex(initialStepIndex);
        setCurrentMode({ mode: BuilderMode.FLOW_STEP_DETAIL });
      } else {
        setCurrentMode({ mode: deriveInitialMode(content.type) });
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, versionId]);

  return { ready };
};
