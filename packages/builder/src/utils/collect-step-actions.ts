import type { RulesCondition, Step } from '@usertour/types';

// Walks a step's content tree and collects every RulesCondition[] under
// `element.data.actions`, plus the placement-level `target.actions` (the
// "When target element is clicked" list). Returns one flat array of lists
// so the caller can pass them straight to a save gate. Lists with no
// actions are omitted to avoid empty-array noise.
//
// ContentEditor data shape (Step.data is any but the runtime shape is fixed):
//   ContentEditorRoot[]          // groups
//   .children: ContentEditorRootColumn[]
//   .children: ContentEditorRootElement[]
//   .element.data.actions?: RulesCondition[]   // button / nps / multi-choice / ...
export function collectStepActions(step: Step | undefined): RulesCondition[][] {
  if (!step) return [];
  const lists: RulesCondition[][] = [];

  // Placement actions live on step.target.actions (only meaningful for the
  // tooltip variant in v1 but the field is structurally available on every
  // step; check len-gt-0 before pushing).
  const targetActions = step.target?.actions;
  if (Array.isArray(targetActions) && targetActions.length > 0) {
    lists.push(targetActions);
  }

  // Step.data is the ContentEditorRoot[] tree. Walk three levels: groups →
  // columns → elements. Type as a loose array tree because Step.data is
  // declared `any` upstream.
  const tree = (step.data ?? []) as Array<{
    children?: Array<{
      children?: Array<{
        element?: { data?: { actions?: RulesCondition[] } };
      }>;
    }>;
  }>;

  for (const group of tree) {
    for (const column of group?.children ?? []) {
      for (const node of column?.children ?? []) {
        const actions = node?.element?.data?.actions;
        if (Array.isArray(actions) && actions.length > 0) {
          lists.push(actions);
        }
      }
    }
  }

  return lists;
}
