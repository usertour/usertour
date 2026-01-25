import type { RefObject } from 'react';
import { useCallback } from 'react';
import { useEvent } from 'react-use';
import { window } from '@usertour/helpers';

/**
 * Hook to detect clicks outside of specified elements
 * Supports multiple refs and Radix Popover detection
 */
export const useClickOutside = (
  refs: RefObject<HTMLElement | null>[],
  onClickOutside: () => void,
  enabled = true,
) => {
  const handleClickOutside = useCallback(
    (event: Event) => {
      if (!enabled) return;

      const mouseEvent = event as MouseEvent;
      const target = mouseEvent.target as Element;

      // Check if click is inside any of the provided refs
      const isInsideRefs = refs.some((ref) => ref.current?.contains(target as Node));

      // Check if click is inside any Radix Popover content (e.g., ColorPicker panel)
      // Some PopoverContent components are rendered via Portal, so they're not in the toolbar DOM tree
      const isInRadixPopoverContent = target.closest?.('[data-radix-popper-content-wrapper]');

      if (!isInsideRefs && !isInRadixPopoverContent) {
        onClickOutside();
      }
    },
    [refs, onClickOutside, enabled],
  );

  // Use react-use's useEvent for consistent event handling across the project
  useEvent('click', handleClickOutside, window, { capture: false });
};
