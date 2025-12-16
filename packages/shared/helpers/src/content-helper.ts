import type {
  ChecklistData,
  ContentConfigObject,
  ContentEditorClickableElement,
  ContentEditorElement,
  ContentEditorQuestionElement,
  ContentEditorRoot,
  ContentEditorRootColumn,
  ContentEditorRootElement,
  Step,
  StepTrigger,
} from '@usertour/types';
import { ContentDataType, ContentEditorElementType } from '@usertour/types';

import { cuid, uuidV4 } from './helper';
import { regenerateConditionIds } from './conditions';
import { isArray, isEmptyString, isObject } from './type-utils';

// Helper function to check if type is restricted
export const isRestrictedType = (type: ContentEditorElementType): boolean => {
  const restrictedTypes = [
    ContentEditorElementType.NPS,
    ContentEditorElementType.STAR_RATING,
    ContentEditorElementType.SCALE,
    ContentEditorElementType.SINGLE_LINE_TEXT,
    ContentEditorElementType.MULTI_LINE_TEXT,
    ContentEditorElementType.MULTIPLE_CHOICE,
  ];
  return restrictedTypes.includes(type);
};

export const isMissingRequiredData = (element: ContentEditorElement) => {
  if (isRestrictedType(element.type)) {
    return isEmptyString((element as ContentEditorQuestionElement).data?.name);
  }
  if (element.type === ContentEditorElementType.BUTTON) {
    if (isEmptyString((element as any).data?.text)) {
      return true;
    }
    if (!element?.data?.actions || element?.data?.actions.length === 0) {
      return true;
    }
  }
  return false;
};

export const hasMissingRequiredData = (contents: ContentEditorRoot[]) => {
  // If the new element is a restricted type, check if any restricted type already exists
  return contents.some((group) =>
    group.children.some((column) =>
      column.children.some((item) => isMissingRequiredData(item.element)),
    ),
  );
};

export const isQuestionElement = (element: ContentEditorElement) => {
  return (
    element.type === ContentEditorElementType.SINGLE_LINE_TEXT ||
    element.type === ContentEditorElementType.MULTI_LINE_TEXT ||
    element.type === ContentEditorElementType.NPS ||
    element.type === ContentEditorElementType.STAR_RATING ||
    element.type === ContentEditorElementType.SCALE ||
    element.type === ContentEditorElementType.MULTIPLE_CHOICE
  );
};

export const isClickableElement = (element: ContentEditorClickableElement) => {
  return element.type === ContentEditorElementType.BUTTON || isQuestionElement(element);
};

export const extractQuestionData = (data: ContentEditorRoot[]): ContentEditorQuestionElement[] => {
  const result: ContentEditorQuestionElement[] = [];

  function isQuestionRootElement(item: any): item is { element: ContentEditorQuestionElement } {
    return 'element' in item && isQuestionElement(item.element);
  }

  function traverse(item: ContentEditorRoot | ContentEditorRootColumn | ContentEditorRootElement) {
    if (isQuestionRootElement(item)) {
      result.push(item.element);
    }

    if ('children' in item && item.children) {
      for (const child of item.children) {
        traverse(child);
      }
    }
  }

  for (const item of data) {
    traverse(item);
  }

  return result;
};

/**
 * Process question elements in content editor data to replace cvid with new cuid
 * Also process actions field in all elements (button and question elements) to regenerate condition IDs
 * @param contents - The content editor root array to process
 * @returns A new array with question element cvids replaced by new cuids and actions regenerated
 */
