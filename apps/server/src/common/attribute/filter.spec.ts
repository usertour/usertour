import { Attribute, AttributeBizType } from '@/attributes/models/attribute.model';
import {
  createBizCompanyConditionsFilter,
  createBizUserConditionsFilter,
  createConditionsFilter,
} from './filter';
import { BizAttributeTypes } from '@usertour/types';

const attributes = [
  {
    id: 'attr-user-email',
    bizType: AttributeBizType.USER,
    dataType: BizAttributeTypes.String,
    codeName: 'email',
  },
  {
    id: 'attr-user-plan',
    bizType: AttributeBizType.USER,
    dataType: BizAttributeTypes.String,
    codeName: 'plan',
  },
  {
    id: 'attr-company-subscription',
    bizType: AttributeBizType.COMPANY,
    dataType: BizAttributeTypes.String,
    codeName: 'subscription',
  },
  {
    id: 'attr-company-seats',
    bizType: AttributeBizType.COMPANY,
    dataType: BizAttributeTypes.Number,
    codeName: 'seats',
  },
  {
    id: 'attr-membership-role',
    bizType: AttributeBizType.MEMBERSHIP,
    dataType: BizAttributeTypes.String,
    codeName: 'role',
  },
] as Attribute[];

const userEmailIs = (value: string, operators: 'and' | 'or' = 'and') => ({
  type: 'user-attr',
  operators,
  data: { attrId: 'attr-user-email', logic: 'is', value },
});

const companySubscriptionIs = (value: string, operators: 'and' | 'or' = 'and') => ({
  type: 'user-attr',
  operators,
  data: { attrId: 'attr-company-subscription', logic: 'is', value },
});

const companySeatsGreaterThan = (value: number, operators: 'and' | 'or' = 'and') => ({
  type: 'user-attr',
  operators,
  data: { attrId: 'attr-company-seats', logic: 'isGreaterThan', value: String(value) },
});

const membershipRoleIs = (value: string, operators: 'and' | 'or' = 'and') => ({
  type: 'user-attr',
  operators,
  data: { attrId: 'attr-membership-role', logic: 'is', value },
});

const userEmailLeaf = (value: string) => ({ data: { path: ['email'], equals: value } });
const companySubscriptionLeaf = (value: string) => ({
  data: { path: ['subscription'], equals: value },
});
const companySeatsLeaf = (value: number) => ({ data: { path: ['seats'], gt: value } });
const membershipRoleLeaf = (value: string) => ({ data: { path: ['role'], equals: value } });

