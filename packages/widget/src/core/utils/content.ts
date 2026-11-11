import { ChecklistItemType } from '@usertour/types';

// Check if a checklist item can be completed based on completion order and item status
export const canCompleteChecklistItem = (
  completionOrder: 'any' | 'ordered',
  items: ChecklistItemType[],
  currentItem: ChecklistItemType,
): boolean => {
  // If already completed, item cannot be clicked
  // if (currentItem.isCompleted) {
  //   return false;
  // }

  const currentIndex = items.findIndex((item) => item.id === currentItem.id);

  // For 'any' order, items can be completed in any order
  if (completionOrder === 'any') {
    return true;
  }

  // For 'ordered' completion, check if all previous items are completed
  if (completionOrder === 'ordered') {
    const previousItems = items.slice(0, currentIndex);
    return previousItems.every((item) => item.isCompleted);
  }

  return false;
};

export const hiddenStyle: React.CSSProperties = {
  visibility: 'hidden',
  pointerEvents: 'none',
  opacity: 0,
};

/**
 * Checks the number of uncompleted items
 * @param items - The items to check
 * @returns The number of uncompleted items
 */
export const checklistUnCompletedItemsCount = (items: ChecklistItemType[]): number => {
  return items.filter((item) => item.isVisible).filter((item) => !item.isCompleted).length;
};

/**
 * Checks the number of completed items
 * @param items - The items to check
 * @returns The number of completed items
 */
export const checklistCompletedItemsCount = (items: ChecklistItemType[]): number => {
  return items.filter((item) => item.isVisible).filter((item) => item.isCompleted).length;
};

/**
 * Checks the number of visible items
 * @param items - The items to check
 * @returns The number of visible items
 */
export const checklistVisibleItemsCount = (items: ChecklistItemType[]): number => {
  return items.filter((item) => item.isVisible).length;
};

/**
 * Checks if all items are completed
 * @param items - The items to check
 * @returns True if all items are completed, false otherwise
 */
export const checklistIsCompleted = (items: ChecklistItemType[]): boolean => {
  return items.filter((item) => item.isVisible).every((item) => item.isCompleted);
};

/**
 * Calculates the progress of a checklist
 * @param items - The items to check
 * @returns The progress of the checklist
 */
export const checklistProgress = (items: ChecklistItemType[]): number => {
  const totalVisibleItemsCount = checklistVisibleItemsCount(items);
  const unCompletedItemsCount = checklistUnCompletedItemsCount(items);
  if (totalVisibleItemsCount === 0) {
    return 0;
  }
  return Math.round(
    ((totalVisibleItemsCount - unCompletedItemsCount) / totalVisibleItemsCount) * 100,
  );
};
