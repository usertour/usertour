import { useEffect, useRef } from 'react';
import { useBuilderContext } from '../contexts';
import { ContentSide, getOppositeSide, getPositionSide, SidebarSide } from '../utils/position';
import { useContentPosition } from './use-content-position';

/**
 * Hook to automatically adjust sidebar position when content position overlaps
 * Only adjusts once when content position changes, allowing manual user override
 */
export function useAutoSidebarPosition(): void {
  const { position, setPosition } = useBuilderContext();
  const contentPosition = useContentPosition();
  // Track the last content position we adjusted for to avoid re-adjusting on manual changes
  const lastAdjustedPositionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Only adjust if content position has changed since last adjustment
    if (contentPosition === lastAdjustedPositionRef.current) {
      return;
    }

    const contentSide: ContentSide = getPositionSide(contentPosition);
    // Only adjust if content is on left or right (not center) and overlaps with sidebar
    if (contentSide !== 'center' && contentSide === position) {
      setPosition(getOppositeSide(contentSide as SidebarSide));
    }

    // Remember this content position so we don't re-adjust for it
    lastAdjustedPositionRef.current = contentPosition;
  }, [contentPosition, position, setPosition]);
}
