import { BizAttributeTypes } from '@usertour/types';

import { createConditionsFilter } from './filter';

// createConditionsFilter turns a segment's stored conditions into a Prisma
// where over biz users/companies. It only understands attribute conditions
// (looked up by `data.attrId`) + groups; anything else can't be translated.
const stringAttr = { id: 'a1', codeName: 'plan', dataType: BizAttributeTypes.String } as any;
const attrCond = {
  type: 'user-attr',
  operators: 'and',
  data: { attrId: 'a1', logic: 'is', value: 'trial' },
};
// `id IN ()` matches no row — the fail-closed sentinel.
const NEVER = { AND: [{ id: { in: [] } }] };

describe('createConditionsFilter — fail closed on unevaluable conditions', () => {
  it('translates an attribute condition into a JSON-path filter', () => {
    const f = createConditionsFilter([attrCond], [stringAttr]) as any;
    expect(f.AND?.[0]?.data).toMatchObject({ path: ['plan'], equals: 'trial' });
  });

  it('an unsupported condition type (event) yields never-match, not an empty match-all filter', () => {
    // The bug: event conditions were silently dropped, leaving {} → matches EVERY user.
    const f = createConditionsFilter(
      [
        {
          type: 'event',
          operators: 'and',
          data: { eventId: 'e1', countLogic: 'atLeast', count: 3 },
        },
      ],
      [stringAttr],
    );
    expect(f).toEqual(NEVER);
  });

  it('a single unevaluable condition fails the WHOLE segment closed', () => {
    const f = createConditionsFilter(
      [attrCond, { type: 'event', operators: 'and', data: { eventId: 'e1' } }],
      [stringAttr],
    );
    expect(f).toEqual(NEVER);
  });

  it('a condition on a missing (deleted) attribute also fails closed', () => {
    const f = createConditionsFilter(
      [{ type: 'user-attr', operators: 'and', data: { attrId: 'gone', logic: 'is', value: 'x' } }],
      [stringAttr],
    );
    expect(f).toEqual(NEVER);
  });

  it('empty conditions still return false (no filter → handled by caller as "all")', () => {
    expect(createConditionsFilter([], [stringAttr])).toBe(false);
  });
});

describe('createConditionsFilter — OR branches survive, AND fails closed', () => {
  const orCond = (attrId: string, value: string) => ({
    type: 'user-attr',
    operators: 'or',
    data: { attrId, logic: 'is', value },
  });

  it('drops only the unevaluable OR branch and matches on the survivor', () => {
    // "plan=trial OR <deleted attr>" — the deleted branch drops; users matching the
    // surviving branch must still match, not have the whole segment fail closed.
    const f = createConditionsFilter(
      [orCond('a1', 'trial'), orCond('gone', 'x')],
      [stringAttr],
    ) as any;
    expect(f).not.toEqual(NEVER);
    expect(f.OR?.[0]?.data).toMatchObject({ path: ['plan'], equals: 'trial' });
  });

  it('fails closed when EVERY OR branch is unevaluable (no empty match-all)', () => {
    const f = createConditionsFilter(
      [{ type: 'event', operators: 'or', data: { eventId: 'e1' } }, orCond('gone', 'x')],
      [stringAttr],
    );
    expect(f).toEqual(NEVER);
  });

  it('an AND group whose FIRST branch is unevaluable fails closed (never fail-open on the rest)', () => {
    // The 2nd condition's `and` joiner marks the group AND-joined; dropping the
    // unevaluable first conjunct would WIDEN the match, so it must fail closed.
    const f = createConditionsFilter(
      [
        orCond('gone', 'x'),
        {
          type: 'user-attr',
          operators: 'and',
          data: { attrId: 'a1', logic: 'is', value: 'trial' },
        },
      ],
      [stringAttr],
    );
    expect(f).toEqual(NEVER);
  });
});
