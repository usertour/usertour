import { BizAttributeTypes } from '@usertour/types';
import { isValid, parseISO } from 'date-fns';
import { isNull } from './type-utils';

/**
 * Validate if a value is a valid ISO 8601 date string in UTC
 * According to the specification: datetime must be stored as ISO 8601 in UTC
 *
 * Following industry best practices (Stripe, GitHub, AWS, etc.), we only accept
 * the 'Z' format for UTC, not '+00:00' or '-00:00', for consistency and simplicity.
 *
 * Why we need additional validation after parseISO:
 * 1. parseISO is lenient - it may parse invalid dates (e.g., "2024-13-45") and return a valid Date object
 *    by auto-correcting (e.g., "2024-13-45" becomes "2025-01-14")
 * 2. We need to ensure the input string exactly matches what would be produced by toISOString()
 *    This prevents accepting malformed dates that get "fixed" by the parser
 * 3. The regex pattern ensures strict format compliance (must have T and Z)
 * 4. The comparison ensures no date normalization occurred (e.g., invalid month/day corrections)
 */
export const isValidISO8601 = (value: any): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  // ISO 8601 UTC format: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ
  // Must contain 'T' separator and end with 'Z' (UTC indicator)
  // Following industry practice: only accept 'Z' format, not '+00:00'
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

  if (!iso8601Pattern.test(value)) {
    return false;
  }

  // Validate that it's a valid date
  try {
    const date = parseISO(value);
    if (!isValid(date)) {
      return false;
    }

    // Critical: Ensure the parsed date matches the input string exactly
    // This prevents accepting invalid dates that parseISO "fixes"
    // Example: "2024-13-45T00:00:00.000Z" would be parsed as a valid date,
    // but toISOString() would produce a different string, so we reject it
    const isoString = date.toISOString();
    // Allow some flexibility: accept with or without milliseconds
    const normalizedInput = value.replace(/\.\d{3}Z$/, 'Z');
    const normalizedIso = isoString.replace(/\.\d{3}Z$/, 'Z');

    return normalizedInput === normalizedIso || value === isoString;
  } catch {
    return false;
  }
};

export const getAttributeType = (attribute: any): number => {
  const t = typeof attribute;
  if (t === 'number') {
    return BizAttributeTypes.Number;
  }
  if (t === 'string') {
    // According to the specification: datetime must be stored as ISO 8601 in UTC
    // Only recognize ISO 8601 UTC format as DateTime, other formats should be treated as String
    if (isValidISO8601(attribute)) {
      return BizAttributeTypes.DateTime;
    }
    return BizAttributeTypes.String;
  }
  if (t === 'boolean') {
    return BizAttributeTypes.Boolean;
  }
  if (t === 'object' && Array.isArray(attribute)) {
    return BizAttributeTypes.List;
  }
  return BizAttributeTypes.Nil;
};

export const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const filterNullAttributes = (attributes: Record<string, any>) => {
  const attrs: Record<string, any> = {};
  for (const key in attributes) {
    const v = attributes[key];
    if (!isNull(v)) {
      attrs[key] = v;
    }
  }
  return attrs;
};
