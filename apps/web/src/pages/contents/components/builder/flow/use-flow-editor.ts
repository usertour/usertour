import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import {
  defaultStep,
  duplicateStep,
  generateUniqueCopyName,
  getErrorMessage,
} from '@usertour/helpers';
import { useAddContentStepMutation } from '@usertour/hooks';
import { useToast } from '@usertour/ui';
import { type ContentVersion, type Step } from '@usertour/types';
import {
  useBuilderMethods,
  useBuilderStore,
  useIsBusy,
} from '@/pages/contents/components/builder/core';
import { getEmptyDataForType } from '@/pages/contents/components/builder/core/utils/default-data';

// Editor abstraction for Flow content. Parallel to useTypeEditor
// (which serves Banner / Checklist / Launcher / ResourceCenter), not a
// specialization of it.
//
// Flow doesn't fit useTypeEditor because its data shape and mutation
// pattern are structurally different:
// - Data lives in currentVersion.steps[] (a top-level sibling array),
//   not currentVersion.data (a JSON blob)
// - Mutations are list operations (add / remove / reorder, plus the
//   Apollo addContentStep mutation for individual step creation),
//   not partial-merge updates
// - Sub-mode editing needs a currentStep local buffer that's shared
//   across multiple components, so it lives in the Zustand store as
//   private setters instead of useState
//
// What both hooks share via the Provider: the save FSM (both write
// through setCurrentVersion), the undo/redo stack, the leave guard,
// the auto-save validator gate.
//
// Read-side store fields (currentStep / currentIndex / isShowError)
// stay on the public store surface because cross-type hooks read them
// — use-current-theme inherits step.themeId, use-content-position
// reads step.setting.position, app/index.tsx mirrors currentIndex
// into the ?step=N URL param. Writers stay here.

export const useFlowEditor = () => {
  // Cross-type Provider bits — focused-hook split per
  // docs/conventions/builder-context-migration.md
  const { fetchContentAndVersion } = useBuilderMethods();
  const currentVersion = useBuilderStore((s) => s.currentVersion);
  const isLoading = useIsBusy();
  const navigate = useNavigate();

  const { toast } = useToast();
  const { invoke: addContentStep } = useAddContentStepMutation();

  // Flow store fields — direct store access. The setters are on the
  // private surface (BuilderStatePrivateSetters); they only flow out
  // through this hook, not the public store surface.
  const currentStep = useBuilderStore((s) => s.currentStep);
  const currentIndex = useBuilderStore((s) => s.currentIndex);
  const isShowError = useBuilderStore((s) => s.isShowError);
  const setCurrentStep = useBuilderStore((s) => s.setCurrentStep);
  const setCurrentIndex = useBuilderStore((s) => s.setCurrentIndex);
  const setIsShowError = useBuilderStore((s) => s.setIsShowError);
  const setCurrentVersion = useBuilderStore((s) => s.setCurrentVersion);

  const steps = currentVersion?.steps ?? [];

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

  // ── Step-array mutators (write to currentVersion.steps → FSM
  //    dispatcher routes to addContentSteps mutation) ──────────

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

  // ── Apollo addContentStep mutation (Flow-only) ──────────────

  const createStep = useCallback(
    async (cv: ContentVersion, step: Step) => {
      try {
        const createdStep = await addContentStep({ ...step, versionId: cv.id });
        if (createdStep) {
          await fetchContentAndVersion(cv.contentId, cv.id);
          return createdStep as Step;
        }
        return undefined;
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
        return undefined;
      }
    },
    [addContentStep, fetchContentAndVersion, toast],
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
          cvid: undefined,
          name: generateUniqueCopyName(stepToDuplicate.name, existingStepNames),
          sequence,
        } as Step;
      } else {
        step = {
          ...defaultStep,
          type: finalStepType,
          name: 'Untitled',
          data: getEmptyDataForType(),
          sequence,
          setting: { ...defaultStep.setting },
        };
      }
      return await createStep(cv, step);
    },
    [createStep],
  );

  // ── Sub-mode navigation ─────────────────────────────────────

  // URL-driven: navigate to the sub-view route; the target route component
  // seeds its edit buffer from the route param via useSeedStepFromRoute.
  // Relative paths — enter/create are called from the index (overview) route,
  // exit from a depth-1 step/trigger route, so `..` returns to the overview.

  const enterStepSubMode = useCallback(
    (index: number, target: 'detail' | 'trigger') => {
      navigate(target === 'trigger' ? `trigger/${index}` : `step/${index}`);
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
    setCurrentIndex,
    setIsShowError,
    updateCurrentStep,
    // Step-array operations
    removeStep,
    reorderSteps,
    // Apollo step mutations
    createStep,
    createNewStep,
    // Sub-mode navigation
    enterStepSubMode,
    exitToFlow,
    startCreateStep,
    // Passthrough
    isLoading,
  };
};
