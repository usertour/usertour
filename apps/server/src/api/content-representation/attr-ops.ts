/**
 * Single source of truth for the representation-layer attribute operators — the
 * `op` on `attribute` / `event_attribute` conditions — and their mapping to
 * the internal `logic` tokens.
 *
 * Everything that touches these ops derives from this one map, so they can't drift
 * apart:
 *  - the zod schema builds its `op` enum from `ATTR_OPS` (representation.schema.ts),
 *  - the compiler maps representation op → internal logic via `ATTR_OP_TO_LOGIC`
 *    (rules.compile.ts),
 *  - the decompiler maps internal logic → representation op via `LOGIC_TO_ATTR_OP`
 *    (rules.decompile.ts).
 *
 * The per-dataType validity of an op (which subset applies to string / number /
 * boolean / list / datetime) is enforced separately against the attribute's
 * dataType; this is the full vocabulary across all types.
 */

export const ATTR_OP_TO_LOGIC = {
  is: 'is',
  not: 'not',
  contains: 'contains',
  not_contains: 'notContain',
  starts_with: 'startsWith',
  ends_with: 'endsWith',
  match: 'match',
  unmatch: 'unmatch',
  any: 'any',
  empty: 'empty',
  lt: 'isLessThan',
  lte: 'isLessThanOrEqualTo',
  gt: 'isGreaterThan',
  gte: 'isGreaterThanOrEqualTo',
  between: 'between',
  true: 'true',
  false: 'false',
  includes_any: 'includesAtLeastOne',
  includes_all: 'includesAll',
  not_includes_any: 'notIncludesAtLeastOne',
  not_includes_all: 'notIncludesAll',
  less_than: 'lessThan',
  exactly: 'exactly',
  more_than: 'moreThan',
  before: 'before',
  on: 'on',
  after: 'after',
} as const;

export type RepresentationAttrOp = keyof typeof ATTR_OP_TO_LOGIC;

/**
 * Ops that apply ONLY to `text_input` (a regex match against a live page input),
 * never to a stored attribute value — no attribute dataType accepts them and the
 * runtime attribute evaluator has no branch for them. They stay in
 * ATTR_OP_TO_LOGIC (text_input's compile reuses that map for its op→logic
 * mapping) but must NOT appear in the attribute / event_attribute `op` enum.
 */
const TEXT_INPUT_ONLY_OPS = ['match', 'unmatch'] as const;

/** Op vocabulary for `attribute` / `event_attribute` conditions (excludes the
 * text_input-only ops above), for `z.enum`. */
export const ATTR_OPS = (Object.keys(ATTR_OP_TO_LOGIC) as RepresentationAttrOp[]).filter(
  (op): op is Exclude<RepresentationAttrOp, (typeof TEXT_INPUT_ONLY_OPS)[number]> =>
    !(TEXT_INPUT_ONLY_OPS as readonly string[]).includes(op),
) as [
  Exclude<RepresentationAttrOp, (typeof TEXT_INPUT_ONLY_OPS)[number]>,
  ...Exclude<RepresentationAttrOp, (typeof TEXT_INPUT_ONLY_OPS)[number]>[],
];

/** internal logic token → representation op (inverse, for decompile). */
export const LOGIC_TO_ATTR_OP: Record<string, RepresentationAttrOp> = Object.fromEntries(
  Object.entries(ATTR_OP_TO_LOGIC).map(([op, logic]) => [logic, op]),
) as Record<string, RepresentationAttrOp>;
