import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import {
  cuid,
  defaultStep,
  duplicateStep,
  generateDefaultStepName,
  generateUniqueCopyName,
} from '@usertour/helpers';
import { type ContentVersion, type Step } from '@usertour/types';
import { useBuilderStore, useIsBusy } from '@/pages/contents/components/builder/core';
import { getStepId } from '@/utils/content';
import { getEmptyDataForType } from '@/pages/contents/components/builder/utils/default-data';

// Editor abstraction for Flow content. Parallel to useTypeEditor
// (which serves Banner / Checklist / Launcher / ResourceCenter), not a
// specialization of it.
//
// Flow doesn't fit useTypeEditor because its data shape and mutation
// pattern are structurally different:
// - Data lives in currentVersion.steps[] (a top-level sibling array),
//   not currentVersion.data (a JSON blob)
// - Mutations are list operations (add / remove / reorder) on the draft,
//   persisted by auto-save — not partial-merge updates
// - Sub-mode editing needs a currentStep local buffer that's shared
//   across multiple components, so it lives in the Zustand store as
//   private setters instead of useState
//
// What both hooks share via the Provider: the save FSM (both write
// through setCurrentVersion), the undo/redo stack, the leave guard,
// the auto-save validator gate.
//
// Read-side store fields (currentStep / isShowError) stay on the public
// store surface because cross-type hooks read them — use-current-theme
// inherits step.themeId, use-content-position reads step.setting.position,
// and use-seed-step-from-route seeds currentStep from the `step/:stepId`
// route param. currentIndex is NOT a store field: it's derived from the
// route param below (the store field was a redundant mirror of the URL).
// Writers stay here.

export const useFlowEditor = () => {
  const currentVersion = useBuilderStore((s) => s.currentVersion);
  const isLoading = useIsBusy();
  const navigate = useNavigate();

  // Flow store fields — direct store access. The setters are on the
  // private surface (BuilderStatePrivateSetters); they only flow out
  // through this hook, not the public store surface.
  const currentStep = useBuilderStore((s) => s.currentStep);
  const isShowError = useBuilderStore((s) => s.isShowError);
  const setCurrentStep = useBuilderStore((s) => s.setCurrentStep);
  const setIsShowError = useBuilderStore((s) => s.setIsShowError);
  const setCurrentVersion = useBuilderStore((s) => s.setCurrentVersion);

  const steps = currentVersion?.steps ?? [];

  // currentIndex follows the URL, not the store: the step/trigger routes
  // carry the step's stable id as `:stepId`, resolved to a position here; the
  // new-step route (`step/new/:type`) implies steps.length. Deriving it removes
  // the seed-write / read-back round trip the old store field needed.
  const { stepId: routeStepId, type } = useParams();
  const currentIndex = type
    ? steps.length
    : steps.findIndex((step, i) => getStepId(step, i) === routeStepId);

  // ── Local-buffer mutators (currentStep) ─────────────────────

  const updateCurrentStep = useCallback(
    (fn: Step | ((pre: Step) => Step)) => {
      setCurrentStep((pre) => {
        if (typeof fn === 'function') {
          return pre ? fn(pre) : pre;
        }
        return fn;
      });
    },
    [setCurrentStep],
  );

  // ── Step-array mutators (write to currentVersion.steps; auto-save
  //    persists the whole version via updateContentVersion) ──────────

  const removeStep = useCallback(
    (index: number) => {
      setCurrentVersion((prev) => {
        if (!prev?.steps) {
          return prev;
        }
        const next = [...prev.steps];
        next.splice(index, 1);
        return { ...prev, steps: next };
      });
    },
    [setCurrentVersion],
  );

  const reorderSteps = useCallback(
    (fromIndex: number, toIndex: number) => {
      setCurrentVersion((prev) => {
        if (!prev?.steps) {
          return prev;
        }
        return { ...prev, steps: arrayMove(prev.steps as Step[], fromIndex, toIndex) };
      });
    },
    [setCurrentVersion],
  );

  // ── New-step creation: insert into the draft; auto-save persists it ──
  // No server round-trip — the step carries a front-end cvid (the server's
  // upsert key), so a "go to new step" action can reference it immediately;
  // the server assigns the primary id on the next save.

  const createStep = useCallback(
    // Async to keep the createStep prop contract down the editor tree, though
    // it no longer awaits the server.
    async (step: Step): Promise<Step> => {
      setCurrentVersion((prev) => {
        if (!prev) {
          return prev;
        }
        const next = [...(prev.steps ?? [])];
        const at = step.sequence ?? next.length;
        next.splice(at, 0, step);
        return { ...prev, steps: next.map((existing, i) => ({ ...existing, sequence: i })) };
      });
      return step;
    },
    [setCurrentVersion],
  );

  const createNewStep = useCallback(
    async (cv: ContentVersion, sequence: number, stepType?: string, stepToDuplicate?: Step) => {
      const finalStepType = stepType || stepToDuplicate?.type || 'tooltip';
      const existingStepNames = cv?.steps?.map((s) => s.name) ?? [];
      let step: Step;
      if (stepToDuplicate) {
        const duplicated = duplicateStep(stepToDuplicate);
        step = {
          ...duplicated,
          cvid: cuid(),
          name: generateUniqueCopyName(stepToDuplicate.name, existingStepNames),
          sequence,
        } as Step;
      } else {
        step = {
          ...defaultStep,
          cvid: cuid(),
          type: finalStepType,
          name: generateDefaultStepName(finalStepType, existingStepNames),
          data: getEmptyDataForType(),
          sequence,
          setting: { ...defaultStep.setting },
        } as Step;
      }
      return createStep(step);
    },
    [createStep],
  );

  // ── Sub-mode navigation ─────────────────────────────────────

  // URL-driven: navigate to the sub-view route; the target route component
  // seeds its edit buffer from the route param via useSeedStepFromRoute.
  // Keyed by the step's stable id (not its list position), so reorder/delete
  // can't make a URL point at the wrong step. Relative paths — enter/create are
  // called from the index (overview) route, exit from a depth-1 step/trigger
  // route, so `..` returns to the overview.

  const enterStepSubMode = useCallback(
    (stepId: string, target: 'detail' | 'trigger') => {
      navigate(target === 'trigger' ? `trigger/${stepId}` : `step/${stepId}`);
    },
    [navigate],
  );

  const exitToFlow = useCallback(() => {
    navigate('..');
  }, [navigate]);

  const startCreateStep = useCallback(
    (type: string) => {
      navigate(`step/new/${type}`);
    },
    [navigate],
  );

  return {
    // Read state
    steps,
    currentStep,
    currentIndex,
    isShowError,
    // Direct setters (Flow-only writes)
    setCurrentStep,
    setIsShowError,
    updateCurrentStep,
    // Step-array operations
    removeStep,
    reorderSteps,
    // New-step creation (inserts into the draft; persisted by auto-save)
    createNewStep,
    // Sub-mode navigation
    enterStepSubMode,
    exitToFlow,
    startCreateStep,
    // Passthrough
    isLoading,
  };
};
