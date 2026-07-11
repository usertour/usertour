import { collectRuleIssues } from './condition-validate';

// a1 = String user attribute (dataType 2); n1 = Number (dataType 1);
// c1 = an existing content.
const ctx = {
  attributes: [
    { id: 'a1', dataType: 2, bizType: 1 },
    { id: 'n1', dataType: 1, bizType: 1 },
  ],
  segments: [{ id: 's1' }],
  contents: [{ id: 'c1' }],
  events: [{ id: 'e1' }],
} as never;

describe('collectRuleIssues', () => {
  describe('conditions', () => {
    it('passes a valid user-attr condition', () => {
      const issues = collectRuleIssues(
        [{ type: 'user-attr', data: { attrId: 'a1', logic: 'is', value: 'pro' } }],
        ctx,
      );
      expect(issues).toHaveLength(0);
    });

    it('flags a dangling attribute reference', () => {
      const issues = collectRuleIssues(
        [{ type: 'user-attr', data: { attrId: 'gone', logic: 'is', value: 'x' } }],
        ctx,
      );
      expect(issues[0]?.message).toMatch(/unknown attribute/);
    });

    it('flags an operator the attribute type does not support', () => {
      const issues = collectRuleIssues(
        [{ type: 'user-attr', data: { attrId: 'a1', logic: 'includesAll', value: 'x' } }],
        ctx,
      );
      expect(issues[0]?.message).toMatch(/not valid/);
    });

    // A numeric 0 (persistable via the untyped web GraphQL write path even though
    // value is typed string) is a REAL value, not "missing" — a bare `!value`
    // falsy check would flag it and hard-refuse publishing a valid condition.
    it('treats a numeric 0 value as present, not missing (>= 0)', () => {
      const issues = collectRuleIssues(
        [{ type: 'user-attr', data: { attrId: 'n1', logic: 'isGreaterThanOrEqualTo', value: 0 } }],
        ctx,
      );
      expect(issues).toHaveLength(0);
    });

    it('treats numeric 0 bounds as present in a between condition (0..5)', () => {
      const issues = collectRuleIssues(
        [{ type: 'user-attr', data: { attrId: 'n1', logic: 'between', value: 0, value2: 5 } }],
        ctx,
      );
      expect(issues).toHaveLength(0);
    });

    it('still flags a genuinely empty value (blank string)', () => {
      const issues = collectRuleIssues(
        [{ type: 'user-attr', data: { attrId: 'a1', logic: 'is', value: '' } }],
        ctx,
      );
      expect(issues[0]?.message).toMatch(/missing a required value/);
    });

    it('recurses into nested groups', () => {
      const issues = collectRuleIssues(
        [
          {
            type: 'group',
            conditions: [{ type: 'segment', data: { segmentId: 'gone', logic: 'is' } }],
          },
        ],
        ctx,
      );
      expect(issues.some((i) => /unknown segment/.test(i.message))).toBe(true);
    });
  });

  describe('action references', () => {
    it('flags a flow-start action referencing unknown content', () => {
      const issues = collectRuleIssues(
        { actions: [{ type: 'flow-start', data: { contentId: 'gone' } }] },
        ctx,
      );
      expect(issues.some((i) => /unknown content/.test(i.message))).toBe(true);
    });

    it('passes a flow-start action referencing existing content', () => {
      const issues = collectRuleIssues(
        { actions: [{ type: 'flow-start', data: { contentId: 'c1' } }] },
        ctx,
      );
      expect(issues).toHaveLength(0);
    });

    it('flags a resource-center content-list item referencing unknown content', () => {
      const issues = collectRuleIssues(
        // `contentItems` is the COMPILED field name (resource-center.compile) — the
        // check previously read `items`, so it never fired on real data.
        { type: 'content-list', contentItems: [{ contentId: 'c1' }, { contentId: 'gone' }] },
        ctx,
      );
      expect(issues.some((i) => /unknown content/.test(i.message))).toBe(true);
      expect(issues).toHaveLength(1); // only the dangling one
    });

    // Events were NOT existence-checked (validateEvent ignored ctx.events) while
    // attribute/segment/content were — a dangling event gated nothing yet published clean.
    it('flags an event condition referencing an unknown event', () => {
      const issues = collectRuleIssues({ type: 'event', data: { eventId: 'gone', count: 1 } }, ctx);
      expect(issues.some((i) => /unknown event/.test(i.message))).toBe(true);
    });

    it('does not flag an existing event as unknown', () => {
      // (may still have other completeness issues; we only assert the existence check passes)
      const issues = collectRuleIssues({ type: 'event', data: { eventId: 'e1', count: 1 } }, ctx);
      expect(issues.some((i) => /unknown event/.test(i.message))).toBe(false);
    });
  });

  it('skips reference checks when the context lists are absent', () => {
    // No contents loaded → can't verify; must not false-flag.
    const issues = collectRuleIssues(
      { actions: [{ type: 'flow-start', data: { contentId: 'x' } }] },
      {
        attributes: [],
      } as never,
    );
    expect(issues).toHaveLength(0);
  });
});
