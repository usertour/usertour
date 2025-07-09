import {
  BizEvent,
  BizEvents,
  BizSession,
  ChecklistData,
  ChecklistInitialDisplay,
  ChecklistItemType,
  ContentDataType,
  contentEndReason,
  SDKContent,
  Step,
} from '@usertour-ui/types';
import { Checklist } from '../core/checklist';
import { Launcher } from '../core/launcher';
import { Tour } from '../core/tour';
import {
  activedRulesConditions,
  checklistIsDimissed,
  flowIsDismissed,
  isActive,
  parseUrlParams,
} from './conditions';
import { window } from './globals';
import { RulesType } from '@usertour-ui/constants';
import {
  canCompleteChecklistItem,
  checklistCompletedItemsCount,
  checklistVisibleItemsCount,
} from '@usertour-ui/sdk';
import { BaseStore } from '../types/store';
import isEqual from 'fast-deep-equal';

/**
 * Initialize or update content items based on the provided contents
 * @param contents All available contents
 * @param currentItems Current existing items
 * @param contentType Type of content to filter
 * @param createItem Factory function to create new items
 * @returns Updated array of items
 */
export function initializeContentItems<T extends Tour | Launcher | Checklist>(
  contents: SDKContent[],
  currentItems: T[],
  contentType: ContentDataType,
  createItem: (content: SDKContent) => T,
): T[] {
  // Filter relevant contents
  const filteredContents = contents.filter((content) => content.type === contentType);

  // Create contentId map for quick lookup
  const contentIdMap = new Set(filteredContents.map((content) => content.contentId));

  // Remove items that no longer exist
  const validItems = currentItems.filter((item) => {
    const contentId = item.getContent().contentId;
    if (!contentIdMap.has(contentId)) {
      if (contentType === ContentDataType.LAUNCHER) {
        item.close();
      } else {
        item.close(contentEndReason.CONTENT_NOT_FOUND);
      }
      return false;
    }
    return true;
  });

  // Create map of existing items
  const existingItemsMap = new Map(validItems.map((item) => [item.getContent().contentId, item]));

  // Update or create items
  return filteredContents.map((content) => {
    const existingItem = existingItemsMap.get(content.contentId);
    if (existingItem) {
      if (existingItem.isEqual(content)) {
        return existingItem;
      }
      existingItem.setContent(content);
      existingItem.refresh();
      return existingItem;
    }
    return createItem(content);
  });
}

/**
 * Finds the usertour ID from the URL
 * @returns The usertour ID or null if no URL is available
 */
const findUsertourIdFromUrl = (): string | null => {
  if (!window) {
    return null;
  }
  return parseUrlParams(window.location.href, 'usertour');
};

/**
 * Finds the most recently activated tour based on latestSession.createdAt
 * @param tours Array of tours to search through
 * @returns The most recently activated tour or undefined if no tours exist
 */
export const findLatestActivatedTour = (tours: Tour[]): Tour | undefined => {
  const toursWithValidSession = tours.filter((tour) => tour.getContent().latestSession?.createdAt);

  if (!toursWithValidSession.length) {
    return undefined;
  }

  return toursWithValidSession.sort(
    (a, b) =>
      new Date(b.getContent().latestSession!.createdAt).getTime() -
      new Date(a.getContent().latestSession!.createdAt).getTime(),
  )[0];
};

/**
 * Finds the latest activated tour and cvid from the session
 * @param tours Array of tours to search through
 * @returns The latest activated tour and cvid if the tour is not dismissed, undefined otherwise
 */
export const findLatestActivatedTourAndCvid = (
  tours: Tour[],
  contentId?: string,
): { latestActivatedTour: Tour; cvid: string } | undefined => {
  const activeTours = tours.filter((tour) => !flowIsDismissed(tour.getContent()));
  const latestActivatedTour = contentId
    ? activeTours.find((tour) => tour.getContent().contentId === contentId)
    : findLatestActivatedTour(activeTours);
  // if the tour is dismissed, return null
  if (!latestActivatedTour) {
    return undefined;
  }
  // if the tour is not dismissed, return the latest step cvid
  const content = latestActivatedTour.getContent();
  const latestStepNumber = findLatestStepNumber(content.latestSession?.bizEvent);

  // Find the next step after the latest seen step
  const steps = content.steps || [];
  const cvid = steps[latestStepNumber >= 0 ? latestStepNumber : 0]?.cvid;
  if (cvid) {
    return {
      latestActivatedTour,
      cvid,
    };
  }
  return undefined;
};

/**
 * Finds the latest step number from step seen events
 * @param bizEvents Array of business events to search through
 * @returns The latest step number or -1 if no steps were seen
 */
