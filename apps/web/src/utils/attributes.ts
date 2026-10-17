import type { StoredAttributeValue } from '@usertour/types';

/** A stored attribute value as display text: null and undefined read as empty, a list joins with "; ". */
export const attributeText = (value: StoredAttributeValue | undefined): string => {
  if (value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.filter((item) => item != null).join('; ');
  }
  return String(value);
};

/** A stored attribute value as a number, or undefined when it is not one. */
export const attributeNumber = (value: StoredAttributeValue | undefined): number | undefined => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
};

/** A stored attribute value as a list of texts; a scalar is a one-item list, nothing is an empty one. */
export const attributeTextList = (value: StoredAttributeValue | undefined): string[] => {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => item != null).map(String);
  }
  return [String(value)];
};
