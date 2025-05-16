import { BizEvents, ContentDataType, SDKContent } from '@usertour-ui/types';
import { Checklist } from '../core/checklist';
import { Launcher } from '../core/launcher';
import { Tour } from '../core/tour';
import { parseUrlParams } from './conditions';
import { window } from './globals';

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
      item.destroy();
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
  const checklistsWithValidSession = checklists.filter(
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
