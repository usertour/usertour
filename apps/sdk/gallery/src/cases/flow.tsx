import type { StepSettings } from '@usertour/types';
import { TourWidget } from '@/components/tour';
import { buildTourSnapshot, createFakeTour } from '../fake/tour';
import { bubbleStep, modalStep, tooltipStep } from '../fixtures/steps';
import { defaultTheme } from '../fixtures/theme';
import { BlankPage, CenteredTarget, FixedSidebar, ShiftingTarget } from './hosts';
import { type GalleryCase, findTarget } from './types';

const tooltipWidget = (setting: Partial<StepSettings>) => () => {
  const { tour } = createFakeTour(
    buildTourSnapshot({
      step: tooltipStep(setting),
      theme: defaultTheme,
      triggerRef: findTarget(),
    }),
  );
  return <TourWidget tour={tour} />;
};

const tooltipCases: Record<string, GalleryCase> = {
  'tooltip-right': {
    host: CenteredTarget,
    widget: tooltipWidget({ alignType: 'fixed', side: 'right', align: 'center' }),
  },
  'tooltip-left': {
    host: CenteredTarget,
    widget: tooltipWidget({ alignType: 'fixed', side: 'left', align: 'center' }),
  },
  'tooltip-top': {
    host: CenteredTarget,
    widget: tooltipWidget({ alignType: 'fixed', side: 'top', align: 'center' }),
  },
  'tooltip-bottom': {
    host: CenteredTarget,
    widget: tooltipWidget({ alignType: 'fixed', side: 'bottom', align: 'center' }),
  },
  'tooltip-fixed-sidebar': {
    host: FixedSidebar,
    widget: tooltipWidget({ alignType: 'fixed', side: 'right', align: 'center' }),
  },
  'tooltip-target-shifts': {
    host: ShiftingTarget,
    widget: tooltipWidget({ alignType: 'fixed', side: 'right', align: 'center' }),
  },
};

const stepWidget = (step: ReturnType<typeof modalStep>) => () => {
  const { tour } = createFakeTour(buildTourSnapshot({ step, theme: defaultTheme }));
  return <TourWidget tour={tour} />;
};

export const flowCases: Record<string, GalleryCase> = {
  ...tooltipCases,
  'flow-modal': { host: BlankPage, widget: stepWidget(modalStep()) },
  'flow-bubble': { host: BlankPage, widget: stepWidget(bubbleStep()) },
};
