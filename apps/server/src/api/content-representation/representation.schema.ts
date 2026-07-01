import { z } from 'zod';

import { ATTR_OPS } from './attr-ops';
import { ApiObjectType } from '../shared/object-type';

/**
 * The content representation schema — a stable, intent-level view of a step that
 * the decompiler produces from the internal `ContentEditorRoot[]` + step fields +
 * rules, and the compiler consumes for writes. See
 * docs/architecture/content-representation.md for the design + decisions, and
 * docs/conventions/content-representation-codec.md for the naming convention.
 */

// ── Targeting ──────────────────────────────────────────────────────────────
// A target is a CSS `selector` (required), optionally narrowed by the element's
// visible `text`, with `nth` to disambiguate when several elements match. This
// mirrors the only runtime path that resolves an API-authored target (finderV2's
// `manual` branch: querySelector + optional innerText check + nth). The internal
// "auto" selectors fingerprint is NOT authorable — an auto-only target decompiles
// to undefined + hasUnsupported.
export const representationTarget = z.object({
  selector: z
    .string()
    .min(1)
    .describe(
      'A stable CSS selector for the element. The runtime targets the FIRST match — so either ' +
        'make the selector unique, or pair a stable non-unique selector with `nth` to pick the ' +
        'intended match. A non-unique selector with no `nth` targets the first (often wrong) ' +
        "element and the tooltip silently won't render.",
    ),
  text: z
    .string()
    .optional()
    .describe(
      "Optional refinement of `selector`. Requires the targeted element's visible text to equal " +
        'this (exact match, after trim) — use it to pin a specific content/state (e.g. a stable ' +
        'id whose displayed text you want to match: id + text). It refines the element chosen by ' +
        '`selector`/`nth`; on its own it does NOT search among multiple matches, so disambiguate a ' +
        'non-unique selector with `nth`, not `text` alone.',
    ),
  nth: z
    .number()
    .int()
    .min(0)
    .max(4)
    .optional()
    .describe(
      'Optional refinement of `selector`. 0-based index to pick which match when the selector ' +
        "isn't unique — e.g. a stable selector matching 3 elements + `nth: 1` targets the 2nd, " +
        'giving a unique result. Matches are taken in document order (as they appear in the page ' +
        'HTML). Range 0–4 — only the first 5 matches are addressable; a larger value is rejected.',
    ),
});
export type RepresentationTarget = z.infer<typeof representationTarget>;

// ── Placement (simplified StepSettings) ──────────────────────────────────────
export const representationPlacement = z
  .union([
    z.object({
      side: z.enum(['top', 'right', 'bottom', 'left']),
      align: z.enum(['start', 'center', 'end']),
      sideOffset: z.number().optional(),
      alignOffset: z.number().optional(),
      // `auto` (default) lets the tooltip flip to avoid the viewport edge; `fixed`
      // pins it to the given side/align.
      alignType: z.enum(['auto', 'fixed']).optional(),
      // A tooltip may dim the page (backdrop) and block clicks on its target.
      backdrop: z.boolean().optional(),
      blockTarget: z.boolean().optional(),
    }),
    z.object({
      // 9-cell grid — matches ModalPosition (@usertour/types).
      position: z.enum([
        'leftTop',
        'centerTop',
        'rightTop',
        'leftCenter',
        'center',
        'rightCenter',
        'leftBottom',
        'centerBottom',
        'rightBottom',
      ]),
      offsetX: z.number().optional(),
      offsetY: z.number().optional(),
      backdrop: z.boolean().optional(),
      blockTarget: z.boolean().optional(),
    }),
  ])
  .describe(
    'Two placement shapes, by step kind: a TOOLTIP (anchored to a `target`) uses ' +
      '`{ side, align, sideOffset?, alignOffset?, alignType? }` positioned relative to the ' +
      'element; a MODAL or any anchorless step uses `{ position, offsetX?, offsetY? }` on a ' +
      '9-cell viewport grid (e.g. `"center"`). Both may set `backdrop` / `blockTarget`.',
  );
export type RepresentationPlacement = z.infer<typeof representationPlacement>;

// ── Rules: conditions ────────────────────────────────────────────────────────
export const stringOp = z.enum([
  'is',
  'not',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'match',
  'unmatch',
  'any',
  'empty',
]);
export type StringOp = z.infer<typeof stringOp>;

