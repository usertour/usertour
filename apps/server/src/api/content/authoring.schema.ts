import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';

/**
 * The authoring/representation schema — a stable, intent-level view of a step
 * that the decompiler produces from the internal `ContentEditorRoot[]` + step
 * fields + rules, and (later) the compiler consumes for writes. See
 * AUTHORING_SCHEMA.md for the design + decisions.
 */

// ── Targeting ──────────────────────────────────────────────────────────────
// The internal "auto" selectors fingerprint is NOT authorable; only selector /
// text are modeled (an auto-only target decompiles to undefined + hasUnsupported).
export const authoringTarget = z.union([
  z.object({ by: z.literal('selector'), selector: z.string(), nth: z.number().optional() }),
  z.object({ by: z.literal('text'), text: z.string() }),
]);
export type AuthoringTarget = z.infer<typeof authoringTarget>;

// ── Placement (simplified StepSettings) ──────────────────────────────────────
export const authoringPlacement = z.union([
  z.object({
    side: z.enum(['top', 'right', 'bottom', 'left']),
    align: z.enum(['start', 'center', 'end']),
    sideOffset: z.number().optional(),
    alignOffset: z.number().optional(),
  }),
  z.object({
    position: z.enum(['center', 'top', 'bottom', 'left', 'right']),
    offsetX: z.number().optional(),
    offsetY: z.number().optional(),
    backdrop: z.boolean().optional(),
    blockTarget: z.boolean().optional(),
  }),
]);
export type AuthoringPlacement = z.infer<typeof authoringPlacement>;

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
export type AuthoringCondition =
  | { type: 'group'; match: 'all' | 'any'; conditions: AuthoringCondition[] }
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
      target?: AuthoringTarget;
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
      where?: AuthoringCondition[];
    }
  | { type: 'text_input'; target?: AuthoringTarget; op: StringOp; value?: string }
  | { type: 'text_filled'; target?: AuthoringTarget }
  | { type: 'time_window'; start?: string; end?: string }
  | { type: 'unsupported'; note?: string };

export const authoringCondition = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('group'),
      match: z.enum(['all', 'any']),
      conditions: z.array(authoringCondition),
    }),
    z.object({
      type: z.literal('user_attribute'),
      attribute: z.string(),
      op: z.string(),
      value: z.string().optional(),
      value2: z.string().optional(),
      values: z.array(z.string()).optional(),
    }),
    z.object({ type: z.literal('segment'), segment: z.string(), in: z.boolean() }),
    z.object({
      type: z.literal('current_url'),
      includes: z.array(z.string()),
      excludes: z.array(z.string()).optional(),
    }),
    z.object({
      type: z.literal('element'),
      target: authoringTarget.optional(),
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
      where: z.array(authoringCondition).optional(),
    }),
    z.object({
      type: z.literal('text_input'),
      target: authoringTarget.optional(),
      op: stringOp,
      value: z.string().optional(),
    }),
    z.object({ type: z.literal('text_filled'), target: authoringTarget.optional() }),
    z.object({
      type: z.literal('time_window'),
      start: z.string().optional(),
      end: z.string().optional(),
    }),
    z.object({ type: z.literal('unsupported'), note: z.string().optional() }),
  ]),
) as unknown as z.ZodType<AuthoringCondition>;

