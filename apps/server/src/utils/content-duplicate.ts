import { cuid, isArray, regenerateConditionIds } from '@usertour/helpers';
import {
  ContentEditorElementType,
  ContentEditorQuestionElement,
  ContentEditorRoot,
  StepTrigger,
  Step,
} from '@usertour/types';
import { isQuestionElement } from './content-question';
import * as SchemaTypes from '@/common/types/schema';

/**
 * Process question elements in content editor data to replace cvid with new cuid
 * Also process actions field in all elements (button and question elements) to regenerate condition IDs
 * @param contents - The content editor root array to process
 * @returns A new array with question element cvids replaced by new cuids and actions regenerated
 */
const processQuestionElements = (
  contents: ContentEditorRoot[] | undefined,
): ContentEditorRoot[] => {
  if (!contents || !isArray(contents) || contents.length === 0) {
    return [];
  }
  return contents.map((group) => ({
    ...group,
    children: group.children.map((column) => ({
      ...column,
      children: column.children.map((item) => {
        const element = item.element;

        // Process question elements: regenerate cvid and actions
        if (isQuestionElement(element)) {
          const questionElement = element as ContentEditorQuestionElement;
          const updatedElement = {
            ...questionElement,
            data: {
              ...questionElement.data,
              cvid: cuid(),
              ...(questionElement.data?.actions && isArray(questionElement.data.actions)
                ? { actions: regenerateConditionIds(questionElement.data.actions) }
                : {}),
            },
          } as ContentEditorQuestionElement;

          return {
            ...item,
            element: updatedElement,
          };
        }

        // Process button elements: regenerate actions
        if (element.type === ContentEditorElementType.BUTTON) {
          const buttonElement = element;
          if (buttonElement.data?.actions && isArray(buttonElement.data.actions)) {
            return {
              ...item,
              element: {
                ...buttonElement,
                data: {
                  ...buttonElement.data,
                  actions: regenerateConditionIds(buttonElement.data.actions),
                },
              },
            };
          }
        }

        return item;
      }),
    })),
  }));
};

const regenerateTrigger = (trigger: StepTrigger[]): StepTrigger[] => {
  return trigger.map((t) => ({
    ...t,
    id: cuid(),
    conditions: regenerateConditionIds(t.conditions),
    actions: regenerateConditionIds(t.actions),
  }));
};

/**
 * Process target to regenerate condition IDs in actions field
 * @param target - The target object to process
 * @returns A new target object with regenerated action condition IDs, or undefined if target is undefined
 */
const regenerateTarget = (target: Step['target']): Step['target'] => {
  if (!target) {
    return undefined;
  }

  if (target?.actions && isArray(target?.actions)) {
    return {
      ...target,
      actions: regenerateConditionIds(target.actions),
    };
  }

  return target;
};

/**
 * Process an array of steps from Prisma query to duplicate them
 * Removes id, createdAt, updatedAt, versionId fields and regenerates trigger, data, target
 * @param steps - Array of steps from Prisma query (with id, createdAt, updatedAt, versionId)
 * @returns Array of processed steps ready for creation
 */
export const duplicateSteps = (
  steps: SchemaTypes.Step[],
): Omit<SchemaTypes.Step, 'id' | 'createdAt' | 'updatedAt' | 'versionId'>[] => {
  return (
    steps as Array<Step & { id: string; createdAt: Date; updatedAt: Date; versionId: string }>
  ).map(({ id, createdAt, updatedAt, versionId, ...step }) => {
    try {
      const stepWithTypes = step as Step;
      const trigger = stepWithTypes?.trigger ? regenerateTrigger(stepWithTypes.trigger) : [];
      const data = stepWithTypes?.data ? processQuestionElements(stepWithTypes.data) : [];
      const target = regenerateTarget(stepWithTypes?.target);

      return {
        ...step,
        trigger,
        data,
        target,
      } as unknown as SchemaTypes.Step;
    } catch {
      // If processing fails, return the step without id, createdAt, updatedAt, versionId
      return step as unknown as SchemaTypes.Step;
    }
  });
};
