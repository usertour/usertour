import { BizAttributeTypes } from '@usertour/types';
import { isValid, parseISO, parse } from 'date-fns';
import { isNull } from './type-utils';

const isValidYear = (date: Date): boolean => {
  const year = date.getFullYear();
  return year >= 1900 && year <= 2100;
};

const tryParseDate = (parser: () => Date): boolean => {
  try {
    const date = parser();
    return isValid(date) && isValidYear(date);
  } catch {
    return false;
  }
};

function isDateString(dateStr: string): boolean {
  // Quick rejections
  if (!Number.isNaN(Number(dateStr)) || dateStr.length < 10) {
    return false;
  }

  // Common date formats
  const dateFormats = [
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    "yyyy-MM-dd'T'HH:mm:ss'Z'",
    "yyyy-MM-dd'T'HH:mm:ss.SSS",
    "yyyy-MM-dd'T'HH:mm:ss",
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yyyy/MM/dd',
    'MM-dd-yyyy',
    'dd-MM-yyyy',
  ];

  // Try ISO format first (most common)
  if (tryParseDate(() => parseISO(dateStr))) {
    return true;
  }

  // Try other formats
  return dateFormats.some((format) => tryParseDate(() => parse(dateStr, format, new Date())));
}

export const getAttributeType = (attribute: any): number => {
  const t = typeof attribute;
  if (t === 'number') {
    return BizAttributeTypes.Number;
  }
  if (t === 'string') {
    if (isDateString(attribute)) {
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
