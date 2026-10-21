import { isRestrictedType } from '@usertour/helpers';
import {
  ContentActionsItemType,
  Step,
  ContentEditorButtonElement,
  ContentEditorElementType,
  ContentEditorQuestionElement,
  ContentEditorRoot,
  StepGotoDirection,
} from '@usertour/types';

/**
 * Whether a step-goto action on `fromStep` lands on `targetStep`: by cvid, or
 * by a relative direction (an embed step's previous / next) resolved
 * against the step order.
 */
const gotoReaches = (
  action: { type: string; data?: { stepCvid?: string; direction?: string } },
  steps: Step[],
  fromStep: Step,
  targetStep: Step,
): boolean => {
  if (action.type !== ContentActionsItemType.STEP_GOTO) {
    return false;
  }
  const direction = action.data?.direction;
  if (direction === StepGotoDirection.NEXT || direction === StepGotoDirection.PREVIOUS) {
    const offset = direction === StepGotoDirection.NEXT ? 1 : -1;
    return steps.indexOf(fromStep) + offset === steps.indexOf(targetStep);
  }
  return action.data?.stepCvid === targetStep.cvid;
};

export const stepIsReachable = (steps: Step[], currentStep: Step) => {
  if (steps.indexOf(currentStep) === 0) {
    return true;
  }
  let reachable = false;
  const filteredSteps = steps.filter((step) => step.id !== currentStep.id);

  for (const step of filteredSteps) {
    if (step.target?.actions) {
      for (const action of step.target.actions) {
        if (gotoReaches(action, steps, step, currentStep)) {
          reachable = true;
        }
      }
    }

    if (step.trigger) {
      for (const trigger of step.trigger) {
        if (trigger.actions) {
          for (const action of trigger.actions) {
            if (gotoReaches(action, steps, step, currentStep)) {
              reachable = true;
            }
          }
        }
      }
    }

    if (step.data) {
      const data = step.data as ContentEditorRoot[];
      for (const d of data) {
        for (const column of d.children) {
          for (const element of column.children) {
            if (
              element.element.type === ContentEditorElementType.BUTTON ||
              isRestrictedType(element.element.type)
            ) {
              const elementData = element.element as
                | ContentEditorQuestionElement
                | ContentEditorButtonElement;
              if (elementData.data.actions) {
                for (const action of elementData.data.actions) {
                  if (gotoReaches(action, steps, step, currentStep)) {
                    reachable = true;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return reachable;
};
