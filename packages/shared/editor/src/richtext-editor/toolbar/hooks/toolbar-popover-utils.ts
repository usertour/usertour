import type { RefObject } from 'react';

/**
 * Data attribute to identify toolbar popovers
 * Used to distinguish toolbar popovers from other popovers in the page
 */
export const TOOLBAR_POPOVER_DATA_ATTR = 'data-toolbar-popover';

/**
 * Check if a click target is inside a toolbar popover
 * Toolbar popovers are rendered via Portal, so they're not in the toolbar DOM tree
 * @param target - The click target element
 * @param toolbarRef - Reference to the toolbar element (optional, for additional checks)
 * @returns true if the click is inside a toolbar popover
 */
export const isInsideToolbarPopover = (
  target: Element,
  toolbarRef?: RefObject<HTMLElement | null>,
): boolean => {
  // Check for toolbar-specific popover data attribute
  const toolbarPopover = target.closest?.(`[${TOOLBAR_POPOVER_DATA_ATTR}]`);
  if (toolbarPopover) {
    return true;
  }

  // Fallback: Check for open Radix UI components that are not inside the toolbar
  // This is a safety net in case data-toolbar-popover attribute is missing
  // Only consider it a toolbar popover if it's not inside the toolbar ref (meaning it's in a Portal)
  const openPopover = target.closest?.('[data-state="open"]');
  if (openPopover && !toolbarRef?.current?.contains(openPopover as Node)) {
    // If it's an open component outside the toolbar, it's likely a Portal popover
    return true;
  }

  return false;
};
