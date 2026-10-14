import { ContentActionsItemType } from '@usertour/types';

// Cross-action mutex rules expressed as pairwise sets. STEP_GOTO clashes
// with FLOW_DISMIS ("go to step X *and* dismiss the flow that owns it")
// and with FLOW_START ("go to step X *and* restart the flow"), but
// FLOW_DISMIS + FLOW_START intentionally coexist — dismissing the current
// flow and starting a new one in the same click is a real pattern.
// Encoded as two 2-sets instead of one 3-set so the third edge stays open.
const MUTEX_GROUPS: ReadonlyArray<ReadonlySet<string>> = [
  new Set<string>([ContentActionsItemType.STEP_GOTO, ContentActionsItemType.FLOW_DISMIS]),
  new Set<string>([ContentActionsItemType.STEP_GOTO, ContentActionsItemType.FLOW_START]),
];

// Returns the set of action types that should be hidden from the dropdown
// given the types already present in the list. An action type is hidden
// if it shares a mutex group with at least one existing type. Repeatable
// vs. singleton handling is orthogonal and lives in AddActionDropdown —
// this function only deals with cross-type incompatibility.
export function getMutuallyExcluded(existingTypes: ReadonlyArray<string>): Set<string> {
  const excluded = new Set<string>();
  for (const group of MUTEX_GROUPS) {
    const presentInGroup = existingTypes.some((type) => group.has(type));
    if (!presentInGroup) continue;
    for (const type of group) {
      if (!existingTypes.includes(type)) excluded.add(type);
    }
  }
  return excluded;
}
