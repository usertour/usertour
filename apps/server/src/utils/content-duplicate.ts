import { isArray, isObject, regenerateConditionIds, uuidV4 } from '@usertour/helpers';
import { ChecklistData } from '@usertour/types';

/**
 * Process ChecklistData to regenerate condition IDs in RulesCondition[] fields
 * Handles clickedActions, completeConditions, and onlyShowTaskConditions for each item
 * @param data - The checklist data to process (can be any type, will only process if it's ChecklistData)
 * @returns Processed checklist data with regenerated condition IDs, or original data if not ChecklistData
 */
export const duplicateChecklistData = (data: any): any => {
  if (!data || !isObject(data) || !isArray(data.items)) {
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
