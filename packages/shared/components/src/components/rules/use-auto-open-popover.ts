import { useState } from 'react';
import { useRulesGroupContext } from '../contexts/rules-group-context';

/**
 * Custom hook to manage Popover open state with auto-open for newly added conditions.
 *
 * @param conditionId - The unique ID of the condition
 * @returns A tuple of [open, setOpen] similar to useState
 */
export function useAutoOpenPopover(conditionId?: string) {
  const { newlyAddedIdRef } = useRulesGroupContext();

  // Initialize open state - auto-open if this is a newly added condition
  const [open, setOpen] = useState(
    () => !!(conditionId && newlyAddedIdRef.current === conditionId),
  );

  return [open, setOpen] as const;
}
