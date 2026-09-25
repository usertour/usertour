import { defaultStep } from '@usertour/helpers';
import {
  type ContentEditorRoot,
  type SessionStep,
  StepContentType,
  type StepSettings,
} from '@usertour/types';
import { textAndButton } from './content';

/** A step as the builder seeds it, turned into `type`, with the given setting overrides and content. */
const step = (
  type: StepContentType,
  setting: Partial<StepSettings>,
  data: ContentEditorRoot[] = textAndButton,
): SessionStep => ({
  ...defaultStep,
  name: `Gallery ${type}`,
  cvid: `gallery-${type}`,
  type,
  setting: { ...defaultStep.setting, ...setting },
  data,
});

export const tooltipStep = (setting: Partial<StepSettings>) =>
  step(StepContentType.TOOLTIP, setting);

export const modalStep = (setting: Partial<StepSettings> = {}, data?: ContentEditorRoot[]) =>
  step(StepContentType.MODAL, setting, data);

export const bubbleStep = (setting: Partial<StepSettings> = {}) =>
  step(StepContentType.BUBBLE, setting);
