import { Attribute } from '@/attributes/models/attribute.model';
import { Prisma } from '@prisma/client';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { BizAttributeTypes } from '../consts/attribute';

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
          NOT: [
            {
              OR: filteredValues.map((value) => ({
                data: { path: [attr.codeName], array_contains: value },
              })),
            },
          ],
        };
      case 'notIncludesAll':
        return {
          NOT: [
            {
              data: { path: [attr.codeName], array_contains: filteredValues },
            },
          ],
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
    const iosNow = new Date().toISOString();
    let iosValue: string | undefined;
    if (value && !Number.isNaN(new Date(value).getTime())) {
      iosValue = new Date(value).toISOString();
    }
    switch (logic) {
      case 'lessThan':
        return { data: { path: [attr.codeName], gte: subDays(iosNow, value) } };
      case 'exactly': {
        const preDate = subDays(iosNow, value);
        return {
          data: {
            path: [attr.codeName],
            gte: startOfDay(preDate),
            lte: endOfDay(preDate),
          },
        };
      }
      case 'moreThan':
        return { data: { path: [attr.codeName], lte: subDays(iosNow, value) } };
      case 'before':
        if (!iosValue) return false;
        return { data: { path: [attr.codeName], lte: iosValue } };
      case 'on':
        if (!iosValue) return false;
        return {
          data: {
            path: [attr.codeName],
            gte: startOfDay(iosValue),
            lte: endOfDay(iosValue),
          },
        };
      case 'after':
        if (!iosValue) return false;
        return { data: { path: [attr.codeName], gte: iosValue } };
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
