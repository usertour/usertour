import { Attribute } from '@/attributes/models/attribute.model';
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

// A Prisma predicate that matches no row — `id IN ()`. Wrapped in AND so it
// survives callers that later assign `where.id` / `where.OR` (it can't be
// clobbered). Used to fail a segment CLOSED when it can't be evaluated.
const NEVER_MATCH = { AND: [{ id: { in: [] as string[] } }] };

export const createConditionsFilter = (conditions: any, attributes: Attribute[]) => {
  if (!conditions || !conditions.length) {
    return false;
  }
  const AND = [];
  const OR = [];

  // Is this level purely OR-joined (no `and` joiner anywhere)? Only then is it safe
  // to DROP an unevaluable branch and keep the surviving alternatives. An AND-joined
  // (or mixed) level must fail CLOSED on any unevaluable branch, because dropping a
  // required conjunct would WIDEN the match (fail-open) — e.g. "plan=pro AND
  // role=admin" whose `role` attribute was deleted would then match every pro user,
  // admin or not. Note the FIRST condition's `operators` is absent (it buckets as
  // OR), so we can't decide per-condition — the whole level's join type governs.
  const orJoined = conditions.every((c: any) => c.operators !== 'and');

  for (const condition of conditions) {
    const { operators } = condition;
    const item =
      condition.type !== 'group'
        ? createFilterItem(condition, attributes)
        : createConditionsFilter(condition.conditions, attributes);
    if (!item) {
      // A falsy item means this condition can't be turned into a membership query —
      // an unsupported condition type (segments only evaluate attribute conditions;
      // event / page / element / flow / etc. are not translated) or a broken leaf
      // (deleted attribute, malformed value). In a pure-OR level, drop just this
      // branch and let the surviving alternatives define the match; otherwise fail
      // CLOSED so a dropped conjunct never widens the match. (The v2/MCP write path
      // rejects these types outright — this guards segments from other paths or
      // authored before that gate.)
      if (orJoined) {
        continue;
      }
      return NEVER_MATCH;
    }
    if (operators === 'and') {
      AND.push(item);
    } else {
      OR.push(item);
    }
  }

  // Every branch of a pure-OR level was unevaluable → an empty filter would match
  // EVERY user (fail-open). Fail closed instead.
  if (AND.length === 0 && OR.length === 0) {
    return NEVER_MATCH;
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
