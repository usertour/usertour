import { useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  defaultStep,
  duplicateStep,
  generateUniqueCopyName,
  getErrorMessage,
} from '@usertour/helpers';
import { useAddContentStepMutation } from '@usertour/hooks';
import { useToast } from '@usertour/ui';
import { type ContentVersion, type Step, StepContentType } from '@usertour/types';
import { BuilderMode, useBuilderConfig, useBuilderMethods, useBuilderStore } from '../../contexts';
import { getEmptyDataForType } from '../../utils/default-data';

// Flow-flavoured editor — analogous to useBannerEditor / etc. but
// doesn't extend useTypeEditor because Flow's "data" lives in
// currentVersion.steps (array) not currentVersion.data (blob).
//
// Owns all Flow-specific writes:
// - step-array mutators (remove / reorder) → setCurrentVersion →
//   PR ζ FSM dispatcher → addContentSteps mutation
// - currentStep / currentIndex local buffer (mounted in Zustand store
//   as private setters, only accessible via this hook)
// - createStep / createNewStep (Apollo addContentStep mutation, only
//   Flow uses these — used to be on BuilderProvider but were Flow-
//   specific from day one)
// - sub-mode navigation helpers
//
// Read-side fields (currentStep / currentIndex / isShowError) are
// store fields cross-type hooks read (use-current-theme reads
// step.themeId for theme inheritance, use-content-position reads
// step.setting.position, etc.) and app/index.tsx's URL mirror for
// ?step=N. Writers live here in this hook.

export const useFlowEditor = () => {
  // Cross-type Provider bits — focused-hook split per
  // docs/conventions/builder-context-migration.md
  const { isWebBuilder } = useBuilderConfig();
  const { fetchContentAndVersion } = useBuilderMethods();
  const currentVersion = useBuilderStore((s) => s.currentVersion);
  const setCurrentMode = useBuilderStore((s) => s.setCurrentMode);
  const isLoading = useBuilderStore((s) => s.isLoading || s.saveState.status === 'saving');

  const { toast } = useToast();
  const { invoke: addContentStep } = useAddContentStepMutation();

  // Flow store fields — direct store access. The setters are on the
  // private surface (BuilderStatePrivateSetters); they only flow out
  // through this hook, not through useBuilderContext.
  const currentStep = useBuilderStore((s) => s.currentStep);
  const currentIndex = useBuilderStore((s) => s.currentIndex);
  const isShowError = useBuilderStore((s) => s.isShowError);
  const setCurrentStep = useBuilderStore((s) => s.setCurrentStep);
  const setCurrentIndex = useBuilderStore((s) => s.setCurrentIndex);
  const setIsShowError = useBuilderStore((s) => s.setIsShowError);
  const setSelectorOutput = useBuilderStore((s) => s.setSelectorOutput);
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

  const enterStepSubMode = useCallback(
    (step: Step, index: number, mode: BuilderMode) => {
      setSelectorOutput(null);
      const cloned = JSON.parse(
        JSON.stringify({
          ...step,
          setting: { ...defaultStep.setting, ...step.setting },
        }),
      );
      setCurrentStep(cloned);
      setCurrentIndex(index);
      setCurrentMode({ mode });
    },
    [setSelectorOutput, setCurrentStep, setCurrentIndex, setCurrentMode],
  );

  const exitToFlow = useCallback(() => {
    setCurrentMode({ mode: BuilderMode.FLOW });
  }, [setCurrentMode]);

  const startCreateStep = useCallback(
    (type: string) => {
      if (!currentVersion) {
        return;
      }
      const index = currentVersion.steps?.length ?? 0;
      setCurrentStep({
        ...defaultStep,
        setting: { ...defaultStep.setting },
        type,
        name: 'Untitled',
        data: getEmptyDataForType(),
        sequence: index,
      });
      setCurrentIndex(index);
      if (isWebBuilder) {
        setCurrentMode({ mode: BuilderMode.FLOW_STEP_DETAIL });
        return;
      }
      // Chrome-extension builder routes tooltip-type steps through
      // ELEMENT_SELECTOR first to pick the target DOM element.
      const mode =
        type === StepContentType.TOOLTIP
          ? BuilderMode.ELEMENT_SELECTOR
          : BuilderMode.FLOW_STEP_DETAIL;
      setCurrentMode({ mode });
    },
    [currentVersion, isWebBuilder, setCurrentStep, setCurrentIndex, setCurrentMode],
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
