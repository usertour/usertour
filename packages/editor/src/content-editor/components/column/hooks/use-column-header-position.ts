// Hook for positioning ColumnHeader using FloatingUI

import { autoUpdate } from '@floating-ui/dom';
import { useFloating, offset, shift } from '@floating-ui/react-dom';
import { useLayoutEffect, useMemo } from 'react';
import type { RefObject } from 'react';

export interface UseColumnHeaderPositionOptions {
  /**
   * Reference element (the column container)
   */
  referenceRef: RefObject<HTMLElement | null>;
  /**
   * Whether the positioning is enabled
   * Should be true when column is active and not dragging
   */
  enabled: boolean;
}

export interface UseColumnHeaderPositionReturn {
  /**
   * Styles to apply to the floating element
   */
  floatingStyles: React.CSSProperties;
  /**
   * Refs for FloatingUI
   */
  refs: {
    setFloating: (node: HTMLElement | null) => void;
  };
}

/**
 * Hook to position ColumnHeader using FloatingUI
 * Uses fixed positioning strategy to avoid overflow clipping issues
 */
export const useColumnHeaderPosition = (
  options: UseColumnHeaderPositionOptions,
): UseColumnHeaderPositionReturn => {
  const { referenceRef, enabled } = options;

  // Memoize middleware configuration for performance
  // For 'top-start' placement with FloatingUI:
  // - By default, FloatingUI positions the floating element's bottom edge at the reference's top edge
  // - mainAxis: 0 means no offset, so the header's bottom edge aligns with column's top edge
  // - Since ColumnHeader height is 16px (h-4), this positions it above the column
  // - alignmentAxis: -1 adjusts left position by -1px to match original -left-[1px] behavior
  const middleware = useMemo(
    () => [
      offset({ mainAxis: 0, alignmentAxis: -1 }), // Align bottom edge to column top, -1px for left alignment
      shift({ padding: 8 }), // Shift horizontally to stay in viewport
      // Note: We don't use flip() here because we want to keep the header
      // above the column even if space is limited
    ],
    [],
  );

  const { refs, floatingStyles, update } = useFloating({
    strategy: 'fixed', // Use fixed positioning to avoid overflow clipping
    placement: 'top-start', // Top-left alignment to match original -top-4 -left-[1px] behavior
    middleware,
    whileElementsMounted: enabled
      ? (reference, floating, updateFn) => {
          // Only enable auto-update when positioning is enabled
          return autoUpdate(reference, floating, updateFn, {
            animationFrame: false, // Use optimized update strategy
          });
        }
      : undefined,
  });

  // Update reference element when it changes
  useLayoutEffect(() => {
    if (enabled && referenceRef.current) {
      refs.setReference(referenceRef.current);
      // Trigger position update after setting reference
      update?.();
    } else {
      refs.setReference(null);
    }
  }, [enabled, referenceRef, refs, update]);

  return {
    floatingStyles,
    refs: {
      setFloating: refs.setFloating,
    },
  };
};
