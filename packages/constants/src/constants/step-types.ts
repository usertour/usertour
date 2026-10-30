import { ContentDataType, StepContentType } from '@usertour/types';

/**
 * Which step kinds each step-bodied content type accepts. A flow's steps are
 * popups anchored to the page; an embed's steps are inline panels inside its
 * shell, plus hidden steps that only wait for a trigger (ADR 0022). The
 * builder's step picker, the validators and the public API all read this.
 */
export const STEP_TYPES_BY_CONTENT_TYPE: Partial<
  Record<ContentDataType, readonly StepContentType[]>
> = {
  [ContentDataType.FLOW]: [
    StepContentType.TOOLTIP,
    StepContentType.MODAL,
    StepContentType.BUBBLE,
    StepContentType.HIDDEN,
  ],
  [ContentDataType.EMBED]: [StepContentType.INLINE, StepContentType.HIDDEN],
};

export const getStepTypesForContentType = (
  contentType: ContentDataType | string | undefined,
): readonly StepContentType[] =>
  (contentType && STEP_TYPES_BY_CONTENT_TYPE[contentType as ContentDataType]) || [];