// Recursive predicate tree. `operators` and/or → group.match all/any.
/**
 * Attribute condition scoped to an EVENT's own attributes — only valid inside an
 * `event` condition's `where` (enforced by the schema: it's not in the general
 * condition union). Same shape as the `attribute` condition, but its `attribute`
 * resolves against event (bizType) attributes.
 */
export type EventAttributeCondition = {
  type: 'event_attribute';
  attribute: string;
  op: string;
  value?: string;
  value2?: string;
  values?: string[];
};
/** Parameterless: a checklist task completes when its item is clicked — only
 * valid in a checklist item's `completeWhen` (not in the general union). */
export type TaskClickedCondition = { type: 'task_clicked' };
/** What an event's `where` accepts: event-attribute conditions + groups of them. */
export type EventWhereCondition =
  | EventAttributeCondition
  | { type: 'group'; match: 'all' | 'any'; conditions: EventWhereCondition[] };

export type RepresentationCondition =
  | { type: 'group'; match: 'all' | 'any'; conditions: RepresentationCondition[] }
  | {
      type: 'attribute';
      scope: 'user' | 'company' | 'companyMembership';
      attribute: string;
      op: string;
      value?: string;
      value2?: string;
      values?: string[];
    }
  | { type: 'segment'; segment: string; in: boolean }
  | { type: 'current_url'; includes: string[]; excludes?: string[] }
  | {
      type: 'element';
      target?: RepresentationTarget;
      state: 'present' | 'hidden' | 'disabled' | 'enabled' | 'clicked' | 'unclicked';
    }
  | {
      type: 'flow';
      flow: string;
      state: 'seen' | 'unseen' | 'completed' | 'uncompleted' | 'active' | 'inactive';
    }
  | {
      type: 'event';
      event: string;
      count?: { op: 'at_least' | 'at_most' | 'exactly' | 'between'; n: number; n2?: number };
      within?: {
        op: 'in_the_last' | 'more_than' | 'between' | 'any_time';
        value?: number;
        value2?: number;
        unit?: 'seconds' | 'minutes' | 'hours' | 'days';
      };
      scope?: 'current_user' | 'current_user_in_company' | 'any_user_in_company';
      where?: EventWhereCondition[];
    }
  | { type: 'text_input'; target?: RepresentationTarget; op: StringOp; value?: string }
  | { type: 'text_filled'; target?: RepresentationTarget }
  | { type: 'time_window'; start?: string; end?: string }
  | { type: 'unsupported'; note?: string };

/**
 * A checklist item's completion conditions: any general condition PLUS the
 * parameterless `task_clicked`, allowed at any nesting — the builder lets a task
 * complete on "clicked OR <other condition>", so `task_clicked` may sit inside an
 * (OR) group alongside general conditions, not only at the top level.
 */
export type CompletionCondition =
  | RepresentationCondition
  | TaskClickedCondition
  | { type: 'group'; match: 'all' | 'any'; conditions: CompletionCondition[] };

/**
 * The full set the COMPILER may receive across all slots — the general union
 * plus the context-restricted `event_attribute` (event.where) and `task_clicked`
 * (checklist completeWhen, incl. nested in groups). Zod restricts each slot;
 * compile accepts the union.
 */
export type CompilableCondition =
  | RepresentationCondition
  | EventAttributeCondition
  | TaskClickedCondition
  | CompletionCondition;

// Context-restricted conditions (NOT in the general union — each is only valid
// in one slot, so misplacing them is a Zod error at the write boundary).
export const eventAttributeCondition = z.object({
  type: z.literal('event_attribute'),
  attribute: z.string(),
  op: z.enum(ATTR_OPS),
  value: z.string().optional(),
  value2: z.string().optional(),
  values: z.array(z.string()).optional(),
});
export const taskClickedCondition = z.object({ type: z.literal('task_clicked') });
/** An event's `where` accepts only event-attribute conditions + groups of them. */
export const eventWhereCondition: z.ZodType<EventWhereCondition> = z.lazy(() =>
  z.union([
    eventAttributeCondition,
    z.object({
      type: z.literal('group'),
      match: z.enum(['all', 'any']),
      conditions: z.array(eventWhereCondition),
    }),
  ]),
) as unknown as z.ZodType<EventWhereCondition>;

