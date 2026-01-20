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

      // Check if click is inside any of the provided refs
      const isInsideRefs = refs.some((ref) => ref.current?.contains(mouseEvent.target as Node));

      // Check if click is inside any Radix Popover (e.g., ColorPicker panel)
      const isInRadixPopover = (mouseEvent.target as Element).closest?.(
        '[data-radix-popper-content-wrapper]',
      );

      if (!isInsideRefs && !isInRadixPopover) {
        onClickOutside();
      }
    },
    [refs, onClickOutside, enabled],
  );

  // Use react-use's useEvent for consistent event handling across the project
  useEvent('click', handleClickOutside, window, { capture: false });
};
