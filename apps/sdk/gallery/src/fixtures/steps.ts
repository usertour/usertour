import { defaultStep } from '@usertour/helpers';
import { type SessionStep, StepContentType, type StepSettings } from '@usertour/types';
import { textAndButton } from './content';

/** A step as the builder seeds it, turned into `type`, with the given setting overrides. */
const step = (type: StepContentType, setting: Partial<StepSettings>): SessionStep => ({
  ...defaultStep,
  name: `Gallery ${type}`,
  cvid: `gallery-${type}`,
  type,
  setting: { ...defaultStep.setting, ...setting },
  data: textAndButton,
});

export const tooltipStep = (setting: Partial<StepSettings>) =>
  step(StepContentType.TOOLTIP, setting);

export const modalStep = (setting: Partial<StepSettings> = {}) =>
  step(StepContentType.MODAL, setting);

export const bubbleStep = (setting: Partial<StepSettings> = {}) =>
  step(StepContentType.BUBBLE, setting);
