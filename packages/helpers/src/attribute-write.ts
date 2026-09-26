import {
  AttributeWriteDataType,
  AttributeWriteOperation,
  BizAttributeTypes,
} from '@usertour/types';
import isEqual from 'fast-deep-equal';
import { getAttributeType } from './attribute';
import { isArray, isBoolean, isNull, isNumber, isObject, isString } from './type-utils';

/**
 * Pure attribute-write semantics shared by every write entry point (ADR 0017):
 * parsing the wire value, lossless coercion to a target type, and applying an
 * operation to the stored value. Persistence, definition lookup and locking
 * stay with the caller.
 */

export type AttributeScalar = string | number | boolean;

/** A parsed wire value; `remove` (null) and `literal` carry no operation. */
export type AttributeWrite =
  | { kind: 'literal'; value: unknown }
  | { kind: 'delete' }
  | { kind: 'set'; value: unknown; dataType?: BizAttributeTypes }
  | { kind: 'set_once'; value: unknown; dataType?: BizAttributeTypes }
  | { kind: 'add'; value: number }
  | { kind: 'union'; values: AttributeScalar[] }
  | { kind: 'remove'; values: AttributeScalar[] };

export type AttributeWriteParse =
  | { ok: true; write: AttributeWrite }
  | { ok: false; reason: string };

const OPERATION_KEYS: readonly string[] = Object.values(AttributeWriteOperation);
const DATA_TYPE_KEY = 'data_type';

const WRITE_DATA_TYPES: Record<AttributeWriteDataType, BizAttributeTypes> = {
  string: BizAttributeTypes.String,
  number: BizAttributeTypes.Number,
  boolean: BizAttributeTypes.Boolean,
  datetime: BizAttributeTypes.DateTime,
  list: BizAttributeTypes.List,
};

const isScalar = (value: unknown): value is AttributeScalar => {
  return isString(value) || isNumber(value) || isBoolean(value);
};

/**
 * A scalar or a list of scalars, as a list. A null or undefined element is
 * dropped: a sparse array or a serialised `undefined` is a common accident,
 * and a list stored before elements were validated may carry one — neither
 * should cost the whole key, or the whole stored list under `union`. A list
 * holding an object or a nested list is not a list of scalars.
 */