// The `attribute` condition — a condition on a user / company / companyMembership
// attribute. `scope` is REQUIRED: a codeName can exist in more than one scope (the
// built-in `signed_up_at` / `first_seen_at` / `last_seen_at` / `name` exist for both
// user and company), so it — not the bare codeName — picks which attribute resolves.
const attributeConditionFields = {
  scope: z
    .enum(['user', 'company', 'companyMembership'])
    .describe(
      'Which entity owns the attribute — `user` (the end user), `company`, or ' +
        "`companyMembership`. Same value as the attribute definition's `scope` " +
        '(list_attribute_definitions); required to disambiguate a codeName that exists ' +
        'in more than one scope.',
    ),
  attribute: z.string(),
  op: z
    .enum(ATTR_OPS)
    .describe(
      'Operator — the allowed set depends on the attribute dataType. ' +
        'String: is | not | contains | not_contains | starts_with | ends_with | any | empty. ' +
        'Number: is | not | lt | lte | gt | gte | between | any | empty. ' +
        'Boolean: true | false | any | empty. ' +
        'List: includes_any | includes_all | not_includes_any | not_includes_all | any | empty. ' +
        'DateTime: less_than | exactly | more_than (relative "days ago" — `value` is a number ' +
        'of days; e.g. attribute `first_seen_at` with op `less_than`, value `7` = "first seen ' +
        'in the last 7 days", the canonical new-user filter) | before | on | after (`value` ' +
        'is an absolute date) | any | empty. The relative ops (less_than / more_than / exactly) ' +
        'are DAY-granularity only — `value` is a whole number of days and there is no unit field; ' +
        'for hour/minute windows use an `event` condition with a `within` (which has a `unit`).',
    ),
  value: z
    .string()
    .optional()
    .describe(
      'The comparison value (string / number-as-string / date). Omit for any/empty/true/false.',
    ),
  value2: z
    .string()
    .optional()
    .describe('Upper bound for the `between` operator (`value` is the lower bound).'),
  values: z
    .array(z.string())
    .optional()
    .describe('Values for the List operators (includes_any / includes_all / …).'),
};

