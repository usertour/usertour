import { ContentActionsItemType, Step } from "@usertour-ui/types";
import {
  ContentEditorElementType,
  ContentEditorRoot,
} from "@usertour-ui/shared-editor";

export const stepIsReachable = (steps: Step[], currentStep: Step) => {
  if (steps.indexOf(currentStep) == 0) {
    return true;
  }
  let reachable = false;
  steps
    .filter((step, i) => step.id != currentStep.id)
    .forEach((step) => {
      if (step.target?.actions) {
        step.target?.actions.forEach((action) => {
          if (
            action.type == ContentActionsItemType.STEP_GOTO &&
            action.data.stepCvid == currentStep.cvid
          ) {
            reachable = true;
          }
        });
      }
      if (step.data) {
        const data = step.data as ContentEditorRoot[];
        data.forEach((d) => {
          d.children.forEach((column) => {
            column.children.forEach((element) => {
              if (element.element.type == ContentEditorElementType.BUTTON) {
                if (element.element.data.actions) {
                  element.element.data.actions.forEach((action) => {
                    if (
                      action.type == ContentActionsItemType.STEP_GOTO &&
                      action.data.stepCvid == currentStep.cvid
                    ) {
                      reachable = true;
                    }
                  });
                }
              }
            });
          });
        });
      }
    });

  return reachable;
};
