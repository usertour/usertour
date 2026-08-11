import { representationCondition, stringOp } from './representation.schema';
import { ATTR_OPS, ATTR_OP_TO_LOGIC } from './attr-ops';

// `match` / `unmatch` are regex ops that apply ONLY to a live text_input, never
// to a stored attribute value — no attribute dataType accepts them and the
// runtime attribute evaluator has no branch for them. They must not appear in
// the attribute / event_attribute `op` enum (they used to leak in because
// ATTR_OPS was every key of the full ATTR_OP_TO_LOGIC vocabulary).
describe('attribute op vocabulary', () => {
  it('excludes the text_input-only ops (match / unmatch) from ATTR_OPS', () => {
    expect(ATTR_OPS).not.toContain('match');
    expect(ATTR_OPS).not.toContain('unmatch');
    // but keeps the real attribute ops
    expect(ATTR_OPS).toContain('is');
    expect(ATTR_OPS).toContain('contains');
    expect(ATTR_OPS).toContain('includes_any');
    expect(ATTR_OPS).toContain('less_than');
  });

  it('keeps match/unmatch in the full logic map (text_input compile reuses it)', () => {
    // The map stays the complete vocabulary — only the attribute *enum* narrows.
    expect(ATTR_OP_TO_LOGIC.match).toBe('match');
    expect(ATTR_OP_TO_LOGIC.unmatch).toBe('unmatch');
  });

  it('rejects an attribute condition with op:match at the schema boundary', () => {
    const bad = representationCondition.safeParse({
      type: 'attribute',
      scope: 'user',
      attribute: 'plan',
      op: 'match',
      value: 'x',
    });
    expect(bad.success).toBe(false);
  });

  it('still accepts op:match on a text_input condition (its own stringOp enum)', () => {
    expect(stringOp.safeParse('match').success).toBe(true);
    expect(stringOp.safeParse('unmatch').success).toBe(true);
    const ok = representationCondition.safeParse({
      type: 'text_input',
      op: 'match',
      value: '^abc',
    });
    expect(ok.success).toBe(true);
  });
});
