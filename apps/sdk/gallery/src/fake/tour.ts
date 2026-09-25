import { WidgetZIndex } from '@usertour/constants';
import { type SessionStep, StepContentType, type ThemeTypesSetting } from '@usertour/types';
import { UsertourTheme } from '@/core/usertour-theme';
import type { UsertourTour } from '@/core/usertour-tour';
import type { TourStore } from '@/types/store';
import { ExternalStore } from '@/utils/store';
import { recordCall } from '../calls';
import { BASE_Z_INDEX, buildBaseSnapshot } from './base';

/** The slice of UsertourTour that TourWidget touches. */
type TourSurface = Pick<
  UsertourTour,
  'subscribe' | 'getSnapshot' | 'handleDismiss' | 'handleOnClick' | 'handleActions'
>;

type TourSnapshotInput = {
  step: SessionStep;
  theme: ThemeTypesSetting;
  triggerRef?: Element | null;
  currentStepIndex?: number;
  totalSteps?: number;
};

/** The store UsertourTour holds while showing `step`. */
export const buildTourSnapshot = (input: TourSnapshotInput): TourStore => {
  const { step, theme, triggerRef = null, currentStepIndex = 0, totalSteps = 1 } = input;
  const base = buildBaseSnapshot(theme, BASE_Z_INDEX + WidgetZIndex.TOUR_OFFSET);
  // getStepStyle: tooltips keep the base style, other step types re-derive it.
  const globalStyle =
    step.type === StepContentType.TOOLTIP
      ? base.globalStyle
      : UsertourTheme.convertToCssVars(theme, step.type);

  return {
    ...base,
    globalStyle,
    triggerRef,
    currentStep: step,
    progress: 0,
    currentStepIndex,
    totalSteps,
  };
};

/** A stand-in UsertourTour: real ExternalStore, handlers that only record their calls. */
export const createFakeTour = (snapshot: TourStore) => {
  const store = new ExternalStore<TourStore>(snapshot);
  const surface: TourSurface = {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    handleDismiss: async (reason) => recordCall('tour.handleDismiss', reason),
    handleOnClick: async (element, value) => recordCall('tour.handleOnClick', element, value),
    handleActions: async (actions) => recordCall('tour.handleActions', actions),
  };
  return { tour: surface as UsertourTour, store };
};