export const representationCondition = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('group'),
      match: z.enum(['all', 'any']),
      conditions: z.array(representationCondition),
    }),
    // attribute condition (user / company / companyMembership — see `scope`).
    z.object({ type: z.literal('attribute'), ...attributeConditionFields }),
    z.object({ type: z.literal('segment'), segment: z.string(), in: z.boolean() }),
    z.object({
      type: z.literal('current_url'),
      includes: z
        .array(z.string())
        .describe(
          'URL patterns (anchored whole-url match, NOT substring/regex). `*` = wildcard within ' +
            'one url part; `:name` = one path segment. A bare `*` (i.e. `["*"]`) matches EVERY ' +
            'page on every host incl. deep paths — the canonical always-on / whole-site pattern ' +
            '(use it when content should be available everywhere). Scope it down instead with: ' +
            '`*/` (homepage only — path exactly `/`), `*/pricing` (one page), `*/app/*` (a ' +
            'section + below), `host.com/*` (any page on a specific host). Multiple patterns are ' +
            'OR-matched: the URL matches this list if it matches ANY one pattern (so "/tasks OR ' +
            '/dashboard" is one condition with both patterns here — no group needed).',
        ),
      excludes: z
        .array(z.string())
        .optional()
        .describe('URL patterns to exclude (same syntax as includes); excludes win over includes.'),
    }),
    z.object({
      type: z.literal('element'),
      target: representationTarget.optional(),
      state: z.enum(['present', 'hidden', 'disabled', 'enabled', 'clicked', 'unclicked']),
    }),
    z.object({
      type: z.literal('flow'),
      flow: z
        .string()
        .describe(
          'contentId of the content whose lifecycle state to check — despite the `flow` key name ' +
            'this gates on ANY content type (flow, checklist, banner, launcher, resource-center), ' +
            'e.g. start a tour only after a banner has been `seen` (from list_content).',
        ),
      state: z
        .enum(['seen', 'unseen', 'completed', 'uncompleted', 'active', 'inactive'])
        .describe(
          "The referenced content's state for THIS user (any content type, not only flows). seen = started at least once (TRUE from the " +
            'moment it opens); unseen = never started; active = currently open/running; inactive = ' +
            'NOT currently running (covers both never-started and ran-then-closed); completed = ' +
            'reached a goal/completion step; uncompleted = not completed. To gate piece B until flow ' +
            'A has run AND closed (the usual "show next thing after the welcome flow" sequencing), ' +
            'use `seen` AND `inactive` together — `seen` alone fires while A is still open (B piles ' +
            'on top), and `completed` alone strands users who skip/dismiss A.',
        ),
    }),
    z.object({
      type: z.literal('event'),
      event: z.string(),
      count: z
        .object({
          op: z.enum(['at_least', 'at_most', 'exactly', 'between']),
          n: z.number(),
          n2: z.number().optional(),
        })
        .optional()
        .describe(
          'How many times the event must have occurred. Omit it for the common case "the event ' +
            'has happened" (treated as at_least 1). Set `op`/`n` for a threshold (`between` needs ' +
            '`n` and `n2`).',
        ),
      within: z
        .object({
          op: z.enum(['in_the_last', 'more_than', 'between', 'any_time']),
          value: z.number().optional(),
          value2: z.number().optional(),
          unit: z.enum(['seconds', 'minutes', 'hours', 'days']).optional(),
        })
        .optional()
        .describe(
          'Optional time window for the event count. Omit it (or use `any_time`) to count over ' +
            'all time — "the event has ever happened". Any other `op` (`in_the_last` / `more_than` ' +
            '/ `between`) requires BOTH `value` and `unit` (a windowed op with no `unit` is ' +
            'rejected — the runtime would otherwise silently assume days); `between` also needs ' +
            '`value2`.',
        ),
      scope: z
        .enum(['current_user', 'current_user_in_company', 'any_user_in_company'])
        .optional()
        .describe(
          'Whose event activity to count (default `current_user`). `current_user` = only this ' +
            "user's own events. `current_user_in_company` = this user's events, but counted within " +
            'their currently-associated company context (needs the user associated to a company via ' +
            '`group()` / add_company_member). `any_user_in_company` = events by ANY user in this ' +
            'user\'s company — account-level activity (e.g. "anyone on the account has done X"). ' +
            'The two company scopes require the user to be in a company or they never match.',
        ),
      where: z.array(eventWhereCondition).optional(),
    }),
    z.object({
      type: z.literal('text_input'),
      target: representationTarget.optional(),
      op: stringOp,
      value: z.string().optional(),
    }),
    z.object({ type: z.literal('text_filled'), target: representationTarget.optional() }),
    z.object({
      type: z.literal('time_window'),
      start: z.string().optional(),
      end: z.string().optional(),
    }),
    z.object({ type: z.literal('unsupported'), note: z.string().optional() }),
  ]),
) as unknown as z.ZodType<RepresentationCondition>;

/**
 * Checklist completion conditions: the general union + `task_clicked`, with
 * `task_clicked` allowed at any nesting (a group's children are themselves
 * completion conditions, so "clicked OR url-is-X" round-trips).
 */
export const completeWhenCondition: z.ZodType<CompletionCondition> = z.lazy(() =>
  z.union([
    taskClickedCondition,
    z.object({
      type: z.literal('group'),
      match: z.enum(['all', 'any']),
      conditions: z.array(completeWhenCondition),
    }),
    representationCondition,
  ]),
) as unknown as z.ZodType<CompletionCondition>;

// ── Rules: actions ───────────────────────────────────────────────────────────
export const representationAction = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('goto_step'),
    step: z
      .string()
      .describe(
        'Target step: a step `key` declared elsewhere in the same write, or an existing step cvid. ' +
          'Resolved server-side to the cvid.',
      ),
  }),
  z.object({
    type: z.literal('start_flow'),
    flow: z
      .string()
      .describe(
        'contentId of the flow OR checklist to launch (from list_content) — a raw content id, NOT ' +
          'a step key (unlike goto_step). Must reference a flow or checklist (a banner / launcher / ' +
          'resource-center / tracker is rejected at write). The target must be PUBLISHED to actually ' +
          'start at runtime; an unknown/dangling id is rejected at validate.',
      ),
    step: z
      .string()
      .optional()
      .describe('Optional cvid of a step within the launched flow to start at.'),
  }),
  z.object({
    type: z.literal('navigate'),
    url: z.string(),
    newTab: z.boolean().optional(),
    newWindow: z.boolean().optional(),
  }),
  z.object({ type: z.literal('dismiss') }),
  // read-only; the write validator rejects this type (no AI/API-injected JS)
  z.object({ type: z.literal('run_javascript'), script: z.string() }),
  z.object({ type: z.literal('unsupported'), note: z.string().optional() }),
]);
export type RepresentationAction = z.infer<typeof representationAction>;

