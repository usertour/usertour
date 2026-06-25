import { z } from 'zod';

import {
  completeWhenCondition,
  representationAction,
  representationBlock,
  representationCondition,
  representationTarget,
} from './representation.schema';
import { representationResourceCenter } from './resource-center.schema';

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
  // completeWhen also accepts the parameterless `task_clicked` (a task completes
  // when its item is clicked) — valid only here (incl. nested in OR groups), not
  // in the general condition set.
  completeWhen: z
    .array(completeWhenCondition)
    .default([])
    .describe(
      'Condition(s) that mark THIS task done. Use [{ "type": "task_clicked" }] to complete it ' +
        'when the user clicks the task — the only option that needs no app instrumentation; ' +
        'other conditions (event / element / segment / current_url / user_attribute) require the ' +
        'matching wiring or data in your app. Empty = the task never auto-completes.',
    ),
  clickActions: z
    .array(representationAction)
    .default([])
    .describe(
      'What happens when the user CLICKS the task row (e.g. [{ "type": "navigate", "url": "/x" }]) ' +
        '— a side effect, NOT completion. To also mark the task done on that click, add ' +
        '{ "type": "task_clicked" } to completeWhen.',
    ),
  onlyShowWhen: z.array(representationCondition).optional(),
});
export const representationChecklist = z.object({
  buttonText: z.string().optional(),
  initialDisplay: z.enum(['expanded', 'button']).optional(),
  completionOrder: z.enum(['any', 'ordered']).optional(),
  preventDismiss: z.boolean().optional(),
  autoDismiss: z.boolean().optional(),
  content: z.array(representationBlock).optional(),
  items: z
    .array(checklistItem)
    .optional()
    .describe(
      'The checklist tasks. To be usable (enforced at publish) each item needs a `name` AND at ' +
        'least one of `completeWhen` (how it auto-completes) or `clickActions` (what its row does) ' +
        '— an item with neither is a dead row. `task_clicked` in `completeWhen` is the only ' +
        'completion that needs no app instrumentation.',
    ),
});
export type RepresentationChecklist = z.infer<typeof representationChecklist>;

// ── launcher  (from LauncherData) ────────────────────────────────────────────
// `target` is the launcher's anchor element; `tooltip.content` are blocks; the
// behavior `actions` are actions (perform-action mode). Screenshot / zIndex are
// dropped on read and preserved on write.
const launcherPlacement = z.object({
  side: z.enum(['top', 'right', 'bottom', 'left']),
  align: z.enum(['start', 'center', 'end']),
  sideOffset: z.number().optional(),
  alignOffset: z.number().optional(),
});
export const representationLauncher = z.object({
  style: z.enum(['beacon', 'icon', 'hidden', 'button']).optional(),
  icon: z
    .object({
      source: z.enum(['none', 'builtin', 'upload', 'url', 'inherit']).optional(),
      url: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),
  buttonText: z.string().optional(),
  target: representationTarget.optional(),
  /** Stacking order (CSS z-index — must be an integer; may be negative). */
  zIndex: z.number().int().optional(),
  tooltip: z
    .object({
      placement: launcherPlacement.optional(),
      width: z.number().optional(),
      /** Whether the tooltip anchors to the target element or to the launcher. */
      reference: z.enum(['target', 'launcher']).optional(),
      content: z.array(representationBlock).optional(),
      settings: z
        .object({
          dismissAfterFirstActivation: z.boolean().optional(),
          keepOpenWhenHovered: z.boolean().optional(),
          hideLauncherWhenTooltipShown: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  behavior: z
    .object({
      triggerElement: z.enum(['launcher', 'target', 'target-or-launcher']).optional(),
      event: z.enum(['clicked', 'hovered']).optional(),
      action: z.enum(['show-tooltip', 'perform-action']).optional(),
      actions: z.array(representationAction).optional(),
    })
    .optional(),
});
export type RepresentationLauncher = z.infer<typeof representationLauncher>;

// ── banner  (from BannerData) ────────────────────────────────────────────────
// `content` are blocks; `containerTarget` is the anchor element for container/
// element-relative placements. Computed height / zIndex are dropped + preserved.
export const representationBanner = z.object({
  placement: z
    .enum([
      'top-of-page',
      'bottom-of-page',
      'top-of-container-element',
      'bottom-of-container-element',
      'immediately-before-element',
      'immediately-after-element',
    ])
    .optional(),
  content: z.array(representationBlock).optional(),
  /** Stacking order (CSS z-index — must be an integer; may be negative). */
  zIndex: z.number().int().optional(),
  settings: z
    .object({
      overlayOverAppContent: z.boolean().optional(),
      stickToTop: z.boolean().optional(),
      allowDismiss: z.boolean().optional(),
      animateOnAppear: z.boolean().optional(),
    })
    .optional(),
  containerTarget: representationTarget.optional(),
  layout: z
    .object({
      maxContentWidth: z.number().optional(),
      maxEmbedWidth: z.number().optional(),
      borderRadius: z.number().optional(),
      outerMargin: z
        .object({
          top: z.number(),
          right: z.number(),
          bottom: z.number(),
          left: z.number(),
        })
        .optional(),
    })
    .optional(),
});
export type RepresentationBanner = z.infer<typeof representationBanner>;

// ── union (selected by content type) ─────────────────────────────────────────
// resource-center lives in its own codec area (resource-center.*); referenced here
// only so the union type covers every non-flow body.
export const representationVersionData = z.union([
  representationTracker,
  representationChecklist,
  representationLauncher,
  representationBanner,
  representationResourceCenter,
]);
export type RepresentationVersionData = z.infer<typeof representationVersionData>;

// Re-exported so the codec files share the leaf schemas without re-importing.
export { representationBlock, representationAction, representationCondition };
