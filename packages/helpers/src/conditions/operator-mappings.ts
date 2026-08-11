import { AttributeDataType } from '@usertour/types';

// Operator logic values keyed off attribute datatype. The `labelKey` is an i18n
// key (resolved at render time) — kept as keys here so this module stays
// translation-free and importable from non-React contexts (the builder UI, the
// server's write-path validator).
//
// `summaryLabelKey` is the chip-form label when the dropdown phrasing reads
// awkwardly inline with a value. Optional: dropdown ("on a specific date")
// is self-explanatory standalone, but the chip sentence "<attr> on a
// specific date <value>" doubles up — the value IS the specific date. Chip
// rendering prefers `summaryLabelKey ?? labelKey`. Use `...` placeholder
// (handled by splitOperatorTemplate) so the value gets spliced in.
export interface OperatorEntry {
  value: string;
  labelKey: string;
  summaryLabelKey?: string;
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
    {
      value: 'before',
      labelKey: 'conditions.operators.beforeDate',
      summaryLabelKey: 'conditions.operators.beforeDateSummary',
    },
    {
      value: 'on',
      labelKey: 'conditions.operators.onDate',
      summaryLabelKey: 'conditions.operators.onDateSummary',
    },
    {
      value: 'after',
      labelKey: 'conditions.operators.afterDate',
      summaryLabelKey: 'conditions.operators.afterDateSummary',
    },
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

// The relative-date operator labels embed `...` as a placeholder where the
// number of days belongs (e.g. "exactly ... days ago"). The summary chip needs
// the value spliced INTO the label, not appended after it. Returns the prefix
// and suffix around the placeholder, or null when the label is a flat phrase.
export function splitOperatorTemplate(label: string): { prefix: string; suffix: string } | null {
  const idx = label.indexOf('...');
  if (idx < 0) return null;
  return { prefix: label.slice(0, idx), suffix: label.slice(idx + 3) };
}
