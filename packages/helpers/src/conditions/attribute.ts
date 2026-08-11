import {
  BizAttributeTypes,
  UserTourTypes,
  RulesCondition,
  AttributeBizTypes,
  RulesEvaluationOptions,
} from '@usertour/types';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { isArray } from '../type-utils';

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
  const hasValue = actualValue !== null && actualValue !== undefined && actualValue !== '';

  if (logic === 'empty') {
    return !hasValue;
  }
  if (logic === 'any') {
    return hasValue;
  }

  // An unset attribute never satisfies a POSITIVE comparison. Without this
  // guard, Number(null) / Number('') coerce to 0 and slip past the NaN check,
  // so e.g. `lte 6` matched every user who hadn't been given the attribute yet.
  // `not` is the exception: it is exclusion, not comparison — a user without
  // the value IS "not X", matching the string evaluator (missing compares as
  // '') and the segment SQL filter (`not` ORs in AnyNull deliberately).
  if (!hasValue) {
    return logic === 'not';
  }

  const numActualValue = Number(actualValue);
  const numExpectedValue = Number(expectedValue);
  const numExpectedValue2 = Number(expectedValue2);

  if (Number.isNaN(numActualValue)) {
    return false;
  }

  switch (logic) {
    case 'is':
      return numActualValue === numExpectedValue;
    case 'not':
      return numActualValue !== numExpectedValue;
    case 'isLessThan':
      return numActualValue < numExpectedValue;
    case 'isLessThanOrEqualTo':
      return numActualValue <= numExpectedValue;
    case 'isGreaterThan':
      return numActualValue > numExpectedValue;
    case 'isGreaterThanOrEqualTo':
      return numActualValue >= numExpectedValue;
    case 'between':
      return numActualValue >= numExpectedValue && numActualValue <= numExpectedValue2;
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
  const arrayValue = isArray(actualValue) ? actualValue : [];

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
      return filteredValues.some((value) => !arrayValue.includes(value));
    case 'notIncludesAll':
      return filteredValues.every((value) => !arrayValue.includes(value));
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

  // 'empty'/'any' must be answered before the parse guard — with the guard
  // first, an unset value returned false out of 'empty' too, so "date is
  // empty" could never match anyone.
  if (logic === 'empty') {
    return !actualValue || actualValue === '';
  }
  if (logic === 'any') {
    return Boolean(actualValue) && actualValue !== '';
  }

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
    default:
      return false;
  }
}
