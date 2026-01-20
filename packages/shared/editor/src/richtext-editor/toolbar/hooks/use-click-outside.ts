import type { RefObject } from 'react';
import { useCallback, useEffect } from 'react';

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
    (event: MouseEvent) => {
      // Check if click is inside any of the provided refs
      const isInsideRefs = refs.some((ref) => ref.current?.contains(event.target as Node));

      // Check if click is inside any Radix Popover (e.g., ColorPicker panel)
      const isInRadixPopover = (event.target as Element).closest?.(
        '[data-radix-popper-content-wrapper]',
      );

      if (!isInsideRefs && !isInRadixPopover) {
        onClickOutside();
      }
    },
    [refs, onClickOutside],
  );

  useEffect(() => {
    if (!enabled) return;

    // Use capture: false to allow other click handlers to run first
    window.addEventListener('click', handleClickOutside, { capture: false });

    return () => {
      window.removeEventListener('click', handleClickOutside, { capture: false });
    };
  }, [handleClickOutside, enabled]);
};
