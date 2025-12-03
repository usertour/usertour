import { BizAttributeTypes } from '@usertour/types';
import { getAttributeType, isValidISO8601 } from '../attribute';

describe('getAttributeType', () => {
  describe('Number type', () => {
    test('should return Number for integer', () => {
      expect(getAttributeType(42)).toBe(BizAttributeTypes.Number);
    });

    test('should return Number for float', () => {
      expect(getAttributeType(3.14)).toBe(BizAttributeTypes.Number);
    });

    test('should return Number for negative number', () => {
      expect(getAttributeType(-10)).toBe(BizAttributeTypes.Number);
    });

    test('should return Number for zero', () => {
      expect(getAttributeType(0)).toBe(BizAttributeTypes.Number);
    });
  });

  describe('String type', () => {
    test('should return String for regular string', () => {
      expect(getAttributeType('hello')).toBe(BizAttributeTypes.String);
    });

    test('should return String for string with special characters', () => {
      expect(getAttributeType('Nanjing-user-189327')).toBe(BizAttributeTypes.String);
    });

    test('should return String for email-like string', () => {
      expect(getAttributeType('user@example.com')).toBe(BizAttributeTypes.String);
    });

    test('should return String for short string (< 10 chars)', () => {
      expect(getAttributeType('short')).toBe(BizAttributeTypes.String);
    });

    test('should return String for string that looks like number but is not pure number', () => {
      expect(getAttributeType('123abc')).toBe(BizAttributeTypes.String);
    });
  });

  describe('DateTime type - ISO 8601 UTC only', () => {
    test('should return DateTime for ISO 8601 format with milliseconds and Z', () => {
      expect(getAttributeType('2024-12-11T16:00:00.000Z')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return DateTime for ISO 8601 format without milliseconds but with Z', () => {
      expect(getAttributeType('2024-12-11T16:00:00Z')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return DateTime for ISO 8601 format at midnight', () => {
      expect(getAttributeType('2024-12-11T00:00:00.000Z')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return DateTime for ISO 8601 format at end of day', () => {
      expect(getAttributeType('2024-12-11T23:59:59.999Z')).toBe(BizAttributeTypes.DateTime);
    });

    // Non-ISO 8601 UTC formats should be treated as String
    test('should return String for ISO 8601 format without timezone (no Z)', () => {
      expect(getAttributeType('2024-12-11T16:00:00')).toBe(BizAttributeTypes.String);
    });

    test('should return String for ISO 8601 date only (no T and Z)', () => {
      expect(getAttributeType('2024-12-11')).toBe(BizAttributeTypes.String);
    });

    test('should return String for MM/DD/YYYY format', () => {
      expect(getAttributeType('12/12/2024')).toBe(BizAttributeTypes.String);
    });

    test('should return String for YYYY/MM/DD format', () => {
      expect(getAttributeType('2024/12/11')).toBe(BizAttributeTypes.String);
    });

    test('should return String for MM-DD-YYYY format', () => {
      expect(getAttributeType('12-12-2024')).toBe(BizAttributeTypes.String);
    });

    test('should return String for DD-MM-YYYY format', () => {
      expect(getAttributeType('11-12-2024')).toBe(BizAttributeTypes.String);
    });

    test('should return String for invalid ISO 8601 format', () => {
      expect(getAttributeType('2024-13-45T00:00:00.000Z')).toBe(BizAttributeTypes.String);
    });

    test('should return String for ISO 8601 with timezone offset (not UTC)', () => {
      expect(getAttributeType('2024-12-11T16:00:00.000+08:00')).toBe(BizAttributeTypes.String);
    });

    test('should return String for ISO 8601 with lowercase z', () => {
      expect(getAttributeType('2024-12-11T16:00:00.000z')).toBe(BizAttributeTypes.String);
    });
  });

  describe('Boolean type', () => {
    test('should return Boolean for true', () => {
      expect(getAttributeType(true)).toBe(BizAttributeTypes.Boolean);
    });

    test('should return Boolean for false', () => {
      expect(getAttributeType(false)).toBe(BizAttributeTypes.Boolean);
    });
  });

  describe('List type', () => {
    test('should return List for array of strings', () => {
      expect(getAttributeType(['a', 'b', 'c'])).toBe(BizAttributeTypes.List);
    });

    test('should return List for array of numbers', () => {
      expect(getAttributeType([1, 2, 3])).toBe(BizAttributeTypes.List);
    });

    test('should return List for array of mixed types', () => {
      expect(getAttributeType([1, 'a', true])).toBe(BizAttributeTypes.List);
    });

    test('should return List for empty array', () => {
      expect(getAttributeType([])).toBe(BizAttributeTypes.List);
    });
  });

  describe('Nil type', () => {
    test('should return Nil for null', () => {
      expect(getAttributeType(null)).toBe(BizAttributeTypes.Nil);
    });

    test('should return Nil for undefined', () => {
      expect(getAttributeType(undefined)).toBe(BizAttributeTypes.Nil);
    });

    test('should return Nil for object (non-array)', () => {
      expect(getAttributeType({ key: 'value' })).toBe(BizAttributeTypes.Nil);
    });

    test('should return Nil for function', () => {
      expect(getAttributeType(() => {})).toBe(BizAttributeTypes.Nil);
    });

    test('should return Nil for Symbol', () => {
      expect(getAttributeType(Symbol('test'))).toBe(BizAttributeTypes.Nil);
    });
  });

  describe('Edge cases', () => {
    test('should return String for string that is a number but length < 10', () => {
      expect(getAttributeType('12345')).toBe(BizAttributeTypes.String);
    });

    test('should return String for string that is exactly 9 characters', () => {
      expect(getAttributeType('123456789')).toBe(BizAttributeTypes.String);
    });

    test('should return String for string that is exactly 10 characters but not ISO 8601 UTC', () => {
      expect(getAttributeType('2024-12-11')).toBe(BizAttributeTypes.String);
    });

    test('should return String for string that contains date-like pattern but invalid', () => {
      expect(getAttributeType('2024-99-99')).toBe(BizAttributeTypes.String);
    });

    test('should return String for string starting with numbers but not a date', () => {
      expect(getAttributeType('2024abc-def-ghi')).toBe(BizAttributeTypes.String);
    });
  });
});

describe('isValidISO8601', () => {
  describe('Valid ISO 8601 UTC formats', () => {
    test('should return true for ISO 8601 with milliseconds and Z', () => {
      expect(isValidISO8601('2024-12-11T16:00:00.000Z')).toBe(true);
    });

    test('should return true for ISO 8601 without milliseconds but with Z', () => {
      expect(isValidISO8601('2024-12-11T16:00:00Z')).toBe(true);
    });

    test('should return true for ISO 8601 at midnight', () => {
      expect(isValidISO8601('2024-12-11T00:00:00.000Z')).toBe(true);
    });

    test('should return true for ISO 8601 at end of day', () => {
      expect(isValidISO8601('2024-12-11T23:59:59.999Z')).toBe(true);
    });

    test('should return true for ISO 8601 with single digit month and day', () => {
      expect(isValidISO8601('2024-01-01T00:00:00.000Z')).toBe(true);
    });

    test('should return true for ISO 8601 in year 1900', () => {
      expect(isValidISO8601('1900-01-01T00:00:00.000Z')).toBe(true);
    });

    test('should return true for ISO 8601 in year 2100', () => {
      expect(isValidISO8601('2100-12-31T23:59:59.999Z')).toBe(true);
    });

    test('should return true for ISO 8601 with year before 1900', () => {
      expect(isValidISO8601('1800-01-01T00:00:00.000Z')).toBe(true);
    });

    test('should return true for ISO 8601 with year after 2100', () => {
      expect(isValidISO8601('2200-01-01T00:00:00.000Z')).toBe(true);
    });
  });

  describe('Invalid ISO 8601 UTC formats', () => {
    test('should return false for non-string values', () => {
      expect(isValidISO8601(null)).toBe(false);
      expect(isValidISO8601(undefined)).toBe(false);
      expect(isValidISO8601(123)).toBe(false);
      expect(isValidISO8601(new Date())).toBe(false);
      expect(isValidISO8601({})).toBe(false);
    });

    test('should return false for ISO 8601 without T separator', () => {
      expect(isValidISO8601('2024-12-11 16:00:00.000Z')).toBe(false);
      expect(isValidISO8601('2024-12-11')).toBe(false);
    });

    test('should return false for ISO 8601 without Z (UTC indicator)', () => {
      expect(isValidISO8601('2024-12-11T16:00:00.000')).toBe(false);
      expect(isValidISO8601('2024-12-11T16:00:00')).toBe(false);
    });

    test('should return false for ISO 8601 with timezone offset (including +00:00)', () => {
      expect(isValidISO8601('2024-12-11T16:00:00.000+08:00')).toBe(false);
      expect(isValidISO8601('2024-12-11T16:00:00.000-05:00')).toBe(false);
      expect(isValidISO8601('2024-12-11T16:00:00.000+01:00')).toBe(false);
      expect(isValidISO8601('2024-12-11T16:00:00.000-01:00')).toBe(false);
      // Even +00:00 and -00:00 are rejected (only Z format is accepted)
      expect(isValidISO8601('2024-12-11T16:00:00.000+00:00')).toBe(false);
      expect(isValidISO8601('2024-12-11T16:00:00.000-00:00')).toBe(false);
      expect(isValidISO8601('2024-12-11T16:00:00+00:00')).toBe(false);
    });

    test('should return false for ISO 8601 with lowercase z', () => {
      expect(isValidISO8601('2024-12-11T16:00:00.000z')).toBe(false);
    });

    test('should return false for invalid date values', () => {
      expect(isValidISO8601('2024-13-45T00:00:00.000Z')).toBe(false);
      expect(isValidISO8601('2024-02-30T00:00:00.000Z')).toBe(false);
      expect(isValidISO8601('2024-00-00T00:00:00.000Z')).toBe(false);
    });

    test('should return false for other date formats', () => {
      expect(isValidISO8601('12/12/2024')).toBe(false);
      expect(isValidISO8601('2024/12/11')).toBe(false);
      expect(isValidISO8601('12-12-2024')).toBe(false);
      expect(isValidISO8601('11-12-2024')).toBe(false);
    });

    test('should return false for malformed ISO 8601 strings', () => {
      expect(isValidISO8601('2024-12-11T')).toBe(false);
      expect(isValidISO8601('T16:00:00.000Z')).toBe(false);
      expect(isValidISO8601('2024-12-11T16:00:00.Z')).toBe(false);
      expect(isValidISO8601('2024-12-11T16:00.000Z')).toBe(false);
      expect(isValidISO8601('2024-12-11T16:00:00.000')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isValidISO8601('')).toBe(false);
    });

    test('should return false for string that looks like ISO 8601 but has extra characters', () => {
      expect(isValidISO8601('2024-12-11T16:00:00.000Z extra')).toBe(false);
      expect(isValidISO8601('prefix 2024-12-11T16:00:00.000Z')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('should handle leap year correctly', () => {
      expect(isValidISO8601('2024-02-29T00:00:00.000Z')).toBe(true);
      expect(isValidISO8601('2023-02-29T00:00:00.000Z')).toBe(false);
    });

    test('should handle different time values correctly', () => {
      expect(isValidISO8601('2024-12-11T12:30:45.123Z')).toBe(true);
      expect(isValidISO8601('2024-12-11T00:00:00.000Z')).toBe(true);
      expect(isValidISO8601('2024-12-11T23:59:59.999Z')).toBe(true);
    });

    test('should handle milliseconds correctly', () => {
      expect(isValidISO8601('2024-12-11T16:00:00.000Z')).toBe(true);
      expect(isValidISO8601('2024-12-11T16:00:00.999Z')).toBe(true);
      expect(isValidISO8601('2024-12-11T16:00:00Z')).toBe(true);
    });
  });
});
