import type { ChecklistItemType } from '@usertour/types';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for managing checklist preview animation and completion state.
 * Used in preview components where items need visual feedback on click.
 *
 * @param expanded - The current expanded state of the checklist
 * @returns Object containing completedItemIds, animatedItemIds, and handleItemClick
 */
export function useChecklistPreviewAnimation(expanded: boolean) {
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());
  const [animatedItemIds, setAnimatedItemIds] = useState<Set<string>>(new Set());

  // Clear animation state when expanded changes
  useEffect(() => {
    setAnimatedItemIds(new Set());
  }, [expanded]);

  const handleItemClick = useCallback((item: ChecklistItemType) => {
    if (item.isCompleted) return;
    setCompletedItemIds((prev) => new Set(prev).add(item.id));
    setAnimatedItemIds((prev) => new Set(prev).add(item.id));
  }, []);

  return { completedItemIds, animatedItemIds, handleItemClick };
}
