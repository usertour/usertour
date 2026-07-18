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
