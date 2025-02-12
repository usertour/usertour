import { ContentDataType, SDKContent } from '@usertour-ui/types';
import { Checklist } from '../core/checklist';
import { Launcher } from '../core/launcher';
import { Tour } from '../core/tour';

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
      if (item instanceof Tour && item.isActiveTour()) {
        item.cancelActiveTour();
      } else {
        item.destroy();
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
