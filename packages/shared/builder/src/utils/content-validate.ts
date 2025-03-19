import {
  ContentEditorButtonElement,
  ContentEditorElementType,
  ContentEditorQuestionElement,
  ContentEditorRoot,
  isRestrictedType,
} from '@usertour-ui/shared-editor';
import { ContentActionsItemType, Step } from '@usertour-ui/types';

export const stepIsReachable = (steps: Step[], currentStep: Step) => {
  if (steps.indexOf(currentStep) === 0) {
    return true;
  }
  let reachable = false;
  const filteredSteps = steps.filter((step) => step.id !== currentStep.id);

  for (const step of filteredSteps) {
    if (step.target?.actions) {
      for (const action of step.target.actions) {
        if (
          action.type === ContentActionsItemType.STEP_GOTO &&
          action.data.stepCvid === currentStep.cvid
        ) {
          reachable = true;
        }
      }
    }

    if (step.trigger) {
      for (const trigger of step.trigger) {
        if (trigger.actions) {
          for (const action of trigger.actions) {
            if (
              action.type === ContentActionsItemType.STEP_GOTO &&
              action.data.stepCvid === currentStep.cvid
            ) {
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
                  if (
                    action.type === ContentActionsItemType.STEP_GOTO &&
                    action.data.stepCvid === currentStep.cvid
                  ) {
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