export const representationTrigger = z.object({
  when: z.array(representationCondition).optional(),
  do: z.array(representationAction),
  waitMs: z.number().optional(),
});
export type RepresentationTrigger = z.infer<typeof representationTrigger>;

// ── Questions ────────────────────────────────────────────────────────────────
// Shared across all question kinds. Answers are ALWAYS captured as a response
// event; `bindAttribute` is the extra write that also stores the answer on a user
// attribute for targeting/segmentation.
const bindAttributeField = z
  .string()
  .optional()
  .describe(
    'Optional: codeName of an EXISTING attribute (create it first with create_attribute_definition) ' +
      'to ALSO save this answer onto the user for targeting/segmentation — use the codeName, NOT the ' +
      "id. It is NOT validated: a wrong/typo'd code still publishes and then silently captures nothing. " +
      'Match the attribute dataType to the answer: number (nps / rating), string (single-select choice), ' +
      'list (multi-select choice). Leaving it unset still records the answer as a response event — bind ' +
      'only when you need to target/segment on it.',
  );

// The question's identifier / analytics label — NOT the visible prompt.
const questionNameField = z
  .string()
  .describe(
    "The question's internal name / analytics label (it is the `questionName` on captured " +
      'responses). It is NOT rendered to the user — the widget shows only the input (scale / ' +
      'options / text field), not this string. To show a visible question prompt, add a `text` ' +
      'block in the SAME step before the question block; a question with only a `name` renders ' +
      'as bare options with no question text.',
  );

export const representationQuestion = z.union([
  z.object({
    kind: z.literal('nps'),
    name: questionNameField,
    cvid: z.string().optional(),
    lowLabel: z.string().optional(),
    highLabel: z.string().optional(),
    bindAttribute: bindAttributeField,
  }),
  z.object({
    kind: z.literal('rating'),
    name: questionNameField,
    cvid: z.string().optional(),
    style: z
      .enum(['star', 'scale'])
      .describe(
        'star = star rating; scale = a numeric scale. A "scale" question IS a rating with ' +
          'style:"scale" — there is no separate "scale" kind.',
      ),
    range: z
      .object({ low: z.number(), high: z.number() })
      .describe('Numeric range, e.g. { low: 1, high: 5 }.'),
    default: z.number().optional(),
    lowLabel: z.string().optional(),
    highLabel: z.string().optional(),
    bindAttribute: bindAttributeField,
  }),
  z.object({
    kind: z.literal('text'),
    name: questionNameField,
    cvid: z.string().optional(),
    multiline: z.boolean(),
    placeholder: z.string().optional(),
    buttonText: z.string().optional(),
    required: z
      .boolean()
      .optional()
      .describe(
        'Require an answer before submit. ONLY `text` supports this — nps / rating / choice cannot ' +
          'be marked required.',
      ),
    bindAttribute: bindAttributeField,
  }),
  z.object({
    kind: z.literal('choice'),
    name: questionNameField,
    cvid: z.string().optional(),
    options: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .describe(
        'Each option has a human-facing `label` and a stored `value` — the `value` is what gets ' +
          'recorded/bound as the answer.',
      ),
    allowMultiple: z
      .boolean()
      .describe(
        'false = single-select, true = multi-select. A multi-select answer needs a `list`-typed ' +
          'bound attribute.',
      ),
    enableOther: z.boolean().optional(),
    otherPlaceholder: z.string().optional(),
    shuffle: z.boolean().optional(),
    buttonText: z.string().optional(),
    bindAttribute: bindAttributeField,
  }),
]);
export type RepresentationQuestion = z.infer<typeof representationQuestion>;