// ── Rules: actions ───────────────────────────────────────────────────────────
export const authoringAction = z.union([
  z.object({ type: z.literal('goto_step'), step: z.string() }),
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
export type AuthoringAction = z.infer<typeof authoringAction>;

export const authoringTrigger = z.object({
  when: z.array(authoringCondition).optional(),
  do: z.array(authoringAction),
  waitMs: z.number().optional(),
});
export type AuthoringTrigger = z.infer<typeof authoringTrigger>;

// ── Questions ────────────────────────────────────────────────────────────────
export const authoringQuestion = z.union([
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
export type AuthoringQuestion = z.infer<typeof authoringQuestion>;

// ── Content blocks ───────────────────────────────────────────────────────────
// `id` is the round-trip merge key (maps a block to its internal element so
// untouched styling survives a write).
export type AuthoringBlock =
  | { object: ApiObjectType.BLOCK; id?: string; type: 'text'; markdown: string }
  | {
      object: ApiObjectType.BLOCK;
      id?: string;
      type: 'image';
      url: string;
      alt?: string;
      link?: { url: string; newTab?: boolean };
    }
  | {
      object: ApiObjectType.BLOCK;
      id?: string;
      type: 'button';
      text: string;
      actions?: AuthoringAction[];
      disabledWhen?: AuthoringCondition[];
      hiddenWhen?: AuthoringCondition[];
      variant?: 'primary' | 'secondary';
    }
  | { object: ApiObjectType.BLOCK; id?: string; type: 'embed'; url: string }
  | {
      object: ApiObjectType.BLOCK;
      id?: string;
      type: 'question';
      question: AuthoringQuestion;
      actions?: AuthoringAction[];
    }
  | {
      object: ApiObjectType.BLOCK;
      id?: string;
      type: 'columns';
      columns: {
        width?: { unit: 'percent' | 'pixels' | 'fill'; value?: number };
        blocks: AuthoringBlock[];
      }[];
    }
  | { object: ApiObjectType.BLOCK; id?: string; type: 'unsupported'; note?: string };

const blockBase = { object: z.literal(ApiObjectType.BLOCK), id: z.string().optional() };
export const authoringBlock = z.lazy(() =>
  z.union([
    z.object({ ...blockBase, type: z.literal('text'), markdown: z.string() }),
    z.object({
      ...blockBase,
      type: z.literal('image'),
      url: z.string(),
      alt: z.string().optional(),
      link: z.object({ url: z.string(), newTab: z.boolean().optional() }).optional(),
    }),
    z.object({
      ...blockBase,
      type: z.literal('button'),
      text: z.string(),
      actions: z.array(authoringAction).optional(),
      disabledWhen: z.array(authoringCondition).optional(),
      hiddenWhen: z.array(authoringCondition).optional(),
      variant: z.enum(['primary', 'secondary']).optional(),
    }),
    z.object({ ...blockBase, type: z.literal('embed'), url: z.string() }),
    z.object({
      ...blockBase,
      type: z.literal('question'),
      question: authoringQuestion,
      actions: z.array(authoringAction).optional(),
    }),
    z.object({
      ...blockBase,
      type: z.literal('columns'),
      columns: z.array(
        z.object({
          width: z
            .object({ unit: z.enum(['percent', 'pixels', 'fill']), value: z.number().optional() })
            .optional(),
          blocks: z.array(authoringBlock),
        }),
      ),
    }),
    z.object({ ...blockBase, type: z.literal('unsupported'), note: z.string().optional() }),
  ]),
) as unknown as z.ZodType<AuthoringBlock>;

// ── Step ─────────────────────────────────────────────────────────────────────
export const authoringStep = z.object({
  object: z.literal(ApiObjectType.STEP),
  id: z.string(),
  /** Front-end logical id — the write upsert key. Round-trips on read. */
  cvid: z.string().nullable(),
  name: z.string(),
  /** tooltip | modal | bubble | hidden */
  type: z.string(),
  sequence: z.number(),
  target: authoringTarget.optional(),
  placement: authoringPlacement.optional(),
  width: z.number().optional(),
  skippable: z.boolean().optional(),
  content: z.array(authoringBlock),
  triggers: z.array(authoringTrigger).optional(),
  advanced: z.object({ hasUnsupported: z.boolean() }).optional(),
});
export type AuthoringStep = z.infer<typeof authoringStep>;

// ── Version-level start / hide rules ─────────────────────────────────────────
const durationUnit = z.enum(['seconds', 'minutes', 'hours', 'days']);
export const authoringStartRules = z.object({
  when: z.array(authoringCondition),
  frequency: z
    .object({
      mode: z.enum(['once', 'multiple', 'unlimited']),
      every: z
        .object({ times: z.number().optional(), duration: z.number(), unit: durationUnit })
        .optional(),
      atLeast: z.object({ duration: z.number(), unit: durationUnit }).optional(),
    })
    .optional(),
  priority: z.enum(['highest', 'high', 'medium', 'low', 'lowest']).optional(),
  waitMs: z.number().optional(),
  startIfNotComplete: z.boolean().optional(),
});
export type AuthoringStartRules = z.infer<typeof authoringStartRules>;

export const authoringHideRules = z.object({ when: z.array(authoringCondition) });
export type AuthoringHideRules = z.infer<typeof authoringHideRules>;