const toScalarList = (value: unknown): AttributeScalar[] | undefined => {
  if (isScalar(value)) {
    return [value];
  }
  if (!isArray(value)) {
    return undefined;
  }
  const values = value.filter((item) => item !== null && item !== undefined);
  return values.every(isScalar) ? values : undefined;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!isObject(value) || isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * Classify one attribute value from the wire. A plain object is an operation
 * only when it carries exactly one operation key (plus `data_type` next to
 * `set` / `set_once`); any other object is rejected so it can never be stored
 * verbatim or mint a `Nil` definition.
 */
export const parseAttributeWrite = (value: unknown): AttributeWriteParse => {
  if (isNull(value)) {
    return { ok: true, write: { kind: 'delete' } };
  }
  if (!isObject(value) || isArray(value)) {
    return { ok: true, write: { kind: 'literal', value } };
  }
  if (!isPlainObject(value)) {
    return { ok: false, reason: 'an object value must be a plain operation object' };
  }
  const keys = Object.keys(value);
  const operations = keys.filter((key) => OPERATION_KEYS.includes(key));
  const extras = keys.filter((key) => !OPERATION_KEYS.includes(key) && key !== DATA_TYPE_KEY);
  if (operations.length !== 1 || extras.length > 0) {
    return {
      ok: false,
      reason: `an operation object must contain exactly one of ${OPERATION_KEYS.join(', ')}`,
    };
  }
  const operation = operations[0] as AttributeWriteOperation;
  const operand = value[operation];
  const hasDataType = DATA_TYPE_KEY in value;
  if (
    hasDataType &&
    operation !== AttributeWriteOperation.Set &&
    operation !== AttributeWriteOperation.SetOnce
  ) {
    return { ok: false, reason: 'data_type is only allowed with set or set_once' };
  }
  let dataType: BizAttributeTypes | undefined;
  if (hasDataType) {
    const name = value[DATA_TYPE_KEY];
    if (!isString(name) || !Object.prototype.hasOwnProperty.call(WRITE_DATA_TYPES, name)) {
      return {
        ok: false,
        reason: `data_type must be one of ${Object.keys(WRITE_DATA_TYPES).join(', ')}`,
      };
    }
    dataType = WRITE_DATA_TYPES[name as AttributeWriteDataType];
  }

  switch (operation) {
    case AttributeWriteOperation.Set:
    case AttributeWriteOperation.SetOnce: {
      if (isNull(operand) || operand === undefined) {
        return { ok: false, reason: `${operation} requires a value` };
      }
      if (isObject(operand) && !isArray(operand)) {
        return { ok: false, reason: `${operation} value must be a literal or a list` };
      }
      return { ok: true, write: { kind: operation, value: operand, dataType } };
    }
    case AttributeWriteOperation.Add: {
      if (!isNumber(operand) || !Number.isFinite(operand)) {
        return { ok: false, reason: 'add requires a finite number' };
      }
      return { ok: true, write: { kind: 'add', value: operand } };
    }
    case AttributeWriteOperation.Union:
    case AttributeWriteOperation.Remove: {
      const values = toScalarList(operand);
      if (!values) {
        return { ok: false, reason: `${operation} requires a scalar or a list of scalars` };
      }
      return { ok: true, write: { kind: operation, values } };
    }
    default:
      return { ok: false, reason: 'unknown operation' };
  }
};

/**
 * The type a write would give a definition created for it: the operation
 * decides where it can, otherwise the pinned `data_type`, otherwise inference
 * from the value (the existing strict rule — never widened, ADR 0017 §3).
 */
export const inferWriteDataType = (write: AttributeWrite): BizAttributeTypes => {
  switch (write.kind) {
    case 'add':
      return BizAttributeTypes.Number;
    case 'union':
    case 'remove':
      return BizAttributeTypes.List;
    case 'set':
    case 'set_once':
      return write.dataType ?? getAttributeType(write.value);
    case 'literal':
      return getAttributeType(write.value);
    default:
      return BizAttributeTypes.Nil;
  }
};

// Full ISO 8601 date-time: calendar date, `T`, time with optional fraction of
// any length, and a mandatory zone (`Z` or ±hh[:]mm). Date-only strings and
// epoch numbers are rejected as ambiguous.
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:[Zz]|([+-])(\d{2}):?(\d{2}))$/;
// The form values were always stored in: UTC `Z`, seconds, optional milliseconds.
const STRICT_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const daysInMonth = (year: number, month: number): number => {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

/**
 * Accept any ISO 8601 date-time and return it in UTC `Z`, or undefined when
 * the string is not a valid date-time. Calendar fields are range-checked so a
 * parser cannot "repair" `2024-13-45`. A value already in the strict UTC form
 * is returned as sent: that is the form values were stored in before offsets
 * were accepted, and rewriting `…:00Z` to `…:00.000Z` would make every such
 * stored value look changed on its next write. Only an offset, a lowercase
 * marker or another fraction length is rewritten, to millisecond precision.
 */
export const normalizeIsoDateTime = (value: unknown): string | undefined => {
  if (!isString(value)) {
    return undefined;
  }
  const match = ISO_DATE_TIME.exec(value);
  if (!match) {
    return undefined;
  }
  const [, y, mo, d, h, mi, s, fraction, sign, oh, om] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return undefined;
  }
  if (hour > 23 || minute > 59 || second > 59) {
    return undefined;
  }
  const millis = fraction ? Number(`${fraction}00`.slice(0, 3)) : 0;
  let offsetMinutes = 0;
  if (sign) {
    const offsetHours = Number(oh);
    const offsetMins = Number(om);
    if (offsetHours > 14 || offsetMins > 59) {
      return undefined;
    }
    offsetMinutes = (sign === '-' ? -1 : 1) * (offsetHours * 60 + offsetMins);
  }
  if (STRICT_UTC.test(value)) {
    return value;
  }
  // Not Date.UTC(year, …): it reads a year of 0–99 as 1900–1999, so a
  // zero-value time such as 0001-01-01 would come out as 1901.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millis);
  return new Date(date.getTime() - offsetMinutes * 60_000).toISOString();
};

export type AttributeCoercion = { ok: true; value: unknown } | { ok: false };

/**
 * Fit a value into a target type without losing information (ADR 0017 §3):
 * numbers and booleans stringify; only a round-tripping numeric string
 * becomes a number; `'true'` / `'false'` become booleans; any ISO 8601
 * date-time normalises to UTC (a strict UTC value stays as sent); a scalar
 * wraps into a one-element list, whose null holes are dropped. Everything
 * else is a mismatch.
 */
export const coerceAttributeValue = (
  value: unknown,
  target: BizAttributeTypes,
): AttributeCoercion => {
  switch (target) {
    case BizAttributeTypes.String:
      if (isString(value)) {
        return { ok: true, value };
      }
      if (isNumber(value) || isBoolean(value)) {
        return { ok: true, value: String(value) };
      }
      return { ok: false };
    case BizAttributeTypes.Number:
      if (isNumber(value)) {
        return Number.isFinite(value) ? { ok: true, value } : { ok: false };
      }
      if (isString(value) && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) && String(parsed) === value
          ? { ok: true, value: parsed }
          : { ok: false };
      }
      return { ok: false };
    case BizAttributeTypes.Boolean:
      if (isBoolean(value)) {
        return { ok: true, value };
      }
      if (value === 'true' || value === 'false') {
        return { ok: true, value: value === 'true' };
      }
      return { ok: false };
    case BizAttributeTypes.DateTime: {
      const normalized = normalizeIsoDateTime(value);
      return normalized ? { ok: true, value: normalized } : { ok: false };
    }
    case BizAttributeTypes.List: {
      const values = toScalarList(value);
      return values ? { ok: true, value: values } : { ok: false };
    }
    default:
      return { ok: false };
  }
};