// ── Content blocks ───────────────────────────────────────────────────────────
// `id` is the round-trip merge key (maps a block to its internal element so
// untouched styling survives a write).
export type RepresentationBlock =
  | { object: ApiObjectType.BLOCK; id?: string; type: 'text'; markdown: string }
  | {
      object: ApiObjectType.BLOCK;
      id?: string;
      type: 'image';
      url: string;
      alt?: string;
      link?: { url: string; newTab?: boolean };
      width?: RepresentationWidth;
      margin?: RepresentationSpacing;
    }
  | {
      object: ApiObjectType.BLOCK;
      id?: string;
      type: 'button';
      text: string;
      actions?: RepresentationAction[];
      disabledWhen?: RepresentationCondition[];
      hiddenWhen?: RepresentationCondition[];
      variant?: 'primary' | 'secondary';
      margin?: RepresentationSpacing;
    }
  | {
      object: ApiObjectType.BLOCK;
      id?: string;
      type: 'embed';
      url: string;
      width?: RepresentationWidth;
      height?: RepresentationWidth;
      margin?: RepresentationSpacing;
    }
  | {
      object: ApiObjectType.BLOCK;
      id?: string;
      type: 'question';
      question: RepresentationQuestion;
      actions?: RepresentationAction[];
    }
  | {
      object: ApiObjectType.BLOCK;
      id?: string;
      type: 'columns';
      columns: {
        width?: RepresentationWidth;
        justify?: ColumnJustify;
        align?: ColumnAlign;
        padding?: RepresentationSpacing;
        blocks: RepresentationBlock[];
      }[];
    }
  | { object: ApiObjectType.BLOCK; id?: string; type: 'unsupported'; note?: string };

/** Element/column dimension. `fill` (column only) means flex-grow. */
export type RepresentationWidth = { unit: 'percent' | 'pixels' | 'fill'; value?: number };
/** Margin/padding box; omitted sides inherit the theme/default. */
export type RepresentationSpacing = {
  enabled?: boolean;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};
export type ColumnJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
export type ColumnAlign = 'start' | 'center' | 'end' | 'baseline';

const blockBase = {
  // Present on read; optional on write input (defaulted) so clients needn't echo it.
  object: z.literal(ApiObjectType.BLOCK).default(ApiObjectType.BLOCK),
  id: z.string().optional(),
};
// A dimension can't be negative (invalid CSS — the renderer ignores it). A
// percent over 100 IS valid CSS (renders as overflow); the builder clamps it as
// a UX nicety, but that's not a data-validity rule, so v2 accepts it. `fill`
// ignores `value`.
const widthShape = z
  .object({
    unit: z.enum(['percent', 'pixels', 'fill']),
    value: z.number().nonnegative().optional(),
  })
  .optional();
// Image and embed blocks only support fixed sizing (percent / pixels) — the builder
// offers no `fill` for them and the widget renderer only reads percent/pixels, so a
// `fill` image/embed would silently render at 0 / its raw value. `fill` (flex-grow)
// is a COLUMN-only unit; keep it on `widthShape` for columns and use this narrower
// shape for image/embed width & height.
const mediaWidthShape = z
  .object({
    unit: z.enum(['percent', 'pixels']),
    value: z.number().nonnegative().optional(),
  })
  .optional();
const spacingShape = z
  .object({
    enabled: z.boolean().optional(),
    top: z.number().optional(),
    bottom: z.number().optional(),
    left: z.number().optional(),
    right: z.number().optional(),
  })
  .optional();