export const findLatestStepNumber = (bizEvents: any[] | undefined): number => {
  if (!bizEvents?.length) {
    return -1;
  }

  const stepSeenEvents = bizEvents
    .filter((event) => event?.event?.codeName === BizEvents.FLOW_STEP_SEEN)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!stepSeenEvents.length) {
    return -1;
  }

  return stepSeenEvents[0].data.flow_step_number;
};

/**
 * Finds a tour from the URL
 * @param tours Array of tours to search through
 * @returns The tour from the URL or undefined if no tour exists
 */
export const findTourFromUrl = (tours: Tour[]): Tour | undefined => {
  const contentId = findUsertourIdFromUrl();
  if (!contentId) {
    return undefined;
  }
  return tours.find((tour) => tour.getContent().contentId === contentId);
};

/**
 * Finds the most recently activated checklist based on latestSession.createdAt
 * @param checklists Array of checklists to search through
 * @returns The most recently activated checklist or undefined if no checklists exist
 */
export const findLatestActivatedChecklist = (checklists: Checklist[]): Checklist | undefined => {
  const activeChecklists = checklists.filter(
    (checklist) => !checklistIsDimissed(checklist.getContent()),
  );

  const checklistsWithValidSession = activeChecklists.filter(
    (checklist) => checklist.getContent().latestSession?.createdAt,
  );

  if (!checklistsWithValidSession.length) {
    return undefined;
  }

  return checklistsWithValidSession.sort(
    (a, b) =>
      new Date(b.getContent().latestSession!.createdAt).getTime() -
      new Date(a.getContent().latestSession!.createdAt).getTime(),
  )[0];
};

/**
 * Finds a checklist from the URL
 * @param checklists Array of checklists to search through
 * @returns The checklist from the URL or undefined if no checklist exists
 */
export const findChecklistFromUrl = (checklists: Checklist[]): Checklist | undefined => {
  const contentId = findUsertourIdFromUrl();
  if (!contentId) {
    return undefined;
  }
  return checklists.find((checklist) => checklist.getContent().contentId === contentId);
};

/**
 * Finds the latest valid checklist from the session
 * @param checklists Array of checklists to search through
 * @returns The latest valid checklist or undefined if no checklists exist
 */
export const findLatestValidActivatedChecklist = (
  checklists: Checklist[],
): Checklist | undefined => {
  return findLatestActivatedChecklist(checklists);
};

/**
 * Gets the initial display of a checklist
 * @param checklist - The checklist to get the initial display of
 * @returns The initial display of the checklist
 */
export const getChecklistInitialDisplay = (content: SDKContent): ChecklistInitialDisplay => {
  const latestSession = content.latestSession;
  if (!latestSession || checklistIsDimissed(content)) {
    return content?.data?.initialDisplay;
  }
  // Find the latest CHECKLIST_HIDDEN or CHECKLIST_SEEN event
  const hiddenOrSeenEvents = latestSession.bizEvent?.filter(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_HIDDEN ||
      event.event?.codeName === BizEvents.CHECKLIST_SEEN,
  );

  if (!hiddenOrSeenEvents || hiddenOrSeenEvents.length === 0) {
    return content?.data?.initialDisplay;
  }

  // Get the latest hidden or seen event
  const latestHiddenOrSeenEvent = hiddenOrSeenEvents.reduce((latest, current) => {
    return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
  });
  if (latestHiddenOrSeenEvent.event?.codeName === BizEvents.CHECKLIST_SEEN) {
    return ChecklistInitialDisplay.EXPANDED;
  }

  return ChecklistInitialDisplay.BUTTON;
};

/**
 * Checks if a checklist is completed
 * @param content - The content to check
 * @returns True if the checklist is completed, false otherwise
 */
export const checklistIsCompleted = (content: SDKContent) => {
  const latestSession = content.latestSession;
  return !!latestSession?.bizEvent?.find(
    (event) => event.event?.codeName === BizEvents.CHECKLIST_COMPLETED,
  );
};

export const isValidChecklistCompletedEvent = (bizEvents: BizEvent[] | undefined) => {
  // Find the latest CHECKLIST_TASK_COMPLETED event
  const taskCompletedEvents =
    bizEvents?.filter((event) => event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED) ||
    [];

  if (taskCompletedEvents.length === 0) {
    return false;
  }

  const latestTaskCompletedEvent = taskCompletedEvents.reduce((latest, current) => {
    return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
  });

  // Find all events that occurred after the latest CHECKLIST_TASK_COMPLETED
  const eventsAfterTaskCompleted =
    bizEvents?.filter(
      (event) => new Date(event.createdAt) > new Date(latestTaskCompletedEvent.createdAt),
    ) || [];

  // Check if there's no CHECKLIST_COMPLETED event after the latest CHECKLIST_TASK_COMPLETED
  const hasChecklistCompletedAfter = eventsAfterTaskCompleted.some(
    (event) => event.event?.codeName === BizEvents.CHECKLIST_COMPLETED,
  );

  return !hasChecklistCompletedAfter;
};

