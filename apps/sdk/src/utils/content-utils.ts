import {
  BizEvent,
  BizEvents,
  BizSession,
  ChecklistData,
  ChecklistInitialDisplay,
  ChecklistItemType,
  ContentDataType,
  SDKContent,
  Step,
  Theme,
  RulesType,
} from '@usertour/types';
import {
  activedContentRulesConditions,
  parseUrlParams,
  checklistIsDimissed,
  isActive,
} from '@usertour/helpers';
import { activedRulesConditions } from './conditions';
import { window } from './globals';
import {
  canCompleteChecklistItem,
  checklistCompletedItemsCount,
  checklistVisibleItemsCount,
} from '@usertour-packages/sdk';
import { BaseStore } from '../types/store';
import isEqual from 'fast-deep-equal';

/**
 * Finds the usertour ID from the URL
 * @returns The usertour ID or null if no URL is available
 */
export const findUsertourIdFromUrl = (): string | null => {
  if (!window) {
    return null;
  }
  return parseUrlParams(window.location.href, 'usertour');
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
 * Gets the initial display of a checklist
 * @param checklist - The checklist to get the initial display of
 * @returns The initial display of the checklist
 */
export const getChecklistInitialDisplay = (content: SDKContent): ChecklistInitialDisplay => {
  const latestSession = content.latestSession;
  if (!latestSession || checklistIsDimissed(content.latestSession)) {
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
  if (!latestSession || checklistIsDimissed(content.latestSession)) {
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
    !isEqual(currentStore.themeSettings, previousStore.themeSettings) ||
    currentStore.zIndex !== previousStore.zIndex
  );
};

/**
 * Checks if attributes have actually changed by comparing current and new attributes
 * @param currentAttributes - Current attributes object
 * @param newAttributes - New attributes to merge
 * @returns True if attributes have changed, false otherwise
 */
export const hasAttributesChanged = (
  currentAttributes: Record<string, any> = {},
  newAttributes: Record<string, any> = {},
): boolean => {
  const mergedAttributes = { ...currentAttributes, ...newAttributes };
  return !isEqual(currentAttributes, mergedAttributes);
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

/**
 * Gets the active theme
 * @param themes - The themes to search through
 * @param themeId - The theme id to search for
 * @returns The active theme or undefined if no theme is found
 */
export const getActivedTheme = async (themes: Theme[], themeId: string) => {
  const theme = themes.find((item) => item.id === themeId);
  if (!theme || !theme.variations) {
    return theme;
  }

  // Process variations asynchronously to check conditions
  const activeVariations = [];
  for (const item of theme.variations) {
    const activatedConditions = await activedRulesConditions(item.conditions);
    if (isActive(activatedConditions)) {
      activeVariations.push(item);
    }
  }

  if (activeVariations.length === 0) {
    return theme;
  }
  const settings = activeVariations[0].settings;
  return { ...theme, settings };
};

/**
 * Process configuration and return processed config with activated rules
 * @param content - The content to process
 * @returns Processed configuration with activated rules
 */
const getProcessedConfig = async (content: SDKContent, contents: SDKContent[]): Promise<any> => {
  const config = content.config;

  const autoStartRules =
    config.enabledAutoStartRules && config.autoStartRules?.length > 0
      ? await activedContentRulesConditions(config.autoStartRules, contents)
      : config.autoStartRules || [];

  const hideRules =
    config.enabledHideRules && config.hideRules?.length > 0
      ? await activedContentRulesConditions(config.hideRules, contents)
      : config.hideRules || [];

  return {
    ...config,
    autoStartRules,
    hideRules,
  };
};

/**
 * Process checklist conditions and return updated items
 * @param data - Checklist data containing items and conditions
 * @returns Updated checklist data with processed conditions
 */
const activedChecklistConditions = async (
  data: ChecklistData,
  contents: SDKContent[],
): Promise<ChecklistData> => {
  if (!data?.items?.length) {
    return data;
  }

  const items = await Promise.all(
    data.items.map(async (item) => {
      const [completeConditions, onlyShowTaskConditions] = await Promise.all([
        item.completeConditions?.length > 0
          ? activedContentRulesConditions(item.completeConditions, contents)
          : Promise.resolve(item.completeConditions || []),
        item.onlyShowTaskConditions?.length > 0
          ? activedContentRulesConditions(item.onlyShowTaskConditions, contents)
          : Promise.resolve(item.onlyShowTaskConditions || []),
      ]);

      return {
        ...item,
        completeConditions,
        onlyShowTaskConditions,
      };
    }),
  );

  return { ...data, items };
};

/**
 * Process step triggers and return updated steps
 * @param steps - Array of steps to process
 * @returns Updated steps with processed conditions
 */
const activedStepTriggers = async (steps: Step[], contents: SDKContent[]): Promise<Step[]> => {
  if (!steps?.length) {
    return steps;
  }

  const stepsData = await Promise.all(
    steps.map(async (step) => {
      if (step.trigger && Array.isArray(step.trigger) && step.trigger.length > 0) {
        const processedTriggers = await Promise.all(
          step.trigger.map(async (trigger) => {
            if (trigger.conditions?.length > 0) {
              const processedConditions = await activedContentRulesConditions(
                trigger.conditions,
                contents,
              );
              return {
                ...trigger,
                conditions: processedConditions,
              };
            }
            return trigger;
          }),
        );

        return {
          ...step,
          trigger: processedTriggers,
        };
      }
      return step;
    }),
  );

  return stepsData;
};

/**
 * Process a single content item and return its configuration
 * @param content - The content item to process
 * @returns Processed content configuration
 */
const processContent = async (content: SDKContent, contents: SDKContent[]): Promise<SDKContent> => {
  // Process config and data in parallel
  const [config, processedData, processedSteps] = await Promise.all([
    getProcessedConfig(content, contents),
    content.type === ContentDataType.CHECKLIST
      ? activedChecklistConditions(content.data as ChecklistData, contents)
      : Promise.resolve(content.data),
    content.steps && content.steps.length > 0
      ? activedStepTriggers(content.steps, contents)
      : Promise.resolve(content.steps),
  ]);

  return {
    ...content,
    config,
    data: processedData,
    steps: processedSteps,
  };
};

/**
 * Processes content rules conditions
 * @param contents - The contents to process
 * @returns The processed contents
 */
export const activedContentsRulesConditions = async (contents: SDKContent[]) => {
  // Process all contents in parallel for better performance
  const processedContents = await Promise.all(
    contents.map(async (content) => {
      return await processContent(content, contents);
    }),
  );

  return processedContents;
};
