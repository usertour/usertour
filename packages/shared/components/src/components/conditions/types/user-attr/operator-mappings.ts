import { AttributeDataType } from '@usertour/types';

// Operator logic values keyed off attribute datatype. The `labelKey` is an i18n
// key (resolved at render time) — kept as keys here so this module stays
// translation-free and importable from non-React contexts.
export interface OperatorEntry {
  value: string;
  labelKey: string;
}

export const OPERATORS_BY_DATATYPE: Record<number, OperatorEntry[]> = {
  [AttributeDataType.Number]: [
    { value: 'is', labelKey: 'conditions.operators.is' },
    { value: 'not', labelKey: 'conditions.operators.isNot' },
    { value: 'isLessThan', labelKey: 'conditions.operators.isLessThan' },
    { value: 'isLessThanOrEqualTo', labelKey: 'conditions.operators.isLessThanOrEqualTo' },
    { value: 'isGreaterThan', labelKey: 'conditions.operators.isGreaterThan' },
    { value: 'isGreaterThanOrEqualTo', labelKey: 'conditions.operators.isGreaterThanOrEqualTo' },
    { value: 'between', labelKey: 'conditions.operators.isBetween' },
    { value: 'any', labelKey: 'conditions.operators.hasAnyValue' },
    { value: 'empty', labelKey: 'conditions.operators.isEmpty' },
  ],
  [AttributeDataType.String]: [
    { value: 'is', labelKey: 'conditions.operators.is' },
    { value: 'not', labelKey: 'conditions.operators.isNot' },
    { value: 'contains', labelKey: 'conditions.operators.contains' },
    { value: 'notContain', labelKey: 'conditions.operators.doesNotContain' },
    { value: 'startsWith', labelKey: 'conditions.operators.startsWith' },
    { value: 'endsWith', labelKey: 'conditions.operators.endsWith' },
    { value: 'any', labelKey: 'conditions.operators.hasAnyValue' },
    { value: 'empty', labelKey: 'conditions.operators.isEmpty' },
  ],
  [AttributeDataType.Boolean]: [
    { value: 'true', labelKey: 'conditions.operators.isTrue' },
    { value: 'false', labelKey: 'conditions.operators.isFalse' },
    { value: 'any', labelKey: 'conditions.operators.hasAnyValue' },
    { value: 'empty', labelKey: 'conditions.operators.isEmpty' },
  ],
  [AttributeDataType.List]: [
    { value: 'includesAtLeastOne', labelKey: 'conditions.operators.includesAtLeastOne' },
    { value: 'includesAll', labelKey: 'conditions.operators.includesAll' },
    { value: 'notIncludesAtLeastOne', labelKey: 'conditions.operators.notIncludesAtLeastOne' },
    { value: 'notIncludesAll', labelKey: 'conditions.operators.notIncludesAll' },
    { value: 'any', labelKey: 'conditions.operators.hasAnyValue' },
    { value: 'empty', labelKey: 'conditions.operators.isEmpty' },
  ],
  [AttributeDataType.DateTime]: [
    { value: 'lessThan', labelKey: 'conditions.operators.daysAgoLessThan' },
    { value: 'exactly', labelKey: 'conditions.operators.daysAgoExactly' },
    { value: 'moreThan', labelKey: 'conditions.operators.daysAgoMoreThan' },
    { value: 'before', labelKey: 'conditions.operators.beforeDate' },
    { value: 'on', labelKey: 'conditions.operators.onDate' },
    { value: 'after', labelKey: 'conditions.operators.afterDate' },
    { value: 'any', labelKey: 'conditions.operators.hasAnyValue' },
    { value: 'empty', labelKey: 'conditions.operators.isEmpty' },
  ],
};

export function operatorsFor(dataType: number | undefined): OperatorEntry[] {
  if (dataType === undefined) return OPERATORS_BY_DATATYPE[AttributeDataType.String];
  return OPERATORS_BY_DATATYPE[dataType] ?? OPERATORS_BY_DATATYPE[AttributeDataType.String];
}

// Operators that don't take a value (so the value input should be hidden).
export const VALUELESS_OPERATORS = new Set(['any', 'empty', 'true', 'false']);

// Operators on DateTime that pick an absolute date (vs the "days ago" group).
export const DATE_PICKER_OPERATORS = new Set(['before', 'on', 'after']);