/**
 * Checks if a checklist is all completed
 * @param content - The content to check
 * @returns True if the checklist is all completed, false otherwise
 */
export const isSendChecklistCompletedEvent = (
  items: ChecklistItemType[] = [],
  latestSession?: BizSession | undefined,
) => {
  const visibleItemsCount = checklistVisibleItemsCount(items);
  const completedItemsCount = checklistCompletedItemsCount(items);

  if (completedItemsCount === 0) {
    return false;
  }

  if (!isValidChecklistCompletedEvent(latestSession?.bizEvent)) {
    return false;
  }

  if (visibleItemsCount === completedItemsCount) {
    return true;
  }

  return false;
};

/**
 * Checks if a checklist item is completed
 * @param content - The content to check
 * @param checklistItem - The checklist item to check
 * @returns True if the checklist item is completed, false otherwise
 */
export const checklistItemIsCompleted = (
  bizEvents: BizEvent[] | undefined,
  checklistItem: ChecklistItemType,
) => {
  return !!bizEvents?.find(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED &&
      event.data.checklist_task_id === checklistItem.id,
  );
};

/**
 * Checks if a checklist item is clicked
 * @param content - The content to check
 * @param checklistItem - The checklist item to check
 * @returns True if the checklist item is clicked, false otherwise
 */
export const checklistItemIsClicked = (content: SDKContent, checklistItem: ChecklistItemType) => {
  const latestSession = content.latestSession;
  if (!latestSession) {
    return false;
  }
  const bizEvents = latestSession.bizEvent || [];
  return !!bizEvents.find(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_TASK_CLICKED &&
      event.data.checklist_task_id === checklistItem.id,
  );
};
/**
 * Checks if a checklist item should show animation
 * @param checklist - The checklist to check
 * @param checklistItem - The checklist item to check
 * @returns True if the checklist item should show animation, false otherwise
 */
export const checklistIsShowAnimation = (content: SDKContent, checklistItem: ChecklistItemType) => {
  const latestSession = content.latestSession;
  // If there is no latest session or the checklist is dismissed, don't show animation
  if (!latestSession || checklistIsDimissed(content)) {
    return false;
  }

  const bizEvents = latestSession.bizEvent || [];

  const taskCompletedEvents = bizEvents.filter(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED &&
      event.data.checklist_task_id === checklistItem.id,
  );

  // If there are no task completed events, don't show animation
  if (taskCompletedEvents.length === 0) {
    return false;
  }

  // Find the latest CHECKLIST_HIDDEN or CHECKLIST_SEEN event
  const hiddenOrSeenEvents = bizEvents.filter(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_HIDDEN ||
      event.event?.codeName === BizEvents.CHECKLIST_SEEN,
  );

  // If there are no hidden or seen events, show animation, because the checklist item is completed
  if (!hiddenOrSeenEvents || hiddenOrSeenEvents.length === 0) {
    return true;
  }

  // Get the latest hidden or seen event
  const latestHiddenOrSeenEvent = hiddenOrSeenEvents.reduce((latest, current) => {
    return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
  });

  // If the latest event is CHECKLIST_SEEN, don't show animation
  if (latestHiddenOrSeenEvent.event?.codeName === BizEvents.CHECKLIST_SEEN) {
    return false;
  }

  // If the latest event is CHECKLIST_HIDDEN, check if there's a CHECKLIST_TASK_COMPLETED
  // event for this specific item that occurred after the last SEEN event
  if (latestHiddenOrSeenEvent.event?.codeName === BizEvents.CHECKLIST_HIDDEN) {
    // Get the last SEEN event
    const lastCompletedEvent = taskCompletedEvents.reduce((latest, current) => {
      return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
    });

    // Check if the task was completed after the last SEEN event
    const lastCompletedTime = new Date(lastCompletedEvent.createdAt);
    const lastHiddenTime = new Date(latestHiddenOrSeenEvent.createdAt);

    return lastCompletedTime >= lastHiddenTime;
  }

  return false;
};

/**
 * Processes checklist items
 * @param content - The content to process
 * @returns The processed items and if any changes occurred
 */
