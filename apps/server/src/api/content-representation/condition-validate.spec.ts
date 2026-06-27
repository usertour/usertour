import { collectRuleIssues } from './condition-validate';

// a1 = String user attribute (dataType 2); c1 = an existing content.
const ctx = {
  attributes: [{ id: 'a1', dataType: 2, bizType: 1 }],
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
