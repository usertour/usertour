import {
  BizAttributeTypes,
  UserTourTypes,
  RulesCondition,
  AttributeBizTypes,
  RulesEvaluationOptions,
} from '@usertour/types';
import { subDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Evaluate filter conditions and return boolean result
 * @param conditions - Filter conditions to evaluate
 * @param options - Evaluation options including attributes, user attributes, company attributes, and membership attributes
 * @returns boolean indicating if conditions are met
 */
export function evaluateFilterConditions(
  conditions: RulesCondition[],
  options: Pick<
    RulesEvaluationOptions,
    'attributes' | 'userAttributes' | 'companyAttributes' | 'membershipAttributes'
  >,
): boolean {
  if (!conditions || !conditions.length) {
    return true; // No conditions means always true
  }

  const result = evaluateAttributeConditionsGroup(conditions, options);
  return evaluateFilterResult(result);
}

/**
 * Evaluate a group of attribute conditions with AND/OR logic
 * @param conditions - Attribute filter conditions
 * @param options - Evaluation options including attributes, user attributes, company attributes, and membership attributes
 * @returns Evaluation result structure with AND/OR logic
 */
function evaluateAttributeConditionsGroup(
  conditions: RulesCondition[],
  options: Pick<
    RulesEvaluationOptions,
    'attributes' | 'userAttributes' | 'companyAttributes' | 'membershipAttributes'
  >,
): any {
  if (!conditions || !conditions.length) {
    return false;
  }

  const AND: any[] = [];
  const OR: any[] = [];

  for (const condition of conditions) {
    const { operators } = condition;
    const item =
      condition.type !== 'group'
        ? evaluateAttributeCondition(condition, options)
        : evaluateAttributeConditionsGroup(condition.conditions || [], options);

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
  // If no conditions were added to AND or OR arrays, return false
  if (AND.length === 0 && OR.length === 0) {
    return false;
  }

  return filter;
}

/**
 * Evaluate a single attribute condition
 * @param condition - Single attribute filter condition
 * @param options - Evaluation options including attributes, user attributes, company attributes, and membership attributes
 * @returns Evaluation result (boolean or complex structure)
 */
export function evaluateAttributeCondition(
  condition: RulesCondition,
  options: RulesEvaluationOptions,
): any {
  const { data } = condition;
  if (!data) {
    return false;
  }
  const { logic, value, attrId, value2, listValues = [] } = data;
  const {
    attributes,
    userAttributes = {},
    companyAttributes = {},
    membershipAttributes = {},
  } = options;

  if (!attrId || !attributes) {
    return false;
  }

  const attr = attributes.find((attr) => attr.id === attrId);
  if (!attr) {
    return false;
  }

  const bizAttributes =
    attr.bizType === AttributeBizTypes.Company
      ? companyAttributes
      : attr.bizType === AttributeBizTypes.Membership
        ? membershipAttributes
        : userAttributes;

  const actualValue = getAttributeValue(attr.codeName, bizAttributes);

  if (attr.dataType === BizAttributeTypes.String) {
    return evaluateStringCondition(logic, actualValue, value as string);
  }

  if (attr.dataType === BizAttributeTypes.Number) {
    return evaluateNumberCondition(logic, actualValue, value as number, value2 as number);
  }

  if (attr.dataType === BizAttributeTypes.Boolean) {
    return evaluateBooleanCondition(logic, actualValue);
  }

  if (attr.dataType === BizAttributeTypes.List) {
    return evaluateListCondition(logic, actualValue, listValues);
  }

  if (attr.dataType === BizAttributeTypes.DateTime) {
    return evaluateDateTimeCondition(logic, actualValue, value as string | number);
  }

  return false;
}

/**
 * Get attribute value from context
 * @param codeName - Attribute code name
 * @param context - Filter context with user attributes
 * @returns Attribute value
 */
function getAttributeValue(codeName: string, attributes: UserTourTypes.Attributes): any {
  return attributes?.[codeName];
}

/**
 * Evaluate string conditions
 */
function evaluateStringCondition(logic: string, actualValue: any, expectedValue: string): boolean {
  const stringValue = actualValue === null || actualValue === undefined ? '' : String(actualValue);

  switch (logic) {
    case 'is':
      return stringValue === expectedValue;
    case 'not':
      return stringValue !== expectedValue;
    case 'contains':
      return stringValue.includes(expectedValue);
    case 'notContain':
      return !stringValue.includes(expectedValue);
    case 'startsWith':
      return stringValue.startsWith(expectedValue);
    case 'endsWith':
      return stringValue.endsWith(expectedValue);
    case 'empty': {
      const isEmpty = !stringValue || stringValue === '';
      return isEmpty;
    }
    case 'any':
      return Boolean(stringValue && stringValue !== '');
    default:
      return false;
  }
}

/**
 * Evaluate number conditions
 */
function evaluateNumberCondition(
  logic: string,
  actualValue: any,
  expectedValue: number,
  expectedValue2?: number,
): boolean {
  const numValue = Number(actualValue);
  const numValue2 = Number(expectedValue2);

  if (Number.isNaN(numValue)) {
    return false;
  }

  switch (logic) {
    case 'is':
      return numValue === expectedValue;
    case 'not':
      return numValue !== expectedValue;
    case 'isLessThan':
      return numValue < expectedValue;
    case 'isLessThanOrEqualTo':
      return numValue <= expectedValue;
    case 'isGreaterThan':
      return numValue > expectedValue;
    case 'isGreaterThanOrEqualTo':
      return numValue >= expectedValue;
    case 'between':
      return numValue >= expectedValue && numValue <= numValue2;
    case 'empty':
      return actualValue === null || actualValue === undefined || actualValue === '';
    case 'any':
      return actualValue !== null && actualValue !== undefined && actualValue !== '';
    default:
      return false;
  }
}

/**
 * Evaluate boolean conditions
 */
function evaluateBooleanCondition(logic: string, actualValue: any): boolean {
  switch (logic) {
    case 'true':
      return actualValue === true;
    case 'false':
      return actualValue === false;
    case 'empty':
      return actualValue === null || actualValue === undefined || actualValue === '';
    case 'any':
      return actualValue !== null && actualValue !== undefined && actualValue !== '';
    default:
      return false;
  }
}

/**
 * Evaluate list conditions
 */
function evaluateListCondition(
  logic: string,
  actualValue: any,
  expectedValues: (string | number | boolean)[],
): boolean {
  const arrayValue = Array.isArray(actualValue) ? actualValue : [];

  // For empty and any conditions, we don't need to check expectedValues
  if (logic === 'empty' || logic === 'any') {
    switch (logic) {
      case 'empty':
        return !arrayValue || arrayValue.length === 0;
      case 'any':
        return arrayValue && arrayValue.length > 0;
      default:
        return false;
    }
  }

  // Filter out empty values from expected values
  const filteredValues = expectedValues.filter(
    (value) => value !== null && value !== undefined && value !== '',
  );

  if (!filteredValues.length) {
    return false;
  }

  switch (logic) {
    case 'includesAtLeastOne':
      return filteredValues.some((value) => arrayValue.includes(value));
    case 'includesAll':
      return filteredValues.every((value) => arrayValue.includes(value));
    case 'notIncludesAtLeastOne':
      return !filteredValues.some((value) => arrayValue.includes(value));
    case 'notIncludesAll':
      return !filteredValues.every((value) => arrayValue.includes(value));
    default:
      return false;
  }
}

/**
 * Evaluate datetime conditions
 */
function evaluateDateTimeCondition(
  logic: string,
  actualValue: any,
  expectedValue: string | number,
): boolean {
  const actualDate = actualValue ? new Date(actualValue) : null;
  const now = new Date();

  if (!actualDate || Number.isNaN(actualDate.getTime())) {
    return false;
  }

  switch (logic) {
    case 'lessThan': {
      const targetDate = subDays(now, Number(expectedValue));
      return actualDate >= targetDate;
    }
    case 'exactly': {
      const targetDate = subDays(now, Number(expectedValue));
      const start = startOfDay(targetDate);
      const end = endOfDay(targetDate);
      return actualDate >= start && actualDate <= end;
    }
    case 'moreThan': {
      const targetDate = subDays(now, Number(expectedValue));
      return actualDate <= targetDate;
    }
    case 'before': {
      const expectedDate = new Date(expectedValue);
      return actualDate <= expectedDate;
    }
    case 'on': {
      const expectedDateOn = new Date(expectedValue);
      const start = startOfDay(expectedDateOn);
      const end = endOfDay(expectedDateOn);
      return actualDate >= start && actualDate <= end;
    }
    case 'after': {
      const expectedDateAfter = new Date(expectedValue);
      return actualDate >= expectedDateAfter;
    }
    case 'empty':
      return !actualValue || actualValue === '';
    case 'any':
      return actualValue && actualValue !== '';
    default:
      return false;
  }
}

/**
 * Evaluate filter result structure
 * @param filter - Filter structure with AND/OR logic
 * @returns Boolean result
 */
function evaluateFilterResult(filter: any): boolean {
  if (!filter) {
    return false;
  }

  if (filter.AND) {
    return filter.AND.every((item: any) => evaluateFilterResult(item));
  }

  if (filter.OR) {
    return filter.OR.some((item: any) => evaluateFilterResult(item));
  }

  // If it's a direct condition result (boolean)
  if (typeof filter === 'boolean') {
    return filter;
  }

  // If it's a condition object, evaluate it
  if (typeof filter === 'object') {
    // This should be a condition result from createFilterItem
    return true; // The condition was already evaluated in createFilterItem
  }

  return false;
}
