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
  event: z
    .string()
    .nullable()
    .describe(
      "The CUSTOM event this tracker fires when its startRules match. A custom event's " +
        'codeName (preferred) or id from list_event_definitions — accepted either way, ' +
        'stored and returned as the codeName. MUST be a custom event: built-in / system ' +
        '(predefined) events are rejected (a tracker can only fire custom events; create one ' +
        'with create_event_definition). A tracker is headless — no UI, no theme; it just ' +
        'fires this event whenever its startRules trigger conditions are met. null when unset.',
    ),
});
export type RepresentationTracker = z.infer<typeof representationTracker>;

// ── checklist  (from ChecklistData) ──────────────────────────────────────────
// Items merge by `id` on write (server-owned key, round-trips on read) so runtime
// state (isCompleted / isVisible …) is preserved; omit `id` for a new item.
// `completeWhen` / `onlyShowWhen` are conditions; `clickActions` are actions.
const checklistItem = z.object({
  id: z
    .string()
    .optional()
    .describe(
      'Server-owned task identity — ECHO it back when rewriting `items`. An item written ' +
        "without its existing id gets a NEW one: in-flight users' completion state for it " +
        'resets and its per-task analytics rows break. Omit only for a genuinely new task.',
    ),
  name: z.string(),
  description: z
    .string()
    .optional()
    .describe(
      'Optional supporting text rendered below the task name. A short benefit statement or time ' +
        'estimate ("Send an invite so your team can collaborate", "~30 sec") measurably lifts ' +
        'task click-through — prefer setting it over leaving the row name-only.',
    ),
  // completeWhen also accepts the parameterless `task_clicked` (a task completes
  // when its item is clicked) — valid only here (incl. nested in OR groups), not
  // in the general condition set.
  completeWhen: z
    .array(completeWhenCondition)
    .default([])
    .describe(
      'Condition(s) that mark THIS task done. Use [{ "type": "task_clicked" }] to complete it ' +
        'when the user clicks the task — the only option that needs no app instrumentation; ' +
        'other conditions (event / element / segment / current_url / attribute) require the ' +
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
  onlyShowWhen: z
    .array(representationCondition)
    .optional()
    .describe(
      'Condition(s) that gate whether this task is VISIBLE (distinct from `completeWhen`, which ' +
        'marks it done). Omit = always shown. There is no "task X is completed" condition, so to ' +
        'make this task appear only after another is done, gate on the same event/state that ' +
        'completes that other task — you cannot reference another task directly.',
    ),
});
export const representationChecklist = z.object({
  buttonText: z
    .string()
    .optional()
    .describe('Label on the collapsed checklist launcher pill (e.g. "Getting started").'),
  initialDisplay: z
    .enum(['expanded', 'button'])
    .optional()
    .describe(
      'How the checklist first appears: `expanded` shows the whole checklist (tasks and all); ' +
        '`button` shows just the launcher button.',
    ),
  completionOrder: z
    .enum(['any', 'ordered'])
    .optional()
    .describe(
      'Whether tasks can be completed in `any` order, or must be completed `ordered` (top to ' +
        'bottom among the tasks the user can currently SEE — a task hidden by `onlyShowWhen` ' +
        'does not block the ones after it). This is the ONLY built-in cross-task sequencing — ' +
        'there is no per-task "after task X" condition; for finer dependencies gate a task\'s ' +
        '`onlyShowWhen` on the shared event/state that completes its prerequisite.',
    ),
  preventDismiss: z.boolean().optional().describe("When true, users can't dismiss the checklist."),
  autoDismiss: z
    .boolean()
    .optional()
    .describe('When true, the checklist closes on its own once every task is done.'),
  content: z
    .array(representationBlock)
    .optional()
    .describe(
      'Rich content shown at the top of the expanded panel, above the task list — typically a ' +
        'short welcome line framing what the tasks achieve.',
    ),
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
// `target` is the launcher's anchor element (+ where the beacon sits on it, via
// `target.placement`); `tooltip.content` are blocks; the behavior `actions` are
// actions (perform-action mode). `zIndex` round-trips; the target `screenshot`
// is preserved on write but not represented on read.
const launcherPlacement = z.object({
  side: z
    .enum(['top', 'right', 'bottom', 'left'])
    .optional()
    .describe(
      'Which side of the target the tooltip opens on. OMIT side+align to auto-position ' +
        '(picks a spot + flips to avoid the viewport edge); setting side (or align) pins that ' +
        'direction (no auto-flip). Same auto/fixed derivation as a flow tooltip.',
    ),
  align: z
    .enum(['start', 'center', 'end'])
    .optional()
    .describe('Alignment along the side. See `side`.'),
  sideOffset: z
    .number()
    .optional()
    .describe('Gap in pixels between the tooltip and its anchor, along `side`.'),
  alignOffset: z
    .number()
    .optional()
    .describe('Pixel shift along the alignment axis. Only applies when `align` is `start`/`end`.'),
  // Position mode, derived on compile like a flow tooltip: explicit wins;
  // else side/align given → `fixed`; else `auto`. Exposed so `align` can
  // actually take effect (a launcher left in `auto` renders center regardless).
  alignType: z
    .enum(['auto', 'fixed'])
    .optional()
    .describe(
      'Position mode. `auto` auto-positions + flips (ignoring side/align); `fixed` pins to ' +
        'side/align. Usually omit — providing side/align implies `fixed`, omitting them implies ' +
        '`auto`. Without this, an `auto` launcher renders center and your `align` is ignored.',
    ),
});
// Where the BEACON/icon sits on its target element (same shape as the tooltip
// placement, positioning the launcher itself). Maps to the internal
// `target.alignment`.
const beaconPlacement = z.object({
  side: z
    .enum(['top', 'right', 'bottom', 'left'])
    .optional()
    .describe(
      'Which side of the target the beacon sits on. OMIT side+align to center the beacon on the ' +
        'target (with viewport-edge flipping); setting side (or align) pins it there.',
    ),
  align: z
    .enum(['start', 'center', 'end'])
    .optional()
    .describe('Alignment along the side. See `side`.'),
  sideOffset: z
    .number()
    .optional()
    .describe('Gap in pixels between the beacon and the target edge, along `side`.'),
  alignOffset: z
    .number()
    .optional()
    .describe(
      'Pixel shift along the alignment axis. Only applies when `align` is `start`/`end` — at ' +
        '`center` (or under `auto`) the runtime ignores it.',
    ),
  alignType: z
    .enum(['auto', 'fixed'])
    .optional()
    .describe(
      'Position mode. `auto` centers on the target and flips at the viewport edge (ignoring ' +
        'side/align); `fixed` pins to side/align. Providing side/align implies `fixed`, omitting ' +
        'them implies `auto` — so leave `auto` and the beacon centers regardless of `align`.',
    ),
});
// Launcher target = the shared element target PLUS where the beacon sits on it.
const launcherTarget = representationTarget.extend({
  placement: beaconPlacement
    .optional()
    .describe(
      'Where the beacon sits relative to its target element. Omit to center it on the target. ' +
        '(The tooltip has its own `tooltip.placement`; this positions the launcher itself.) ' +
        'Read back ONLY when a side/align is pinned — an auto-centered beacon omits it.',
    ),
});
export const representationLauncher = z.object({
  style: z
    .enum(['beacon', 'icon', 'hidden', 'button'])
    .optional()
    .describe(
      'Visual form: `beacon` = pulsing dot, `icon` = a static icon (see `icon`), `button` = a ' +
        'text button (see `buttonText`), `hidden` = no visual — interactions on the target ' +
        'element itself drive `behavior`.',
    ),
  icon: z
    .object({
      source: z
        .enum(['none', 'builtin', 'upload', 'url', 'inherit'])
        .optional()
        .describe(
          'Where the icon comes from: `builtin` uses `type` (a RemixIcon name), `upload`/`url` ' +
            'use `url`, `inherit` takes the theme launcher icon, `none` shows no icon.',
        ),
      url: z
        .string()
        .optional()
        .describe("Image URL for the icon — only used when source is 'upload' or 'url'."),
      type: z
        .string()
        .optional()
        .describe(
          "Builtin icon name (when source='builtin'): a RemixIcon name in kebab `-line`/`-fill` " +
            'style — e.g. `home-line`, `question-line`, `rocket`. NOT lucide names ' +
            '(`help-circle` / `sparkles` / `book-open` render nothing, silently). Unsure? Use ' +
            "source='none'. Common names + an intent→name table are in get_authoring_guide.",
        ),
    })
    .optional(),
  buttonText: z
    .string()
    .optional()
    .describe("Label of the button — only rendered when style is 'button'."),
  target: launcherTarget
    .optional()
    .describe('The page element the launcher anchors to (selector + beacon placement on it).'),
  /** Stacking order (CSS z-index — must be an integer; may be negative). */
  zIndex: z.number().int().optional(),
  tooltip: z
    .object({
      placement: launcherPlacement
        .optional()
        .describe('Where the tooltip opens relative to its anchor (see `reference`).'),
      width: z.number().optional().describe('Tooltip width in pixels. Omit for the default.'),
      reference: z
        .enum(['target', 'launcher'])
        .optional()
        .describe('Whether the tooltip anchors to the target element or to the launcher itself.'),
      content: z.array(representationBlock).optional(),
      settings: z
        .object({
          dismissAfterFirstActivation: z
            .boolean()
            .optional()
            .describe('Dismiss the launcher after its tooltip is first shown and closed.'),
          keepOpenWhenHovered: z
            .boolean()
            .optional()
            .describe(
              'READ-ONLY — not wired at runtime: the tooltip ALWAYS stays open while hovered ' +
                'regardless of this value. Echoed for round-trip; changing it is rejected.',
            ),
          hideLauncherWhenTooltipShown: z
            .boolean()
            .optional()
            .describe(
              'READ-ONLY — not wired at runtime: the launcher is NEVER hidden while its tooltip ' +
                'shows. Echoed for round-trip; changing it is rejected.',
            ),
        })
        .optional(),
    })
    .optional(),
  behavior: z
    .object({
      triggerElement: z
        .enum(['launcher', 'target', 'target-or-launcher'])
        .optional()
        .describe(
          'Which element listens for the interaction: the launcher visual, the target element ' +
            "itself, or either. With style 'hidden' the target is the only thing to interact with.",
        ),
      event: z
        .enum(['clicked', 'hovered'])
        .optional()
        .describe('The interaction that triggers the launcher: click or hover.'),
      action: z
        .enum(['show-tooltip', 'perform-action'])
        .optional()
        .describe(
          "What the interaction does: 'show-tooltip' opens `tooltip.content`; 'perform-action' " +
            'runs `actions` directly (e.g. start a flow) with no tooltip.',
        ),
      actions: z
        .array(representationAction)
        .optional()
        .describe(
          "The action list run when action is 'perform-action' (e.g. " +
            '[{ "type": "start_content", "content": "<flowId>" }]). Ignored under ' +
            "'show-tooltip' — put button actions inside the tooltip content instead.",
        ),
    })
    .optional()
    .describe(
      'How users interact with the launcher and what that interaction does. Omit for the ' +
        'default (click the launcher to show the tooltip).',
    ),
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
    .optional()
    .describe(
      'Where the banner shows: the top/bottom of the page, or relative to a container element ' +
        '(top/bottom of it, or immediately before/after it). The container/element variants ' +
        'require `containerTarget`.',
    ),
  content: z.array(representationBlock).optional(),
  /** Stacking order (CSS z-index — must be an integer; may be negative). */
  zIndex: z.number().int().optional(),
  settings: z
    .object({
      overlayOverAppContent: z
        .boolean()
        .optional()
        .describe(
          'When true the banner floats over the page; when false it takes its own space and ' +
            "pushes the page content down. Push mode only displaces normal-flow content — the host app's " +
            '`position: fixed` bars (top nav, sidebars) do NOT move and will overlap the banner. For such ' +
            'apps, either float the banner over the content (true), or use a container/element-relative ' +
            '`placement` so the banner lives inside the scrolling content area instead of fighting the ' +
            'fixed bars.',
        ),
      stickToTop: z
        .boolean()
        .optional()
        .describe('Keeps the banner pinned at the top while the user scrolls.'),
      allowDismiss: z
        .boolean()
        .optional()
        .describe('Adds an X button so the user can permanently dismiss the banner.'),
      animateOnAppear: z
        .boolean()
        .optional()
        .describe('Slide the banner in instead of popping into place.'),
    })
    .optional(),
  containerTarget: representationTarget
    .optional()
    .describe(
      'The anchor element for the container/element-relative `placement` variants (top/bottom ' +
        'of it, or immediately before/after it). Required by those placements; ignored for ' +
        'top/bottom-of-page.',
    ),
  layout: z
    .object({
      maxContentWidth: z
        .number()
        .optional()
        .describe('Max width of the banner content, in pixels. Omit for no limit.'),
      maxEmbedWidth: z
        .number()
        .optional()
        .describe('Max width of the embed container, in pixels. Omit for no limit.'),
      borderRadius: z
        .number()
        .optional()
        .describe('Corner rounding in pixels. Omit for the theme default.'),
      outerMargin: z
        .object({
          top: z.number(),
          right: z.number(),
          bottom: z.number(),
          left: z.number(),
        })
        .optional()
        .describe('Space (in pixels) around the banner on all four sides.'),
    })
    .optional(),
});
export type RepresentationBanner = z.infer<typeof representationBanner>;

// ── announcement  (from AnnouncementData) ────────────────────────────────────
// The announcement-feed body: a title (required to publish), intro rich content,
// an optional "Read more" detail page, and the notification level. Announcements
// are delivered ONLY through a resource center that has an `announcement` block —
// they never render standalone.
export const representationAnnouncement = z
  .object({
    title: z
      .string()
      .optional()
      .describe(
        'Title shown in the feed row and the detail view. Required to publish — an untitled ' +
          "announcement would render a blank row. Seeded from the content's `name` at create, " +
          'then INDEPENDENT: renaming the content later does not update the title (and events/' +
          'analytics label by the content name, not this title).',
      ),
    introContent: z
      .array(representationBlock)
      .optional()
      .describe(
        'Rich content shown in the feed row (and in the popup, for `distribution: "popup"`). ' +
          'Same block vocabulary as flow steps MINUS questions: text / image / button / embed / ' +
          'columns. Button actions here: start_content / navigate / run_javascript only — no ' +
          'dismiss (feed items are marked seen, not dismissed) and no goto_step.',
      ),
    enableReadMore: z
      .boolean()
      .optional()
      .describe(
        'Adds a "Read more" button that opens a detail page rendered from `detailContent`.',
      ),
    readMoreLabel: z
      .string()
      .optional()
      .describe('Label of the "Read more" button (default "Read more").'),
    detailContent: z
      .array(representationBlock)
      .optional()
      .describe(
        'Full content of the "Read more" detail page — only rendered when `enableReadMore` is ' +
          'true. Same block rules as `introContent`.',
      ),
    distribution: z
      .enum(['silent', 'badge', 'popup'])
      .optional()
      .describe(
        'How loudly users are notified: `silent` = appears in the feed only; `badge` (default) = ' +
          'feed + unread-count badge on the resource-center launcher; `popup` = feed + badge + ' +
          'actively presented ONCE to each user (style per `popupConfig`). Only the newest unseen ' +
          'popup self-presents; it never re-shows after being seen.',
      ),
    popupConfig: z
      .object({
        style: z
          .enum(['modal', 'bubble'])
          .describe(
            '`modal` = centered modal with overlay; `bubble` = speech bubble anchored at the ' +
              'resource-center launcher.',
          ),
      })
      .optional()
      .describe(
        'Popup presentation — only USED when `distribution` is `popup` (stored and echoed under ' +
          'other distributions, taking effect if distribution later switches to popup). Omit for ' +
          'the default (bubble).',
      ),
  })
  .describe(
    'The announcement body (`data`). NOTE the "announcement time" is NOT in here — it is the ' +
      'version-level `scheduledAt` field on update_content_version (feed hides the announcement ' +
      'until it passes; publish stamps it when unset). Delivery requires a resource center with ' +
      'an `announcement` block published in the same environment.',
  );
export type RepresentationAnnouncement = z.infer<typeof representationAnnouncement>;

// ── union (selected by content type) ─────────────────────────────────────────
// resource-center lives in its own codec area (resource-center.*); referenced here
// only so the union type covers every non-flow body.
export const representationVersionData = z.union([
  representationTracker,
  representationChecklist,
  representationLauncher,
  representationBanner,
  representationAnnouncement,
  representationResourceCenter,
]);
export type RepresentationVersionData = z.infer<typeof representationVersionData>;

// Re-exported so the codec files share the leaf schemas without re-importing.
export { representationBlock, representationAction, representationCondition };
