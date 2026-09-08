import { BizAttributeTypes } from '@usertour/types';

/**
 * Value conversion at the CRM boundary (ADR 0013 §6). Provider values arrive
 * as strings (HubSpot serializes every property as text); Usertour attribute
 * values are typed JSON. Conversions are total: anything unparseable becomes
 * null, so a bad remote value clears rather than poisons the local one.
 */

const HUBSPOT_LIST_SEPARATOR = ';';

/** Remote (string) → local attribute value for the mapped data type. */
export const remoteToLocalValue = (
  raw: string | null | undefined,
  dataType: number,
): string | number | boolean | string[] | null => {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  switch (dataType) {
    case BizAttributeTypes.Number: {
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    }
    case BizAttributeTypes.Boolean:
      return raw === 'true' ? true : raw === 'false' ? false : null;
    case BizAttributeTypes.DateTime: {
      // HubSpot sends datetimes as ISO strings or epoch milliseconds and
      // dates as YYYY-MM-DD (midnight UTC); normalize to ISO 8601 UTC.
      const millis = /^-?\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
      return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
    }
    case BizAttributeTypes.List:
      return raw
        .split(HUBSPOT_LIST_SEPARATOR)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    default:
      return String(raw);
  }
};

/** Provider property type for a Usertour-owned attribute (mirrors remotePropertyDefinitionFor). */
export const remoteTypeForDataType = (
  dataType: number,
): 'string' | 'number' | 'bool' | 'datetime' => {
  switch (dataType) {
    case BizAttributeTypes.Number:
      return 'number';
    case BizAttributeTypes.Boolean:
      return 'bool';
    case BizAttributeTypes.DateTime:
      return 'datetime';
    default:
      return 'string';
  }
};

/** Local attribute value → remote (string) for a property of the given definition type. */
export const localToRemoteValue = (
  value: unknown,
  remoteType: 'string' | 'number' | 'bool' | 'date' | 'datetime' | 'enumeration',
): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  switch (remoteType) {
    case 'number': {
      const number = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(number) ? String(number) : null;
    }
    case 'bool':
      return value === true || value === 'true' ? 'true' : 'false';
    case 'date': {
      const millis = Date.parse(String(value));
      return Number.isFinite(millis) ? new Date(millis).toISOString().slice(0, 10) : null;
    }
    case 'datetime': {
      const millis = Date.parse(String(value));
      return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
    }
    default:
      return Array.isArray(value) ? value.join(HUBSPOT_LIST_SEPARATOR) : String(value);
  }
};
