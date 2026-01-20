import type { RefObject } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMeasure } from 'react-use';

import { RESPONSIVE } from '../toolbar.styles';
import type { ToolbarItemConfig, UseResponsiveToolbarReturn } from '../toolbar.types';

/**
 * Hook to manage responsive toolbar layout
 * Calculates which items should be visible vs. in overflow menu
 */
export const useResponsiveToolbar = (
  items: ToolbarItemConfig[],
): UseResponsiveToolbarReturn & {
  measureRef: (element: HTMLElement | null) => void;
  containerRef: RefObject<HTMLDivElement | null>;
} => {
  const [measureRef, rect] = useMeasure<HTMLDivElement>();
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const [visibleItems, setVisibleItems] = useState<ToolbarItemConfig[]>(items);
  const [overflowItems, setOverflowItems] = useState<ToolbarItemConfig[]>([]);
  const [showOverflow, setShowOverflow] = useState(false);

  // Calculate visible and overflow items based on container width
  useEffect(() => {
    if (rect.width < RESPONSIVE.BREAKPOINT) {
      const visibleItemCount = Math.max(
        Math.floor((rect.width - RESPONSIVE.CONTAINER_PADDING) / RESPONSIVE.ITEM_WIDTH),
        1,
      );
      // Reserve one slot for the "more" button
      const actualVisibleCount = visibleItemCount - 1;
      setVisibleItems(items.slice(0, actualVisibleCount));
      setOverflowItems(items.slice(actualVisibleCount));
      setShowOverflow(true);
    } else {
      setVisibleItems(items);
      setOverflowItems([]);
      setShowOverflow(false);
    }
  }, [rect.width, items]);

  // Combined ref handler for both measurement and reference storage
  const combinedRef = useMemo(() => {
    return (element: HTMLElement | null) => {
      measureRef(element as HTMLDivElement);
      setContainerRef(element as HTMLDivElement);
    };
  }, [measureRef]);

  return {
    visibleItems,
    overflowItems,
    showOverflow,
    measureRef: combinedRef,
    containerRef: { current: containerRef } as RefObject<HTMLDivElement | null>,
  };
};
