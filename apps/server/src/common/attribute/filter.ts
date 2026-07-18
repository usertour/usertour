import { Attribute, AttributeBizType } from '@/attributes/models/attribute.model';
import { Prisma } from '@prisma/client';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { BizAttributeTypes } from '@usertour/types';

export const createFilterItem = (condition: any, attributes: Attribute[]) => {
  const { data = {} } = condition;
  const { logic, value, attrId, value2, listValues = [] } = data;
  const attr = attributes.find((attr) => attr.id === attrId);
  if (!attr) {
    return false;
  }
  if (attr.dataType === BizAttributeTypes.String) {
    switch (logic) {
      case 'is':
        return { data: { path: [attr.codeName], equals: value } };
      case 'not':
        return {
          OR: [
            { data: { path: [attr.codeName], not: value } },
            { data: { path: [attr.codeName], equals: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], not: value } };
      case 'contains':
        return { data: { path: [attr.codeName], string_contains: value } };
      case 'notContain':
        return {
          OR: [
            { data: { path: [attr.codeName], equals: Prisma.AnyNull } },
            {
              NOT: { data: { path: [attr.codeName], string_contains: value } },
            },
          ],
        };
      // return {
      //   NOT: [{ data: { path: [attr.codeName], string_contains: value } }],
      // };
      case 'startsWith':
        return { data: { path: [attr.codeName], string_starts_with: value } };
      case 'endsWith':
        return { data: { path: [attr.codeName], string_ends_with: value } };
      case 'empty':
        return {
          OR: [
            { data: { path: [attr.codeName], equals: '' } },
            { data: { path: [attr.codeName], equals: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], equals: "" } };
      case 'any':
        return {
          AND: [
            { data: { path: [attr.codeName], not: '' } },
            { data: { path: [attr.codeName], not: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], not: "" } };
    }
  }
  if (attr.dataType === BizAttributeTypes.Number) {
    const intValue = Number(value);
    const intValue2 = Number(value2);
    switch (logic) {
      case 'is':
        return { data: { path: [attr.codeName], equals: intValue } };
      case 'not':
        return {
          OR: [
            { data: { path: [attr.codeName], not: intValue } },
            { data: { path: [attr.codeName], equals: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], not: intValue } };
      case 'isLessThan':
        return { data: { path: [attr.codeName], lt: intValue } };
      case 'isLessThanOrEqualTo':
        return { data: { path: [attr.codeName], lte: intValue } };
      case 'isGreaterThan':
        return { data: { path: [attr.codeName], gt: intValue } };
      case 'isGreaterThanOrEqualTo':
        return { data: { path: [attr.codeName], gte: intValue } };
      case 'between':
        return {
          data: { path: [attr.codeName], gte: intValue, lte: intValue2 },
        };
      case 'empty':
        return {
          OR: [
            { data: { path: [attr.codeName], equals: '' } },
            { data: { path: [attr.codeName], equals: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], equals: "" } };
      case 'any':
        return {
          AND: [
            { data: { path: [attr.codeName], not: '' } },
            { data: { path: [attr.codeName], not: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], not: "" } };
    }
  }
  if (attr.dataType === BizAttributeTypes.Boolean) {
    switch (logic) {
      case 'true':
        return { data: { path: [attr.codeName], equals: true } };
      case 'false':
        return { data: { path: [attr.codeName], equals: false } };
      case 'empty':
        return {
          OR: [
            { data: { path: [attr.codeName], equals: '' } },
            { data: { path: [attr.codeName], equals: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], equals: "" } };
      case 'any':
        return {
          AND: [
            { data: { path: [attr.codeName], not: '' } },
            { data: { path: [attr.codeName], not: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], not: "" } };
    }
  }
  if (attr.dataType === BizAttributeTypes.List) {
    // Filter out empty values from listValues
    const filteredValues = listValues.filter(
      (value) => value !== null && value !== undefined && value !== '',
    );

    // Return early if no valid values
    if (!filteredValues.length) {
      return false;
    }

    switch (logic) {
      case 'includesAtLeastOne':
        return {
          OR: filteredValues.map((value) => ({
            data: { path: [attr.codeName], array_contains: value },
          })),
        };
      case 'includesAll':
        return {
          data: { path: [attr.codeName], array_contains: filteredValues },
        };
      case 'notIncludesAtLeastOne':
        return {
          OR: filteredValues.map((value) => ({
            NOT: {
              data: { path: [attr.codeName], array_contains: value },
            },
          })),
        };
      case 'notIncludesAll':
        return {
          NOT: {
            OR: filteredValues.map((value) => ({
              data: { path: [attr.codeName], array_contains: value },
            })),
          },
        };
      case 'empty':
        return {
          OR: [
            { data: { path: [attr.codeName], equals: '' } },
            { data: { path: [attr.codeName], equals: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], equals: "" } };
      case 'any':
        return {
          AND: [
            { data: { path: [attr.codeName], not: '' } },
            { data: { path: [attr.codeName], not: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], not: "" } };
    }
  }
  if (attr.dataType === BizAttributeTypes.DateTime) {
    const now = new Date();
    let dateValue: Date | undefined;
    if (value && !Number.isNaN(new Date(value).getTime())) {
      dateValue = new Date(value);
    }
    switch (logic) {
      case 'lessThan':
        return { data: { path: [attr.codeName], gte: subDays(now, value) } };
      case 'exactly': {
        const preDate = subDays(now, value);
        return {
          data: {
            path: [attr.codeName],
            gte: startOfDay(preDate),
            lte: endOfDay(preDate),
          },
        };
      }
      case 'moreThan':
        return { data: { path: [attr.codeName], lte: subDays(now, value) } };
      case 'before':
        if (!dateValue) return false;
        return { data: { path: [attr.codeName], lte: dateValue.toISOString() } };
      case 'on':
        if (!dateValue) return false;
        return {
          data: {
            path: [attr.codeName],
            gte: startOfDay(dateValue),
            lte: endOfDay(dateValue),
          },
        };
      case 'after':
        if (!dateValue) return false;
        return { data: { path: [attr.codeName], gte: dateValue.toISOString() } };
      case 'empty':
        return {
          OR: [
            { data: { path: [attr.codeName], equals: '' } },
            { data: { path: [attr.codeName], equals: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], equals: "" } };
      case 'any':
        return {
          AND: [
            { data: { path: [attr.codeName], not: '' } },
            { data: { path: [attr.codeName], not: Prisma.AnyNull } },
          ],
        };
      // return { data: { path: [attr.codeName], not: "" } };
    }
  }
};

export const createConditionsFilter = (conditions: any, attributes: Attribute[]) => {
  if (!conditions || !conditions.length) {
    return false;
  }
  const AND = [];
  const OR = [];

  for (const condition of conditions) {
    const { operators } = condition;
    const item =
      condition.type !== 'group'
        ? createFilterItem(condition, attributes)
        : createConditionsFilter(condition.conditions, attributes);
    if (!item) {
      continue;
    }
    if (operators === 'and') {
      AND.push(item);
    } else {
      OR.push(item);
    }
  }

  const filter: Record<string, any> = {};
  if (AND.length > 0) {
    filter.AND = AND;
  }
  if (OR.length > 0) {
    filter.OR = OR;
  }
  return filter;
};

/**
 * How the existential company scan of a cross-entity filter binds to a
 * company:
 * - `all`: scan every company the user belongs to (offline queries, where no
 *   session exists).
 * - `current`: scan only the session's current company (runtime evaluation).
 * - `none`: no company context — company/membership leaves evaluate to false,
 *   matching how the runtime treats these leaves without a current company.
 */
export type CompanyScan =
  | { type: 'all' }
  | { type: 'current'; bizCompanyWhere: Record<string, any> }
  | { type: 'none' };

/**
 * A condition tree compiled against every anchor it can be evaluated from.
 *
 * `membershipAnchored` rewrites the tree relative to a BizUserOnCompany row:
 * user leaves nest under `bizUser`, company leaves under `bizCompany`,
 * membership leaves filter the row's own `data`. It is anchor-agnostic — both
 * the user-side and the company-side existential scans reuse it.
 *
 * `userAnchored` / `companyAnchored` are the tree's fallback projections onto
 * a bare BizUser / BizCompany row: leaves belonging to the other entities are
 * forced to false and boolean-simplified away (`false` = matches nothing).
 * Because the tree only combines leaves with AND/OR it is monotone, so for an
 * anchor row with at least one membership the fallback projection never
 * matches anything the existential scan misses.
 */
type CompiledCrossEntityNode = {
  membershipAnchored: Record<string, any>;
  userAnchored: Record<string, any> | false;
  companyAnchored: Record<string, any> | false;
  hasCompanyOrMembershipLeaf: boolean;
  hasUserOrMembershipLeaf: boolean;
};

const compileCrossEntityLeaf = (
  condition: any,
  attributes: Attribute[],
): CompiledCrossEntityNode | false => {
  const attribute = attributes.find((attr) => attr.id === condition?.data?.attrId);
  if (!attribute) {
    return false;
  }
  const leafFilter = createFilterItem(condition, attributes);
  if (!leafFilter) {
    return false;
  }
  switch (attribute.bizType) {
    case AttributeBizType.USER:
      return {
        membershipAnchored: { bizUser: leafFilter },
        userAnchored: leafFilter,
        companyAnchored: false,
        hasCompanyOrMembershipLeaf: false,
        hasUserOrMembershipLeaf: true,
      };
    case AttributeBizType.COMPANY:
      return {
        membershipAnchored: { bizCompany: leafFilter },
        userAnchored: false,
        companyAnchored: leafFilter,
        hasCompanyOrMembershipLeaf: true,
        hasUserOrMembershipLeaf: false,
      };
    case AttributeBizType.MEMBERSHIP:
      return {
        membershipAnchored: leafFilter,
        userAnchored: false,
        companyAnchored: false,
        hasCompanyOrMembershipLeaf: true,
        hasUserOrMembershipLeaf: true,
      };
    default:
      return false;
  }
};

/**
 * Combine children's fallback filters under the same {AND, OR} shape as
 * `createConditionsFilter`, simplifying away the `false` (matches-nothing)
 * children: a false AND-child poisons the node; false OR-children drop out,
 * and an OR bucket left with no survivors poisons the node too (the node's
 * semantics are "all AND children ∧ at least one OR child").
 */
const combineFallbackChildren = (
  andChildren: (Record<string, any> | false)[],
  orChildren: (Record<string, any> | false)[],
): Record<string, any> | false => {
  if (andChildren.some((child) => child === false)) {
    return false;
  }
  const survivingOrChildren = orChildren.filter(
    (child): child is Record<string, any> => child !== false,
  );
  if (orChildren.length > 0 && survivingOrChildren.length === 0) {
    return false;
  }
  const node: Record<string, any> = {};
  if (andChildren.length > 0) {
    node.AND = andChildren;
  }
  if (survivingOrChildren.length > 0) {
    node.OR = survivingOrChildren;
  }
  return node;
};

const compileCrossEntityConditions = (
  conditions: any,
  attributes: Attribute[],
): CompiledCrossEntityNode | false => {
  if (!conditions || !conditions.length) {
    return false;
  }

  const anchoredAnd: Record<string, any>[] = [];
  const anchoredOr: Record<string, any>[] = [];
  const userAnchoredAnd: (Record<string, any> | false)[] = [];
  const userAnchoredOr: (Record<string, any> | false)[] = [];
  const companyAnchoredAnd: (Record<string, any> | false)[] = [];
  const companyAnchoredOr: (Record<string, any> | false)[] = [];
  let hasCompanyOrMembershipLeaf = false;
  let hasUserOrMembershipLeaf = false;

  for (const condition of conditions) {
    const compiled =
      condition.type !== 'group'
        ? compileCrossEntityLeaf(condition, attributes)
        : compileCrossEntityConditions(condition.conditions, attributes);
    if (!compiled) {
      continue;
    }
    hasCompanyOrMembershipLeaf = hasCompanyOrMembershipLeaf || compiled.hasCompanyOrMembershipLeaf;
    hasUserOrMembershipLeaf = hasUserOrMembershipLeaf || compiled.hasUserOrMembershipLeaf;
    if (condition.operators === 'and') {
      anchoredAnd.push(compiled.membershipAnchored);
      userAnchoredAnd.push(compiled.userAnchored);
      companyAnchoredAnd.push(compiled.companyAnchored);
    } else {
      anchoredOr.push(compiled.membershipAnchored);
      userAnchoredOr.push(compiled.userAnchored);
      companyAnchoredOr.push(compiled.companyAnchored);
    }
  }

  const membershipAnchored: Record<string, any> = {};
  if (anchoredAnd.length > 0) {
    membershipAnchored.AND = anchoredAnd;
  }
  if (anchoredOr.length > 0) {
    membershipAnchored.OR = anchoredOr;
  }

  return {
    membershipAnchored,
    userAnchored: combineFallbackChildren(userAnchoredAnd, userAnchoredOr),
    companyAnchored: combineFallbackChildren(companyAnchoredAnd, companyAnchoredOr),
    hasCompanyOrMembershipLeaf,
    hasUserOrMembershipLeaf,
  };
};

/**
 * Prisma filter that matches no BizUser row. Needed because `false` already
 * means "no usable conditions — don't filter" in the createConditionsFilter
 * contract, while a cross-entity tree evaluated without company context must
 * match nobody, not everybody.
 */
const MATCHES_NO_BIZ_USER: Record<string, any> = { id: { in: [] } };

/**
 * Build a Prisma filter over BizUser for a condition tree that may mix user,
 * company and membership attributes.
 *
 * Cross-entity semantics: the whole tree shares a single existential company
 * quantifier — a user matches when at least one scanned membership satisfies
 * the tree with its company/membership leaves bound to that membership row.
 * A user-only fallback branch (company/membership leaves = false) is OR-ed in
 * so users outside the scanned companies can still match through user leaves,
 * keeping offline results consistent with runtime evaluation.
 *
 * Trees without company/membership leaves compile to exactly the same filter
 * as `createConditionsFilter`. Returns `false` only for empty/unusable
 * condition input (same contract as `createConditionsFilter`).
 */
export const createBizUserConditionsFilter = (
  conditions: any,
  attributes: Attribute[],
  companyScan: CompanyScan = { type: 'all' },
): Record<string, any> | false => {
  const compiled = compileCrossEntityConditions(conditions, attributes);
  if (!compiled) {
    return false;
  }
  if (!compiled.hasCompanyOrMembershipLeaf) {
    return compiled.userAnchored;
  }
  if (companyScan.type === 'none') {
    return compiled.userAnchored === false ? MATCHES_NO_BIZ_USER : compiled.userAnchored;
  }
  const membershipWhere =
    companyScan.type === 'current'
      ? { AND: [{ bizCompany: companyScan.bizCompanyWhere }, compiled.membershipAnchored] }
      : compiled.membershipAnchored;
  const existentialBranch = { bizUsersOnCompany: { some: membershipWhere } };
  if (compiled.userAnchored === false) {
    return existentialBranch;
  }
  return { OR: [existentialBranch, compiled.userAnchored] };
};

/**
 * Build a Prisma filter over BizCompany for a condition tree that may mix
 * company, user and membership attributes.
 *
 * Cross-entity semantics mirror `createBizUserConditionsFilter`: the tree
 * shares a single existential member quantifier — a company matches when at
 * least one of its memberships satisfies the tree with user/membership leaves
 * bound to that membership row. Company leaves always describe the anchored
 * company itself. A company-only fallback branch (user/membership leaves =
 * false) is OR-ed in so member-less companies can still match through company
 * leaves. No scan modes are needed: runtime evaluation pins the anchored
 * company via the outer query, and the member quantifier is part of the
 * segment's definition in both offline and runtime contexts.
 *
 * Trees without user/membership leaves compile to exactly the same filter as
 * `createConditionsFilter`. Returns `false` only for empty/unusable condition
 * input (same contract as `createConditionsFilter`).
 */
export const createBizCompanyConditionsFilter = (
  conditions: any,
  attributes: Attribute[],
): Record<string, any> | false => {
  const compiled = compileCrossEntityConditions(conditions, attributes);
  if (!compiled) {
    return false;
  }
  if (!compiled.hasUserOrMembershipLeaf) {
    return compiled.companyAnchored;
  }
  const existentialBranch = { bizUsersOnCompany: { some: compiled.membershipAnchored } };
  if (compiled.companyAnchored === false) {
    return existentialBranch;
  }
  return { OR: [existentialBranch, compiled.companyAnchored] };
};
