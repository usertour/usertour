import type { RefObject } from 'react';
import { useCallback } from 'react';
import { useEvent } from 'react-use';
import { window } from '@usertour/helpers';

import { isInsideToolbarPopover } from './toolbar-popover-utils';

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

      // Check if click is inside a toolbar popover (rendered via Portal)
      // Use the first ref as toolbar ref for popover detection
      const toolbarRef = refs[0];
      const isInToolbarPopover = isInsideToolbarPopover(target, toolbarRef);

      if (!isInsideRefs && !isInToolbarPopover) {
        onClickOutside();
      }
    },
    [refs, onClickOutside, enabled],
  );

  // Use react-use's useEvent for consistent event handling across the project
  useEvent('click', handleClickOutside, window, { capture: false });
};