const columnJustify = z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']);
const columnAlign = z.enum(['start', 'center', 'end', 'baseline']);
export const representationBlock = z.lazy(() =>
  z.union([
    z.object({
      ...blockBase,
      type: z.literal('text'),
      markdown: z
        .string()
        .describe(
          'A small markdown subset: paragraphs, `# `/`## ` headings (h1/h2 only — no h3+), ' +
            '`-`/`*` and `1.` lists, ``` code fences; inline `**bold**`, `*italic*`, ' +
            '`[text](url)`, and `{{ attribute_code | default: "x" }}` for user attributes. ' +
            'Anything outside this subset is SILENTLY normalized, not rejected: h3+ → h2; ' +
            'blockquotes flatten to paragraphs; tables, horizontal rules, strikethrough, inline ' +
            'images/code, and liquid filters other than `default` are dropped. Unsupported ' +
            "syntax won't round-trip — don't rely on it.",
        ),
    }),
    z.object({
      ...blockBase,
      type: z.literal('image'),
      url: z.string().min(1, 'An image block needs a non-empty url.'),
      alt: z.string().optional(),
      link: z.object({ url: z.string(), newTab: z.boolean().optional() }).optional(),
      width: mediaWidthShape,
      margin: spacingShape,
    }),
    z.object({
      ...blockBase,
      type: z.literal('button'),
      text: z.string(),
      actions: z.array(representationAction).optional(),
      disabledWhen: z.array(representationCondition).optional(),
      hiddenWhen: z.array(representationCondition).optional(),
      variant: z.enum(['primary', 'secondary']).optional(),
      margin: spacingShape,
    }),
    z.object({
      ...blockBase,
      type: z.literal('embed'),
      url: z.string().min(1, 'An embed block needs a non-empty url.'),
      width: mediaWidthShape,
      height: mediaWidthShape,
      margin: spacingShape,
    }),
    z.object({
      ...blockBase,
      type: z.literal('question'),
      question: representationQuestion,
      actions: z
        .array(representationAction)
        .optional()
        .describe(
          'Actions that fire when this question is answered (on pick for nps/rating/single-select; ' +
            'on its Submit button for text/multi-select). Put a `goto_step` HERE to advance to the next ' +
            'step — without it the question records the answer but the flow does NOT advance (validate ' +
            'flags the next step "not reachable"). Do NOT add a separate `button` block just to advance: ' +
            "it doubles up with the question's own submit affordance.",
        ),
    }),
    z.object({
      ...blockBase,
      type: z.literal('columns'),
      columns: z.array(
        z.object({
          width: widthShape,
          justify: columnJustify.optional(),
          align: columnAlign.optional(),
          padding: spacingShape,
          blocks: z.array(representationBlock),
        }),
      ),
    }),
    z.object({ ...blockBase, type: z.literal('unsupported'), note: z.string().optional() }),
  ]),
) as unknown as z.ZodType<RepresentationBlock>;

// ── Step ─────────────────────────────────────────────────────────────────────
export const representationStep = z.object({
  object: z.literal(ApiObjectType.STEP),
  id: z.string(),
  /** Front-end logical id — the write upsert key. Round-trips on read. */
  cvid: z.string().nullable(),
  name: z.string(),
  /** tooltip | modal | bubble | hidden */
  type: z.string(),
  sequence: z.number(),
  /** Per-step theme override; null = inherit the version (flow) theme. */
  themeId: z.string().nullable(),
  target: representationTarget.optional(),
  placement: representationPlacement.optional(),
  width: z.number().optional(),
  skippable: z.boolean().optional(),
  /** Marks this step as an explicit completion point for the flow. */
  explicitCompletionStep: z.boolean().optional(),
  content: z.array(representationBlock),
  triggers: z.array(representationTrigger).optional(),
  /** Actions run when the user clicks the step's target element (click-to-advance). */
  onClick: z.array(representationAction).optional(),
  advanced: z.object({ hasUnsupported: z.boolean() }).optional(),
});
export type RepresentationStep = z.infer<typeof representationStep>;

// ── Version-level start / hide rules ─────────────────────────────────────────
const durationUnit = z.enum(['seconds', 'minutes', 'hours', 'days']);
export const representationStartRules = z.object({
  when: z.array(representationCondition),
  frequency: z
    .object({
      mode: z
        .enum(['once', 'multiple', 'unlimited'])
        .describe(
          'once = show a single time; multiple = up to N times per window; unlimited = every time the conditions match (subject to `every`).',
        ),
      every: z
        .object({ times: z.number().optional(), duration: z.number(), unit: durationUnit })
        .optional()
        .describe(
          'Re-show window. Used by `multiple` (with `times`) and `unlimited`; ignored for `once`. If omitted for those modes a default window is applied. Manual and programmatic starts also count toward the `multiple` limit.',
        ),
      atLeast: z
        .object({ duration: z.number(), unit: durationUnit })
        .optional()
        .describe(
          'Only auto-start if no other content has been shown within this window — avoids showing a user too many at once.',
        ),
    })
    .optional(),
  priority: z
    .enum(['highest', 'high', 'medium', 'low', 'lowest'])
    .optional()
    .describe(
      'Tie-breaker when a user matches the start conditions for more than one piece of content at ' +
        'the same time — the higher priority starts first.',
    ),
  waitMs: z
    .number()
    .optional()
    .describe(
      'Delay in milliseconds between the conditions matching and the start firing. The conditions ' +
        'must keep matching for the entire wait, or it will not start.',
    ),
  startIfNotComplete: z
    .boolean()
    .optional()
    .describe("When true, this content won't auto-start for users who have already completed it."),
});
export type RepresentationStartRules = z.infer<typeof representationStartRules>;