/** Sentinel returned by applyAttributeWrite when the key should be removed. */
export const ATTRIBUTE_DELETE = Symbol('attribute-delete');

const dedupe = (values: AttributeScalar[]): AttributeScalar[] => {
  const result: AttributeScalar[] = [];
  for (const item of values) {
    if (!result.some((existing) => isEqual(existing, item))) {
      result.push(item);
    }
  }
  return result;
};

/**
 * Compute the stored value after applying a parsed write to the current one.
 * `current` is `undefined` when the key is absent. Returns ATTRIBUTE_DELETE
 * when the key must be dropped. Callers coerce `set` / `set_once` / literal
 * values to the definition type before calling; `add` / `union` / `remove`
 * are only valid against Number / List definitions, so `current` is either
 * absent or already of that shape.
 */
export const applyAttributeWrite = (
  current: unknown,
  write: AttributeWrite,
): unknown | typeof ATTRIBUTE_DELETE => {
  switch (write.kind) {
    case 'delete':
      return ATTRIBUTE_DELETE;
    case 'literal':
    case 'set':
      return write.value;
    case 'set_once':
      return current === undefined ? write.value : current;
    case 'add':
      return (isNumber(current) ? current : 0) + write.value;
    case 'union': {
      const existing = toScalarList(current) ?? [];
      return dedupe([...existing, ...write.values]);
    }
    case 'remove': {
      if (current === undefined) {
        return ATTRIBUTE_DELETE;
      }
      const existing = toScalarList(current) ?? [];
      return existing.filter((item) => !write.values.some((removed) => isEqual(removed, item)));
    }
    default:
      return current;
  }
};

// === Client-side helpers (SDK) ===

/**
 * Whether a wire value is (or is meant as) an operation object: any plain
 * object. Arrays and Dates are literals. The SDK must always send such a key
 * — it cannot know the server-side result to compare against.
 */
export const isAttributeOperation = (value: unknown): boolean => {
  return isPlainObject(value);
};

/**
 * Merge a payload the server accepted into the SDK's local attribute cache,
 * which exists only for change detection. Literals are cached; a key that
 * carried an operation is dropped, because its stored value is unknown here.
 */
export const mergeAttributeCache = <T extends Record<string, unknown>>(
  cache: T,
  accepted: T,
): T => {
  const next: Record<string, unknown> = { ...cache };
  for (const codeName of Object.keys(accepted)) {
    const value = accepted[codeName];
    if (isAttributeOperation(value)) {
      delete next[codeName];
    } else {
      next[codeName] = value;
    }
  }
  return next as T;
};

/** Whether the payload needs sending: any operation, or any literal that differs from the cache. */
export const attributeCacheChanged = (
  cache: Record<string, unknown>,
  incoming: Record<string, unknown>,
): boolean => {
  if (Object.values(incoming).some(isAttributeOperation)) {
    return true;
  }
  return !isEqual(cache, { ...cache, ...incoming });
};

export type LegacyAttributeRewrite = { codeName: string; from: string; to: string };

/**
 * Rewrite the deprecated operation spellings the SDK still accepts into the
 * current vocabulary before sending: `subtract: n` → `add: -n`, `append` /
 * `prepend` → `union`, and a numeric string in `add` → number. Anything else
 * is passed through untouched for the server to judge. `onRewrite` receives
 * one call per key whose spelling was deprecated, so the SDK can warn; a
 * numeric `add` string is corrected silently — `add` is not deprecated.
 */
export const normalizeLegacyAttributeWrites = (
  attributes: Record<string, unknown>,
  onRewrite?: (rewrite: LegacyAttributeRewrite) => void,
): Record<string, unknown> => {
  let result: Record<string, unknown> | undefined;
  for (const codeName of Object.keys(attributes)) {
    const value = attributes[codeName];
    if (!isPlainObject(value)) {
      continue;
    }
    const keys = Object.keys(value);
    if (keys.length !== 1) {
      continue;
    }
    const key = keys[0];
    let rewritten: Record<string, unknown> | undefined;
    if (key === 'subtract' && isNumber(value.subtract)) {
      rewritten = { add: -(value.subtract as number) };
    } else if (key === 'subtract' && isString(value.subtract) && value.subtract.trim() !== '') {
      const parsed = Number(value.subtract);
      rewritten = Number.isFinite(parsed) ? { add: -parsed } : undefined;
    } else if (key === 'append' || key === 'prepend') {
      rewritten = { union: value[key] };
    } else if (key === 'add' && isString(value.add) && value.add.trim() !== '') {
      const parsed = Number(value.add);
      rewritten = Number.isFinite(parsed) ? { add: parsed } : undefined;
    }
    if (!rewritten) {
      continue;
    }
    result = result ?? { ...attributes };
    result[codeName] = rewritten;
    const to = Object.keys(rewritten)[0];
    if (to !== key) {
      onRewrite?.({ codeName, from: key, to });
    }
  }
  return result ?? attributes;
};
