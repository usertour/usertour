import { ContentActionsItemType } from '@usertour/types';

// Cross-action mutex rules. Some action combinations don't make runtime
// sense and would produce undefined behavior — e.g., STEP_GOTO inside the
// same list as FLOW_DISMIS / FLOW_START means "go to step X *and* dismiss
// or restart the flow that owns step X". v1 actions-group.tsx encoded
// these as inline filters; we centralize them so the add-action dropdown
// and any future validation pass share one source of truth.
const MUTEX_GROUPS: ReadonlyArray<ReadonlySet<string>> = [
  new Set<string>([
    ContentActionsItemType.STEP_GOTO,
    ContentActionsItemType.FLOW_DISMIS,
    ContentActionsItemType.FLOW_START,
  ]),
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