describe('createBizUserConditionsFilter', () => {
  it('returns false for empty conditions', () => {
    expect(createBizUserConditionsFilter([], attributes)).toBe(false);
    expect(createBizUserConditionsFilter(undefined, attributes)).toBe(false);
  });

  it('compiles a pure user tree identically to createConditionsFilter', () => {
    const conditions = [userEmailIs('a@x.com'), userEmailIs('b@x.com', 'or')];
    expect(createBizUserConditionsFilter(conditions, attributes)).toEqual(
      createConditionsFilter(conditions, attributes),
    );
  });

  it('wraps a single company condition in one existential scan without a fallback branch', () => {
    const conditions = [companySubscriptionIs('pro')];
    expect(createBizUserConditionsFilter(conditions, attributes)).toEqual({
      bizUsersOnCompany: {
        some: { AND: [{ bizCompany: companySubscriptionLeaf('pro') }] },
      },
    });
  });

  it('binds AND-ed company conditions to the same membership row', () => {
    const conditions = [companySubscriptionIs('pro'), companySeatsGreaterThan(10)];
    expect(createBizUserConditionsFilter(conditions, attributes)).toEqual({
      bizUsersOnCompany: {
        some: {
          AND: [
            { bizCompany: companySubscriptionLeaf('pro') },
            { bizCompany: companySeatsLeaf(10) },
          ],
        },
      },
    });
  });

  it('binds membership and company conditions to the same membership row', () => {
    const conditions = [membershipRoleIs('admin'), companySubscriptionIs('pro')];
    expect(createBizUserConditionsFilter(conditions, attributes)).toEqual({
      bizUsersOnCompany: {
        some: {
          AND: [membershipRoleLeaf('admin'), { bizCompany: companySubscriptionLeaf('pro') }],
        },
      },
    });
  });

  it('poisons the fallback branch when a company condition is AND-ed with a user condition', () => {
    const conditions = [userEmailIs('a@x.com'), companySubscriptionIs('pro')];
    expect(createBizUserConditionsFilter(conditions, attributes)).toEqual({
      bizUsersOnCompany: {
        some: {
          AND: [
            { bizUser: userEmailLeaf('a@x.com') },
            { bizCompany: companySubscriptionLeaf('pro') },
          ],
        },
      },
    });
  });

  it('keeps the user-only fallback branch for OR-ed mixed trees', () => {
    const conditions = [userEmailIs('a@x.com', 'or'), companySubscriptionIs('pro', 'or')];
    expect(createBizUserConditionsFilter(conditions, attributes)).toEqual({
      OR: [
        {
          bizUsersOnCompany: {
            some: {
              OR: [
                { bizUser: userEmailLeaf('a@x.com') },
                { bizCompany: companySubscriptionLeaf('pro') },
              ],
            },
          },
        },
        { OR: [userEmailLeaf('a@x.com')] },
      ],
    });
  });

  it('compiles nested groups and drops company leaves from the fallback of OR groups', () => {
    const conditions = [
      userEmailIs('a@x.com'),
      {
        type: 'group',
        operators: 'and',
        conditions: [userEmailIs('b@x.com', 'or'), companySubscriptionIs('pro', 'or')],
      },
    ];
    expect(createBizUserConditionsFilter(conditions, attributes)).toEqual({
      OR: [
        {
          bizUsersOnCompany: {
            some: {
              AND: [
                { bizUser: userEmailLeaf('a@x.com') },
                {
                  OR: [
                    { bizUser: userEmailLeaf('b@x.com') },
                    { bizCompany: companySubscriptionLeaf('pro') },
                  ],
                },
              ],
            },
          },
        },
        {
          AND: [userEmailLeaf('a@x.com'), { OR: [userEmailLeaf('b@x.com')] }],
        },
      ],
    });
  });

  it('skips conditions whose attribute is unknown, matching createConditionsFilter', () => {
    const conditions = [
      userEmailIs('a@x.com'),
      {
        type: 'user-attr',
        operators: 'and',
        data: { attrId: 'attr-missing', logic: 'is', value: 'x' },
      },
    ];
    expect(createBizUserConditionsFilter(conditions, attributes)).toEqual(
      createConditionsFilter(conditions, attributes),
    );
  });

  it('pins the existential scan to the current company when requested', () => {
    const bizCompanyWhere = { externalId: 'org-1', environmentId: 'env-1' };
    const conditions = [companySubscriptionIs('pro')];
    expect(
      createBizUserConditionsFilter(conditions, attributes, {
        type: 'current',
        bizCompanyWhere,
      }),
    ).toEqual({
      bizUsersOnCompany: {
        some: {
          AND: [
            { bizCompany: bizCompanyWhere },
            { AND: [{ bizCompany: companySubscriptionLeaf('pro') }] },
          ],
        },
      },
    });
  });

  it('evaluates company leaves as false when there is no company context', () => {
    const matchesNothing = { id: { in: [] } };
    expect(
      createBizUserConditionsFilter([companySubscriptionIs('pro')], attributes, { type: 'none' }),
    ).toEqual(matchesNothing);
    expect(
      createBizUserConditionsFilter(
        [userEmailIs('a@x.com'), companySubscriptionIs('pro')],
        attributes,
        { type: 'none' },
      ),
    ).toEqual(matchesNothing);
    expect(
      createBizUserConditionsFilter(
        [userEmailIs('a@x.com', 'or'), companySubscriptionIs('pro', 'or')],
        attributes,
        { type: 'none' },
      ),
    ).toEqual({ OR: [userEmailLeaf('a@x.com')] });
  });
});

describe('createBizCompanyConditionsFilter', () => {
  it('returns false for empty conditions', () => {
    expect(createBizCompanyConditionsFilter([], attributes)).toBe(false);
    expect(createBizCompanyConditionsFilter(undefined, attributes)).toBe(false);
  });

  it('compiles a pure company tree identically to createConditionsFilter', () => {
    const conditions = [companySubscriptionIs('pro'), companySeatsGreaterThan(10, 'or')];
    expect(createBizCompanyConditionsFilter(conditions, attributes)).toEqual(
      createConditionsFilter(conditions, attributes),
    );
  });

  it('wraps a single user condition in one existential member scan without a fallback branch', () => {
    expect(createBizCompanyConditionsFilter([userEmailIs('a@x.com')], attributes)).toEqual({
      bizUsersOnCompany: {
        some: { AND: [{ bizUser: userEmailLeaf('a@x.com') }] },
      },
    });
  });

  it('binds AND-ed company and user conditions to the same membership row', () => {
    const conditions = [companySubscriptionIs('pro'), userEmailIs('a@x.com')];
    expect(createBizCompanyConditionsFilter(conditions, attributes)).toEqual({
      bizUsersOnCompany: {
        some: {
          AND: [
            { bizCompany: companySubscriptionLeaf('pro') },
            { bizUser: userEmailLeaf('a@x.com') },
          ],
        },
      },
    });
  });

  it('binds membership and user conditions to the same member', () => {
    const conditions = [membershipRoleIs('admin'), userEmailIs('a@x.com')];
    expect(createBizCompanyConditionsFilter(conditions, attributes)).toEqual({
      bizUsersOnCompany: {
        some: {
          AND: [membershipRoleLeaf('admin'), { bizUser: userEmailLeaf('a@x.com') }],
        },
      },
    });
  });

  it('keeps the company-only fallback branch for OR-ed mixed trees', () => {
    const conditions = [companySubscriptionIs('pro', 'or'), membershipRoleIs('admin', 'or')];
    expect(createBizCompanyConditionsFilter(conditions, attributes)).toEqual({
      OR: [
        {
          bizUsersOnCompany: {
            some: {
              OR: [{ bizCompany: companySubscriptionLeaf('pro') }, membershipRoleLeaf('admin')],
            },
          },
        },
        { OR: [companySubscriptionLeaf('pro')] },
      ],
    });
  });
});

