import { BizAttributeTypes } from '@usertour/types';
import { getAttributeType } from '../attribute';

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

  describe('DateTime type', () => {
    test('should return DateTime for ISO 8601 format with time', () => {
      expect(getAttributeType('2024-12-11T16:00:00.000Z')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return DateTime for ISO 8601 format without milliseconds', () => {
      expect(getAttributeType('2024-12-11T16:00:00Z')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return DateTime for ISO 8601 format without timezone', () => {
      expect(getAttributeType('2024-12-11T16:00:00')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return DateTime for ISO 8601 date only', () => {
      expect(getAttributeType('2024-12-11')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return DateTime for MM/DD/YYYY format', () => {
      expect(getAttributeType('12/12/2024')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return DateTime for YYYY/MM/DD format', () => {
      expect(getAttributeType('2024/12/11')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return DateTime for MM-DD-YYYY format', () => {
      expect(getAttributeType('12-12-2024')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return DateTime for DD-MM-YYYY format', () => {
      expect(getAttributeType('11-12-2024')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return String for invalid date string', () => {
      expect(getAttributeType('2024-13-45')).toBe(BizAttributeTypes.String);
    });

    test('should return String for date string with invalid year (< 1900)', () => {
      expect(getAttributeType('1899-12-11')).toBe(BizAttributeTypes.String);
    });

    test('should return String for date string with invalid year (> 2100)', () => {
      expect(getAttributeType('2101-12-11')).toBe(BizAttributeTypes.String);
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

    test('should return DateTime for string that is exactly 10 characters and valid date', () => {
      expect(getAttributeType('2024-12-11')).toBe(BizAttributeTypes.DateTime);
    });

    test('should return String for string that contains date-like pattern but invalid', () => {
      expect(getAttributeType('2024-99-99')).toBe(BizAttributeTypes.String);
    });

    test('should return String for string starting with numbers but not a date', () => {
      expect(getAttributeType('2024abc-def-ghi')).toBe(BizAttributeTypes.String);
    });
  });
});
