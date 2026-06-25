import { z } from 'zod';

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
  selector: z.string().min(1).describe('A stable CSS selector for the element in your app.'),
  text: z
    .string()
    .optional()
    .describe(
      'Optional visible text the matched element must contain — narrows the selector match (selector + text). Omit to match by selector alone.',
    ),
  nth: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('0-based index of the match to use when the selector resolves to multiple elements.'),
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
 * condition union). Same shape as user_attribute, but its `attribute` resolves
 * against event (bizType) attributes.
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
      type: 'user_attribute';
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
  op: z.string(),
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

export const representationCondition = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('group'),
      match: z.enum(['all', 'any']),
      conditions: z.array(representationCondition),
    }),
    z.object({
      type: z.literal('user_attribute'),
      attribute: z.string(),
      op: z
        .string()
        .describe(
          'Operator — the allowed set depends on the attribute dataType. ' +
            'String: is | not | contains | notContain | startsWith | endsWith | any | empty. ' +
            'Number: is | not | isLessThan | isLessThanOrEqualTo | isGreaterThan | ' +
            'isGreaterThanOrEqualTo | between | any | empty. ' +
            'Boolean: true | false | any | empty. ' +
            'List: includesAtLeastOne | includesAll | notIncludesAtLeastOne | notIncludesAll | ' +
            'any | empty. ' +
            'DateTime: lessThan | exactly | moreThan (relative "days ago" — `value` is a number ' +
            'of days; e.g. attribute `first_seen_at` with op `lessThan`, value `7` = "first seen ' +
            'in the last 7 days", the canonical new-user filter) | before | on | after (`value` ' +
            'is an absolute date) | any | empty.',
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
        .describe('Values for the List operators (includesAtLeastOne / includesAll / …).'),
    }),
    z.object({ type: z.literal('segment'), segment: z.string(), in: z.boolean() }),
    z.object({
      type: z.literal('current_url'),
      includes: z
        .array(z.string())
        .describe(
          'URL patterns (anchored whole-url match, NOT substring/regex). `*` = wildcard within ' +
            'one url part; `:name` = one path segment. Omitting the path matches EVERY path (the ' +
            'whole site) — scope it: `*/` (homepage only), `*/pricing` (one page), `*/app/*` (a ' +
            'section + below), `host.com/*` (any page on a host).',
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
      flow: z.string(),
      state: z.enum(['seen', 'unseen', 'completed', 'uncompleted', 'active', 'inactive']),
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
        .optional(),
      within: z
        .object({
          op: z.enum(['in_the_last', 'more_than', 'between', 'any_time']),
          value: z.number().optional(),
          value2: z.number().optional(),
          unit: z.enum(['seconds', 'minutes', 'hours', 'days']).optional(),
        })
        .optional(),
      scope: z.enum(['current_user', 'current_user_in_company', 'any_user_in_company']).optional(),
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
export const representationAction = z.union([
  z.object({
    type: z.literal('goto_step'),
    step: z
      .string()
      .describe(
        'Target step: a step `key` declared elsewhere in the same write, or an existing step cvid. ' +
          'Resolved server-side to the cvid.',
      ),
  }),
  z.object({ type: z.literal('start_flow'), flow: z.string(), step: z.string().optional() }),
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
export const representationQuestion = z.union([
  z.object({
    kind: z.literal('nps'),
    name: z.string(),
    cvid: z.string().optional(),
    lowLabel: z.string().optional(),
    highLabel: z.string().optional(),
    bindAttribute: z.string().optional(),
  }),
  z.object({
    kind: z.literal('rating'),
    name: z.string(),
    cvid: z.string().optional(),
    style: z.enum(['star', 'scale']),
    range: z.object({ low: z.number(), high: z.number() }),
    default: z.number().optional(),
    lowLabel: z.string().optional(),
    highLabel: z.string().optional(),
    bindAttribute: z.string().optional(),
  }),
  z.object({
    kind: z.literal('text'),
    name: z.string(),
    cvid: z.string().optional(),
    multiline: z.boolean(),
    placeholder: z.string().optional(),
    buttonText: z.string().optional(),
    required: z.boolean().optional(),
    bindAttribute: z.string().optional(),
  }),
  z.object({
    kind: z.literal('choice'),
    name: z.string(),
    cvid: z.string().optional(),
    options: z.array(z.object({ label: z.string(), value: z.string() })),
    allowMultiple: z.boolean(),
    enableOther: z.boolean().optional(),
    otherPlaceholder: z.string().optional(),
    shuffle: z.boolean().optional(),
    buttonText: z.string().optional(),
    bindAttribute: z.string().optional(),
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
            '`[text](url)`, and `{{ attribute_code | default: "x" }}` for user attributes.',
        ),
    }),
    z.object({
      ...blockBase,
      type: z.literal('image'),
      url: z.string(),
      alt: z.string().optional(),
      link: z.object({ url: z.string(), newTab: z.boolean().optional() }).optional(),
      width: widthShape,
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
      url: z.string(),
      width: widthShape,
      height: widthShape,
      margin: spacingShape,
    }),
    z.object({
      ...blockBase,
      type: z.literal('question'),
      question: representationQuestion,
      actions: z.array(representationAction).optional(),
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
          'Re-show window. Used by `multiple` (with `times`) and `unlimited`; ignored for `once`. If omitted for those modes a default window is applied.',
        ),
      atLeast: z.object({ duration: z.number(), unit: durationUnit }).optional(),
    })
    .optional(),
  priority: z.enum(['highest', 'high', 'medium', 'low', 'lowest']).optional(),
  waitMs: z.number().optional(),
  startIfNotComplete: z.boolean().optional(),
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