// --- Unevaluable-condition handling: SKIP the dead leaf, but never match everyone ---
// A leaf whose attribute was deleted (or an unsupported condition type) is SKIPPED —
// the surviving conditions define the match (long-standing, backward-compatible
// behavior). The one guard: if EVERY condition is unevaluable, an empty {} filter
// would match every row (fail-open), so a matches-nobody filter is returned instead.
const stringAttr = { id: 'a1', codeName: 'plan', dataType: BizAttributeTypes.String } as any;
const attrCond = {
  type: 'user-attr',
  operators: 'and',
  data: { attrId: 'a1', logic: 'is', value: 'trial' },
};
const deletedAttrCond = (op: 'and' | 'or' = 'and') => ({
  type: 'user-attr',
  operators: op,
  data: { attrId: 'gone', logic: 'is', value: 'x' },
});
const eventCond = (op: 'and' | 'or' = 'and') => ({
  type: 'event',
  operators: op,
  data: { eventId: 'e1' },
});
// `id IN ()` matches no row — the matches-nobody sentinel both functions use.
const NOBODY = { AND: [{ id: { in: [] } }] };

describe('createConditionsFilter — skip unevaluable, guard against match-all', () => {
  it('translates a valid attribute condition into a JSON-path filter', () => {
    const f = createConditionsFilter([attrCond], [stringAttr]) as any;
    expect(f.AND?.[0]?.data).toMatchObject({ path: ['plan'], equals: 'trial' });
  });

  it('skips an unevaluable AND-conjunct (unsupported type) and matches on the survivor', () => {
    // "plan=trial AND <event>" — the event drops, plan=trial defines the match.
    const f = createConditionsFilter([attrCond, eventCond()], [stringAttr]) as any;
    expect(f.AND).toHaveLength(1);
    expect(f.AND?.[0]?.data).toMatchObject({ path: ['plan'], equals: 'trial' });
  });

  it('skips a deleted-attribute AND-conjunct and matches on the survivor', () => {
    // "plan=trial AND <deleted attr>" — backward-compatible: the segment keeps
    // working on its surviving condition rather than going to nobody.
    const f = createConditionsFilter([attrCond, deletedAttrCond()], [stringAttr]) as any;
    expect(f.AND).toHaveLength(1);
    expect(f.AND?.[0]?.data).toMatchObject({ path: ['plan'], equals: 'trial' });
  });

  it('matches NOBODY (not everyone) when EVERY condition is unevaluable', () => {
    // The one case we refuse to skip-into-match-all: a whole segment definition
    // that is unresolvable must not collapse to {} (which matches every user).
    expect(createConditionsFilter([eventCond()], [stringAttr])).toEqual(NOBODY);
    expect(createConditionsFilter([deletedAttrCond()], [stringAttr])).toEqual(NOBODY);
  });

  it('empty conditions return false (no filter → caller decides)', () => {
    expect(createConditionsFilter([], [stringAttr])).toBe(false);
  });
});

describe('createConditionsFilter — OR survivors', () => {
  const orCond = (attrId: string, value: string) => ({
    type: 'user-attr',
    operators: 'or',
    data: { attrId, logic: 'is', value },
  });

  it('drops the unevaluable OR branch and matches on the survivor', () => {
    const f = createConditionsFilter(
      [orCond('a1', 'trial'), orCond('gone', 'x')],
      [stringAttr],
    ) as any;
    expect(f).not.toEqual(NOBODY);
    expect(f.OR?.[0]?.data).toMatchObject({ path: ['plan'], equals: 'trial' });
  });

  it('matches nobody when EVERY OR branch is unevaluable', () => {
    const f = createConditionsFilter([eventCond('or'), orCond('gone', 'x')], [stringAttr]);
    expect(f).toEqual(NOBODY);
  });
});

describe('cross-entity filters — all-unevaluable guard (never {} = everyone)', () => {
  it('createBizUserConditionsFilter matches nobody when every condition is unevaluable', () => {
    expect(createBizUserConditionsFilter([deletedAttrCond()], attributes)).toEqual({
      id: { in: [] },
    });
  });

  it('createBizCompanyConditionsFilter matches nobody when every condition is unevaluable', () => {
    expect(createBizCompanyConditionsFilter([deletedAttrCond()], attributes)).toEqual({
      id: { in: [] },
    });
  });

  it('a partly-unevaluable cross-entity tree still matches on its surviving leaf', () => {
    // email is a valid user attribute; the deleted attr drops — not nobody.
    const f = createBizUserConditionsFilter(
      [userEmailIs('a@x.com'), deletedAttrCond()],
      attributes,
    );
    expect(f).not.toEqual({ id: { in: [] } });
    expect(f).toEqual(
      createConditionsFilter([userEmailIs('a@x.com'), deletedAttrCond()], attributes),
    );
  });
});