export const representationHideRules = z.object({ when: z.array(representationCondition) });
export type RepresentationHideRules = z.infer<typeof representationHideRules>;

// ── Write input ──────────────────────────────────────────────────────────────
// A lenient step shape for writes: `id` is the merge key — provide the server-
// assigned step id to update an existing step, omit it to create a new one. The
// internal `cvid` is server-owned and never accepted here (preserved on update,
// generated on create). `sequence` defaults to the array position.
export const representationStepInput = z.object({
  id: z
    .string()
    .optional()
    .describe(
      'Primary id of an existing step to update in place. It is regenerated when you fork a ' +
        'version (create_content_version), so for edits that must survive a fork prefer `cvid`.',
    ),
  cvid: z
    .string()
    .optional()
    .describe(
      'Stable step handle that survives forking (create_content_version): echo it to update an ' +
        'existing step in place without re-reading new ids. A step is matched by `id` first, then ' +
        '`cvid`; omit both to create a new step.',
    ),
  key: z
    .string()
    .optional()
    .describe(
      'Optional author-chosen handle for wiring "go to step" actions within this request ' +
        '(unique among the steps you send). A button action can set `step` to this key to target ' +
        'this step even before it exists. Write-only — not stored, not returned on read.',
    ),
  name: z.string(),
  type: z
    .enum(['tooltip', 'modal', 'hidden', 'bubble'])
    .describe('Step kind. Only `tooltip` anchors to a target element; the rest are page-level.'),
  sequence: z.number().optional(),
  themeId: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Per-step theme override. Omit to keep the current value; set to a theme id ' +
        '(from list_themes) to override; set to null to clear and inherit the flow theme.',
    ),
  target: representationTarget.optional(),
  placement: representationPlacement.optional(),
  width: z.number().optional(),
  skippable: z.boolean().optional(),
  explicitCompletionStep: z
    .boolean()
    .optional()
    .describe('Marks this step as an explicit completion point — reaching it completes the flow.'),
  content: z.array(representationBlock).default([]),
  triggers: z.array(representationTrigger).optional(),
  onClick: z
    .array(representationAction)
    .optional()
    .describe(
      "Actions to run when the user clicks the step's target element (click-to-advance). " +
        'Tooltip steps with a `target` only.',
    ),
});
export type RepresentationStepInput = z.infer<typeof representationStepInput>;

// ── Version resource shapes (v2 GET projection) ──────────────────────────────
// The content-version resource embeds representation: decompiled `steps` plus the
// version-level start / hide rules. These shapes live here (not in content.schema)
// because the embedded payload IS representation — keeping content ⊥ content-versions.
export const question = z.object({
  object: z.literal(ApiObjectType.QUESTION),
  cvid: z.string(),
  name: z.string(),
  type: z.string(),
});

export const contentVersion = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.CONTENT_VERSION),
  number: z.number(),
  themeId: z.string().nullable(),
  questions: z.array(question).nullable(),
  /** Decompiled steps — only present when the `steps` expand is requested. */
  steps: z.array(representationStep).optional(),
  /** Auto-start rules (present on the standalone content-versions endpoint). */
  startRules: representationStartRules.optional(),
  /** Hide rules (present on the standalone content-versions endpoint). */
  hideRules: representationHideRules.optional(),
  /**
   * Decompiled type-specific body for non-flow content (checklist / launcher /
   * banner / tracker / resource-center) — only present when the `data` expand is
   * requested. Shape is determined by the content type.
   */
  data: z.unknown().optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

export type ContentVersion = z.infer<typeof contentVersion>;
export type Question = z.infer<typeof question>;
