import type { SessionStep, StepSettings } from '@usertour/types';
import { TourWidget } from '@/components/tour';
import type { TourStore } from '@/types/store';
import { buildTourSnapshot, createFakeTour } from '../fake/tour';
import {
  conditionalButtons,
  questionContent,
  richContent,
  richContentAttributes,
  twoChoiceQuestions,
} from '../fixtures/blocks';
import { bubbleStep, modalStep, tooltipStep } from '../fixtures/steps';
import {
  BlankPage,
  CenteredTarget,
  CornerTarget,
  FixedSidebar,
  ScrollPanelTarget,
  ShiftingTarget,
} from './hosts';
import { type CaseParams, type GalleryCase, findTarget } from './types';

const tooltipWidget =
  (setting: Partial<StepSettings>) =>
  ({ theme }: CaseParams) => {
    const { tour } = createFakeTour(
      buildTourSnapshot({
        step: tooltipStep(setting),
        theme,
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
  // The builder's default alignment: below the target, flipping/shifting to stay on screen.
  'tooltip-auto-in-corner': {
    host: CornerTarget,
    widget: tooltipWidget({ alignType: 'auto' }),
  },
  'tooltip-in-scroll-panel': {
    host: ScrollPanelTarget,
    widget: tooltipWidget({ alignType: 'fixed', side: 'right', align: 'center' }),
  },
  'tooltip-target-shifts': {
    host: ShiftingTarget,
    widget: tooltipWidget({ alignType: 'fixed', side: 'right', align: 'center' }),
  },
};

const stepWidget =
  (step: SessionStep, userAttributes?: TourStore['userAttributes']) =>
  ({ theme }: CaseParams) => {
    const { tour } = createFakeTour(buildTourSnapshot({ step, theme, userAttributes }));
    return <TourWidget tour={tour} />;
  };

/** A modal holding the question named by `?kind=` (nps, star, scale, single, multi, text, textarea). */
const questionWidget = (params: CaseParams) =>
  stepWidget(modalStep({}, questionContent(params.search.get('kind') ?? 'nps')))(params);

export const flowCases: Record<string, GalleryCase> = {
  ...tooltipCases,
  // `?position=` (e.g. centerTop, leftCenter, rightBottom) with `&ox=`/`&oy=` offsets.
  'flow-modal': {
    host: BlankPage,
    widget: (params) => {
      const position = params.search.get('position') ?? 'center';
      const positionOffsetX = Number(params.search.get('ox') ?? 0);
      const positionOffsetY = Number(params.search.get('oy') ?? 0);
      return stepWidget(modalStep({ position, positionOffsetX, positionOffsetY }))(params);
    },
  },
  'flow-bubble': { host: BlankPage, widget: stepWidget(bubbleStep()) },
  'flow-question': { host: BlankPage, widget: questionWidget },
  'flow-two-choices': { host: BlankPage, widget: stepWidget(modalStep({}, twoChoiceQuestions)) },
  'flow-conditional-buttons': {
    host: BlankPage,
    widget: stepWidget(modalStep({}, conditionalButtons)),
  },
  'flow-rich-content': {
    host: BlankPage,
    widget: stepWidget(modalStep({}, richContent), richContentAttributes),
  },
};
