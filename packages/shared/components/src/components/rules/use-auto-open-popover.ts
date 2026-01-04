import { useLayoutEffect, useState } from 'react';
import { useRulesGroupContext } from '../contexts/rules-group-context';

/**
 * Custom hook to manage Popover open state with auto-open for newly added conditions.
 *
 * Uses useLayoutEffect instead of useState initializer for reliable timing.
 * useLayoutEffect runs synchronously after DOM updates but before browser paint,
 * ensuring the ref check happens at a deterministic point in the render cycle.
 *
 * @param conditionId - The unique ID of the condition
 * @returns A tuple of [open, setOpen] similar to useState
 */
export function useAutoOpenPopover(conditionId?: string) {
  const { newlyAddedIdRef } = useRulesGroupContext();
  const [open, setOpen] = useState(false);

  // Use useLayoutEffect for reliable auto-open timing
  // This runs synchronously after DOM mutations, before browser paint
  useLayoutEffect(() => {
    if (conditionId && newlyAddedIdRef.current === conditionId) {
      setOpen(true);
      // Clear the ref immediately to prevent re-triggering on re-renders
      newlyAddedIdRef.current = null;
    }
  }, [conditionId, newlyAddedIdRef]);

  return [open, setOpen] as const;
}