export const processQuestionElements = (
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

/**
 * Generate a unique copy name based on the original name and existing names
 * @param originalName - The original name to base the copy name on
 * @param existingNames - Optional array of existing names to check against
 * @returns A unique name in the format "Name (copy)", "Name (copy 2)", etc.
 */
export const generateUniqueCopyName = (originalName: string, existingNames?: string[]): string => {
  let name = `${originalName} (copy)`;
  if (existingNames?.includes(name)) {
    let number = 2;
    while (existingNames.includes(`${originalName} (copy ${number})`)) {
      number++;
    }
    name = `${originalName} (copy ${number})`;
  }
  return name;
};

/**
 * Regenerate IDs for step triggers and their nested actions/conditions
 * @param triggers - Array of step triggers to process
 * @returns New array with regenerated IDs for triggers, actions, and conditions
 */
export const duplicateTriggers = (triggers: StepTrigger[]): StepTrigger[] => {
  if (!isArray(triggers)) {
    return triggers;
  }

  return triggers.map((trigger) => ({
    ...trigger,
    id: cuid(),
    actions: isArray(trigger.actions) ? regenerateConditionIds(trigger.actions) : trigger.actions,
    conditions: isArray(trigger.conditions)
      ? regenerateConditionIds(trigger.conditions)
      : trigger.conditions,
  }));
};

/**
 * Process target to regenerate condition IDs in actions field
 * @param target - The target object to process
 * @returns A new target object with regenerated action condition IDs, or undefined if target is undefined
 */
export const duplicateTarget = (target: Step['target']): Step['target'] => {
  if (!target) {
    return undefined;
  }

  if (target.actions && isArray(target.actions)) {
    return {
      ...target,
      actions: regenerateConditionIds(target.actions),
    };
  }

  return target;
};

/**
 * Process ChecklistData to regenerate condition IDs in RulesCondition[] fields
 * Handles clickedActions, completeConditions, and onlyShowTaskConditions for each item
 * @param data - The checklist data to process
 * @returns Processed checklist data with regenerated condition IDs
 */
export const duplicateChecklistData = (data: unknown): unknown => {
  if (!data || !isObject(data) || !isArray((data as ChecklistData).items)) {
    return data;
  }

  const checklistData = data as ChecklistData;

  return {
    ...checklistData,
    items: checklistData.items.map((item) => ({
      ...item,
      id: uuidV4(),
      clickedActions: isArray(item.clickedActions)
        ? regenerateConditionIds(item.clickedActions)
        : item.clickedActions,
      completeConditions: isArray(item.completeConditions)
        ? regenerateConditionIds(item.completeConditions)
        : item.completeConditions,
      onlyShowTaskConditions: isArray(item.onlyShowTaskConditions)
        ? regenerateConditionIds(item.onlyShowTaskConditions)
        : item.onlyShowTaskConditions,
    })),
  };
};

/**
 * Process version config to regenerate condition IDs in autoStartRules and hideRules
 * @param config - The content config object to process
 * @returns New config object with regenerated condition IDs
 */
export const duplicateConfig = (config: ContentConfigObject): ContentConfigObject => {
  if (!config) {
    return config;
  }

  return {
    ...config,
    autoStartRules: config.autoStartRules
      ? regenerateConditionIds(config.autoStartRules)
      : config.autoStartRules,
    hideRules: config.hideRules ? regenerateConditionIds(config.hideRules) : config.hideRules,
  };
};

/**
 * Process version data based on content type to regenerate condition IDs
 * @param data - The version data to process
 * @param contentType - The type of content (checklist, flow, etc.)
 * @returns Processed data with regenerated condition IDs
 */
export const duplicateData = (data: unknown, contentType: string): unknown => {
  if (contentType === ContentDataType.CHECKLIST) {
    return duplicateChecklistData(data) as unknown;
  }

  return data;
};

// Helper function to create a copy of a step
export const createStepCopy = (
  originalStep: Step,
  sequence: number,
  existingStepNames?: string[],
): Step => {
  const { id, cvid, updatedAt, createdAt, ...rest } = originalStep;

  const name = generateUniqueCopyName(originalStep?.name, existingStepNames);
  const trigger = originalStep?.trigger ? duplicateTriggers(originalStep?.trigger) : [];
  const data = originalStep?.data ? processQuestionElements(originalStep?.data) : [];
  const target = duplicateTarget(originalStep?.target);

  return {
    ...rest,
    data,
    trigger,
    target,
    name,
    sequence,
  };
};