export const processChecklistItems = async (content: SDKContent) => {
  const checklistData = content.data as ChecklistData;
  const items = checklistData.items;

  // Process items sequentially to handle ordered completion dependency
  const updatedItems: ChecklistItemType[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isClicked = checklistItemIsClicked(content, item) || item.isClicked || false;

    // Check completion conditions using item's isClicked state
    const activeConditions = await activedRulesConditions(item.completeConditions, {
      [RulesType.TASK_IS_CLICKED]: isClicked,
    });

    const isShowAnimation = checklistIsShowAnimation(content, item);

    // For ordered completion, we need to check against the current state of items
    // Use the updated items processed so far plus the original remaining items
    const currentItemsState: ChecklistItemType[] = [...updatedItems, ...items.slice(i)];

    const isCompleted: boolean =
      item.isCompleted || checklistItemIsCompleted(content.latestSession?.bizEvent, item)
        ? true
        : canCompleteChecklistItem(checklistData.completionOrder, currentItemsState, item) &&
          isActive(activeConditions);

    // Check visibility conditions
    let isVisible = true;
    if (item.onlyShowTask) {
      const visibleConditions = await activedRulesConditions(item.onlyShowTaskConditions);
      isVisible = isActive(visibleConditions);
    }

    // Add updated item to the array
    updatedItems.push({
      ...item,
      isShowAnimation,
      isCompleted,
      isVisible,
    });
  }

  // Check if any changes occurred
  const hasChanges = items.some((item) => {
    const updatedItem = updatedItems.find((updated) => updated.id === item.id);
    return (
      updatedItem &&
      (item.isCompleted !== updatedItem.isCompleted ||
        item.isVisible !== updatedItem.isVisible ||
        item.isShowAnimation !== updatedItem.isShowAnimation)
    );
  });

  return { items: updatedItems, hasChanges };
};

/**
 * Checks if a checklist has show animation items
 * @param items - The items to check
 * @returns True if the checklist has show animation items, false otherwise
 */
export const checklistHasShowAnimationItems = (items: ChecklistItemType[]) => {
  return items.some((item) => item.isCompleted && item.isVisible && item.isShowAnimation);
};

/**
 * Checks if a checklist has new completed items
 * @param currentItems - The current items
 * @param previousItems - The previous items
 * @returns True if the checklist has new completed items, false otherwise
 */
export const checklistHasNewCompletedItems = (
  currentItems: ChecklistItemType[],
  previousItems: ChecklistItemType[],
): boolean => {
  // Get visible completed item IDs from previous collapsed state
  const previousCompletedIds = new Set(
    previousItems.filter((item) => item.isCompleted && item.isVisible).map((item) => item.id),
  );

  // Get visible completed item IDs from current state
  const currentCompletedIds = new Set(
    currentItems.filter((item) => item.isCompleted && item.isVisible).map((item) => item.id),
  );

  // Check if there are any new completed items (items that are completed now but weren't before)
  for (const itemId of currentCompletedIds) {
    if (!previousCompletedIds.has(itemId)) {
      return true;
    }
  }

  return false;
};

/**
 * Checks if two tours are the same
 * @param tour1 - The first tour
 * @param tour2 - The second tour
 * @returns True if the tours are the same, false otherwise
 */
export const isSameTour = (tour1: Tour | undefined, tour2: Tour | undefined): boolean => {
  if (!tour1 || !tour2) {
    return false;
  }
  return tour1.getContent().contentId === tour2.getContent().contentId;
};

/**
 * Checks if two checklists are the same
 * @param checklist1 - The first checklist
 * @param checklist2 - The second checklist
 * @returns True if the checklists are the same, false otherwise
 */
export const isSameChecklist = (
  checklist1: Checklist | undefined,
  checklist2: Checklist | undefined,
): boolean => {
  if (!checklist1 || !checklist2) {
    return false;
  }
  return checklist1.getContent().contentId === checklist2.getContent().contentId;
};

/**
 * Checks if the base information has changed
 * @param currentStore - The current store
 * @param previousStore - The previous store
 * @returns True if the base information has changed, false otherwise
 */
export const baseStoreInfoIsChanged = (currentStore: BaseStore, previousStore: BaseStore) => {
  // Early return if stores are the same reference
  if (currentStore === previousStore) {
    return false;
  }

  // Direct property comparison for better performance
  return (
    !isEqual(currentStore.userInfo, previousStore.userInfo) ||
    !isEqual(currentStore.assets, previousStore.assets) ||
    !isEqual(currentStore.globalStyle, previousStore.globalStyle) ||
    !isEqual(currentStore.theme, previousStore.theme) ||
    currentStore.zIndex !== previousStore.zIndex
  );
};

/**
 * Finds a step by cvid
 * @param steps - The steps to search through
 * @param cvid - The cvid to search for
 * @returns The step with the given cvid or undefined if no step is found
 */
export const getStepByCvid = (steps: Step[] | undefined, cvid: string): Step | undefined => {
  if (!steps) {
    return undefined;
  }
  return steps.find((step) => step.cvid === cvid);
};
