import { z } from 'zod';

import { representationBlock } from './representation.schema';
import { representationAction, representationCondition } from './representation.schema';

/**
 * Representation of a version's type-specific body — the `version.data` payload
 * for the non-flow content types (flow keeps everything in `steps`). Each shape
 * is intent-level and lossy: styling / screenshots / computed sizes / runtime
 * state are dropped on read and preserved on write via field-level merge against
 * the existing `version.data`. The nested parts (blocks, conditions, actions,
 * target) reuse the shared leaf codecs.
 *
 * The discriminant is the *content type* (external to the payload), so these are
 * a plain set of shapes; the codec dispatches on `content.type`.
 */

// ── tracker ──────────────────────────────────────────────────────────────────
// A tracker's trigger lives in config.autoStartRules (authored via startRules);
// version.data only holds the tracked event reference.
export const representationTracker = z.object({
  /** Event code to track, or null when unset. */
  event: z.string().nullable(),
});
export type RepresentationTracker = z.infer<typeof representationTracker>;

// ── checklist  (from ChecklistData) ──────────────────────────────────────────
// Items merge by `id` on write (server-owned key, round-trips on read) so runtime
// state (isCompleted / isVisible …) is preserved; omit `id` for a new item.
// `completeWhen` / `onlyShowWhen` are conditions; `clickActions` are actions.
const checklistItem = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  completeWhen: z.array(representationCondition).default([]),
  clickActions: z.array(representationAction).default([]),
  onlyShowWhen: z.array(representationCondition).optional(),
});
export const representationChecklist = z.object({
  buttonText: z.string().optional(),
  initialDisplay: z.enum(['expanded', 'button']).optional(),
  completionOrder: z.enum(['any', 'ordered']).optional(),
  preventDismiss: z.boolean().optional(),
  autoDismiss: z.boolean().optional(),
  content: z.array(representationBlock).optional(),
  items: z.array(checklistItem).optional(),
});
export type RepresentationChecklist = z.infer<typeof representationChecklist>;

// ── union (selected by content type) ─────────────────────────────────────────
export const representationVersionData = z.union([representationTracker, representationChecklist]);
export type RepresentationVersionData = z.infer<typeof representationVersionData>;

// Re-exported so the codec files share the leaf schemas without re-importing.
export { representationBlock, representationAction, representationCondition };
