import { RulesCondition } from '@usertour/types';
import {
  evaluateTimeCondition,
  isTimeConditionDataV2,
  isTimeConditionDataLegacy,
  convertTimeConditionLegacyToV2,
  normalizeTimeConditionData,
} from '../conditions/time';

describe('Time Condition Evaluation', () => {
  // Use local time to match legacy format behavior (MM/dd/yyyy with local timezone)
  const mockNow = new Date(2024, 0, 15, 12, 0, 0); // 2024-01-15 12:00:00 local time

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // Type Guards Tests
  // ============================================================================

  describe('Type Guards', () => {
    test('isTimeConditionDataV2 should return true for new format', () => {
      expect(isTimeConditionDataV2({ startTime: '2024-01-15T10:00:00Z' })).toBe(true);
      expect(isTimeConditionDataV2({ endTime: '2024-01-15T14:00:00Z' })).toBe(true);
      expect(
        isTimeConditionDataV2({
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T14:00:00Z',
        }),
      ).toBe(true);
    });

    test('isTimeConditionDataV2 should return false for legacy format', () => {
      expect(isTimeConditionDataV2({ startDate: '01/15/2024' })).toBe(false);
      expect(isTimeConditionDataV2({})).toBe(false);
    });

    test('isTimeConditionDataLegacy should return true for legacy format', () => {
      expect(isTimeConditionDataLegacy({ startDate: '01/15/2024' })).toBe(true);
      expect(isTimeConditionDataLegacy({ startDateHour: '10' })).toBe(true);
      expect(
        isTimeConditionDataLegacy({
          startDate: '01/15/2024',
          startDateHour: '10',
          startDateMinute: '00',
        }),
      ).toBe(true);
    });

    test('isTimeConditionDataLegacy should return false for new format', () => {
      expect(isTimeConditionDataLegacy({ startTime: '2024-01-15T10:00:00Z' })).toBe(false);
      expect(isTimeConditionDataLegacy({})).toBe(false);
    });
  });

  // ============================================================================
  // Format Conversion Tests
  // ============================================================================

  describe('Format Conversion', () => {
    test('convertTimeConditionLegacyToV2 should convert valid legacy data', () => {
      const legacyData = {
        startDate: '01/15/2024',
        startDateHour: '10',
        startDateMinute: '00',
        endDate: '01/15/2024',
        endDateHour: '14',
        endDateMinute: '00',
      };

      const result = convertTimeConditionLegacyToV2(legacyData);
      expect(result).not.toBeNull();
      expect(result?.startTime).toBeDefined();
      expect(result?.endTime).toBeDefined();
      expect(result?.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('convertTimeConditionLegacyToV2 should convert legacy data without end time', () => {
      const legacyData = {
        startDate: '01/15/2024',
        startDateHour: '10',
        startDateMinute: '00',
        endDate: '',
        endDateHour: '',
        endDateMinute: '',
      };

      const result = convertTimeConditionLegacyToV2(legacyData);
      expect(result).not.toBeNull();
      expect(result?.startTime).toBeDefined();
      expect(result?.endTime).toBeUndefined();
    });

    test('convertTimeConditionLegacyToV2 should return null for invalid data', () => {
      expect(
        convertTimeConditionLegacyToV2({
          startDate: '',
          startDateHour: '10',
          startDateMinute: '00',
        }),
      ).toBeNull();
      expect(
        convertTimeConditionLegacyToV2({
          startDate: '01/15/2024',
          startDateHour: '',
          startDateMinute: '00',
        }),
      ).toBeNull();
      expect(
        convertTimeConditionLegacyToV2({
          startDate: '01/15/2024',
          startDateHour: '10',
          startDateMinute: '',
        }),
      ).toBeNull();
    });

    test('normalizeTimeConditionData should return new format as-is', () => {
      const newFormat = { startTime: '2024-01-15T10:00:00Z', endTime: '2024-01-15T14:00:00Z' };
      expect(normalizeTimeConditionData(newFormat)).toEqual(newFormat);
    });

    test('normalizeTimeConditionData should convert legacy format', () => {
      const legacyData = {
        startDate: '01/15/2024',
        startDateHour: '10',
        startDateMinute: '00',
      };
      const result = normalizeTimeConditionData(legacyData);
      expect(result).not.toBeNull();
      expect(result?.startTime).toBeDefined();
    });

    test('normalizeTimeConditionData should return null for invalid data', () => {
      expect(normalizeTimeConditionData(null)).toBeNull();
      expect(normalizeTimeConditionData(undefined)).toBeNull();
      expect(normalizeTimeConditionData({})).toBeNull();
    });
  });

  // ============================================================================
  // Legacy Format Evaluation Tests
  // ============================================================================

  describe('Legacy Format Evaluation', () => {
    test('should return true when current time is after start time and no end time', () => {
      const rules: RulesCondition = {
        id: 'condition-1',
        type: 'time',
        data: {
          startDate: '01/15/2024',
          startDateHour: '10',
          startDateMinute: '00',
          endDate: '',
          endDateHour: '',
          endDateMinute: '',
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(true);
    });

    test('should return true when current time is within start and end time range', () => {
      const rules: RulesCondition = {
        id: 'condition-2',
        type: 'time',
        data: {
          startDate: '01/15/2024',
          startDateHour: '10',
          startDateMinute: '00',
          endDate: '01/15/2024',
          endDateHour: '14',
          endDateMinute: '00',
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(true);
    });

    test('should return false when current time is before start time', () => {
      const rules: RulesCondition = {
        id: 'condition-3',
        type: 'time',
        data: {
          startDate: '01/15/2024',
          startDateHour: '15',
          startDateMinute: '00',
          endDate: '',
          endDateHour: '',
          endDateMinute: '',
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should return false when current time is after end time', () => {
      const rules: RulesCondition = {
        id: 'condition-4',
        type: 'time',
        data: {
          startDate: '01/15/2024',
          startDateHour: '10',
          startDateMinute: '00',
          endDate: '01/15/2024',
          endDateHour: '11',
          endDateMinute: '00',
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should return false when start date is missing', () => {
      const rules: RulesCondition = {
        id: 'condition-5',
        type: 'time',
        data: {
          startDate: '',
          startDateHour: '10',
          startDateMinute: '00',
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should return false when start hour is missing', () => {
      const rules: RulesCondition = {
        id: 'condition-6',
        type: 'time',
        data: {
          startDate: '01/15/2024',
          startDateHour: '',
          startDateMinute: '00',
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should handle empty endDate string', () => {
      const rules: RulesCondition = {
        id: 'condition-7',
        type: 'time',
        data: {
          startDate: '01/15/2024',
          startDateHour: '10',
          startDateMinute: '00',
          endDate: '',
          endDateHour: '00',
          endDateMinute: '00',
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(true);
    });

    test('should handle cross-day time range', () => {
      // Set time to 23:00 (within the cross-day range 22:00 - 02:00 next day)
      const crossDayTime = new Date(2024, 0, 15, 23, 0, 0);
      jest.setSystemTime(crossDayTime);

      const rules: RulesCondition = {
        id: 'condition-8',
        type: 'time',
        data: {
          startDate: '01/15/2024',
          startDateHour: '22',
          startDateMinute: '00',
          endDate: '01/16/2024',
          endDateHour: '02',
          endDateMinute: '00',
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(true);

      // Restore original mock time
      jest.setSystemTime(mockNow);
    });
  });

  // ============================================================================
  // New Format (ISO 8601) Evaluation Tests
  // ============================================================================

  describe('New Format (ISO 8601) Evaluation', () => {
    test('should return true when current time is after start time and no end time', () => {
      // Use same time point as mockNow but convert to ISO string
      // mockNow is 2024-01-15 12:00:00 local time
      const startTime = new Date(2024, 0, 15, 10, 0, 0).toISOString();
      const rules: RulesCondition = {
        id: 'condition-v2-1',
        type: 'time',
        data: {
          startTime,
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(true);
    });

    test('should return true when current time is within start and end time range', () => {
      // Use same time point as mockNow but convert to ISO string
      const startTime = new Date(2024, 0, 15, 10, 0, 0).toISOString();
      const endTime = new Date(2024, 0, 15, 14, 0, 0).toISOString();
      const rules: RulesCondition = {
        id: 'condition-v2-2',
        type: 'time',
        data: {
          startTime,
          endTime,
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(true);
    });

    test('should return false when current time is before start time', () => {
      const startTime = new Date(2024, 0, 15, 15, 0, 0).toISOString();
      const rules: RulesCondition = {
        id: 'condition-v2-3',
        type: 'time',
        data: {
          startTime,
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should return false when current time is after end time', () => {
      const startTime = new Date(2024, 0, 15, 10, 0, 0).toISOString();
      const endTime = new Date(2024, 0, 15, 11, 0, 0).toISOString();
      const rules: RulesCondition = {
        id: 'condition-v2-4',
        type: 'time',
        data: {
          startTime,
          endTime,
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should return false when startTime is missing', () => {
      const endTime = new Date(2024, 0, 15, 14, 0, 0).toISOString();
      const rules: RulesCondition = {
        id: 'condition-v2-5',
        type: 'time',
        data: {
          endTime,
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should return false when startTime is invalid', () => {
      const rules: RulesCondition = {
        id: 'condition-v2-6',
        type: 'time',
        data: {
          startTime: 'invalid-date',
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should handle timezone in ISO format', () => {
      const rules: RulesCondition = {
        id: 'condition-v2-7',
        type: 'time',
        data: {
          startTime: '2024-01-15T10:00:00+08:00',
          endTime: '2024-01-15T14:00:00+08:00',
        },
      };

      // Result depends on system timezone, but should not throw
      expect(typeof evaluateTimeCondition(rules)).toBe('boolean');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    test('should return false for empty data', () => {
      const rules: RulesCondition = {
        id: 'condition-edge-1',
        type: 'time',
        data: {},
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should return false for null data', () => {
      const rules: RulesCondition = {
        id: 'condition-edge-2',
        type: 'time',
        data: null as any,
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should return false for invalid date format in legacy', () => {
      const rules: RulesCondition = {
        id: 'condition-edge-3',
        type: 'time',
        data: {
          startDate: 'invalid-date',
          startDateHour: '10',
          startDateMinute: '00',
        },
      };

      expect(evaluateTimeCondition(rules)).toBe(false);
    });

    test('should handle invalid month/day in legacy format', () => {
      const rules: RulesCondition = {
        id: 'condition-edge-4',
        type: 'time',
        data: {
          startDate: '13/32/2024', // Invalid month and day
          startDateHour: '10',
          startDateMinute: '00',
        },
      };

      // JavaScript Date constructor handles overflow, but isValid should catch invalid dates
      expect(evaluateTimeCondition(rules)).toBe(false);
    });
  });
});
