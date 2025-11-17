import {
  RulesCondition,
  TimeConditionData,
  TimeConditionDataV2,
  TimeConditionDataLegacy,
} from '@usertour/types';
import { isAfter, isBefore, isValid, parseISO } from 'date-fns';
import { isEmptyString, isNullish } from '../type-utils';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a value is empty (null, undefined, or empty string)
 */
function isEmpty(value: string | undefined | null): boolean {
  return isNullish(value) || isEmptyString(value);
}

/**
 * Check if all required fields are present and non-empty
 * @param data - TimeConditionDataLegacy object
 * @param type - 'start' to check start fields, 'end' to check end fields
 */
function hasRequiredFields(data: TimeConditionDataLegacy, type: 'start' | 'end'): boolean {
  if (type === 'start') {
    return (
      !isEmpty(data.startDate) && !isEmpty(data.startDateHour) && !isEmpty(data.startDateMinute)
    );
  }
  return !isEmpty(data.endDate) && !isEmpty(data.endDateHour) && !isEmpty(data.endDateMinute);
}

/**
 * Parse MM/dd/yyyy date string into components
 */
function parseLegacyDate(dateStr: string): { month: number; day: number; year: number } | null {
  const [month, day, year] = dateStr.split('/');
  if (!month || !day || !year) {
    return null;
  }
  return {
    month: Number.parseInt(month),
    day: Number.parseInt(day),
    year: Number.parseInt(year),
  };
}

/**
 * Create Date object from legacy format components
 * @param data - TimeConditionDataLegacy object
 * @param type - 'start' to use start fields, 'end' to use end fields
 */
function createLegacyDateTime(data: TimeConditionDataLegacy, type: 'start' | 'end'): Date | null {
  const dateStr = type === 'start' ? data.startDate : data.endDate;
  const hourStr = type === 'start' ? data.startDateHour : data.endDateHour;
  const minuteStr = type === 'start' ? data.startDateMinute : data.endDateMinute;

  if (!dateStr || !hourStr || !minuteStr) {
    return null;
  }

  const dateParts = parseLegacyDate(dateStr);
  if (!dateParts) {
    return null;
  }

  const dateTime = new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    Number.parseInt(hourStr),
    Number.parseInt(minuteStr),
    0,
  );

  return isValid(dateTime) ? dateTime : null;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if data is in new format (TimeConditionDataV2)
 * @param data - The data to check
 * @returns true if data has startTime or endTime fields
 */
export function isTimeConditionDataV2(data: any): data is TimeConditionDataV2 {
  return data && ('startTime' in data || 'endTime' in data);
}

/**
 * Type guard to check if data is in legacy format (TimeConditionDataLegacy)
 * @param data - The data to check
 * @returns true if data has startDate or startDateHour fields
 */
export function isTimeConditionDataLegacy(data: any): data is TimeConditionDataLegacy {
  return data && ('startDate' in data || 'startDateHour' in data);
}

// ============================================================================
// Format Conversion Utilities
// ============================================================================

/**
 * Convert legacy format to new format (ISO 8601)
 * @param legacyData - Legacy time condition data
 * @returns New format time condition data, or null if conversion fails
 */
export function convertTimeConditionLegacyToV2(
  legacyData: TimeConditionDataLegacy,
): TimeConditionDataV2 | null {
  try {
    // Validate and convert start time
    if (!hasRequiredFields(legacyData, 'start')) {
      return null;
    }

    const startDateTime = createLegacyDateTime(legacyData, 'start');

    if (!startDateTime) {
      return null;
    }

    const result: TimeConditionDataV2 = {
      startTime: startDateTime.toISOString(),
    };

    // Convert end time if present
    if (hasRequiredFields(legacyData, 'end')) {
      const endDateTime = createLegacyDateTime(legacyData, 'end');

      if (endDateTime) {
        result.endTime = endDateTime.toISOString();
      }
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Normalize time condition data to new format
 * If data is already in new format, returns it as-is
 * If data is in legacy format, converts it to new format
 * @param data - Time condition data (either format)
 * @returns New format time condition data, or null if conversion fails
 */
export function normalizeTimeConditionData(
  data: TimeConditionData | null | undefined,
): TimeConditionDataV2 | null {
  if (!data) {
    return null;
  }

  // Already in new format
  if (isTimeConditionDataV2(data)) {
    return data;
  }

  // Convert from legacy format
  if (isTimeConditionDataLegacy(data)) {
    return convertTimeConditionLegacyToV2(data);
  }

  return null;
}

// ============================================================================
// Evaluation
// ============================================================================

/**
 * Evaluate time condition in new format (ISO 8601)
 */
function evaluateTimeConditionV2(data: TimeConditionDataV2): boolean {
  if (!data.startTime) {
    return false;
  }

  const startTime = parseISO(data.startTime);
  if (!isValid(startTime)) {
    return false;
  }

  const now = new Date();

  // If no end time specified, only check if current time is after start time
  if (!data.endTime) {
    return isAfter(now, startTime);
  }

  const endTime = parseISO(data.endTime);
  if (!isValid(endTime)) {
    return false;
  }

  // Check if current time is within the range
  return isAfter(now, startTime) && isBefore(now, endTime);
}

/**
 * Evaluate time condition in legacy format
 */
function evaluateTimeConditionLegacy(data: TimeConditionDataLegacy): boolean {
  // Validate required fields
  if (!hasRequiredFields(data, 'start')) {
    return false;
  }

  const startDateTime = createLegacyDateTime(data, 'start');

  if (!startDateTime) {
    return false;
  }

  const now = new Date();

  // If no end date specified, only check if current time is after start time
  if (!hasRequiredFields(data, 'end')) {
    return isAfter(now, startDateTime);
  }

  const endDateTime = createLegacyDateTime(data, 'end');

  if (!endDateTime) {
    return false;
  }

  // Check if current time is within the range
  return isAfter(now, startDateTime) && isBefore(now, endDateTime);
}

/**
 * Evaluate time condition based on start and end time rules
 * Supports both new ISO 8601 format and legacy format for backward compatibility
 * @param rules - Time condition rules
 * @returns boolean indicating if current time matches the condition
 */
export const evaluateTimeCondition = (rules: RulesCondition): boolean => {
  try {
    const data = rules.data || {};

    if (isTimeConditionDataV2(data)) {
      return evaluateTimeConditionV2(data);
    }

    if (isTimeConditionDataLegacy(data)) {
      return evaluateTimeConditionLegacy(data);
    }

    return false;
  } catch {
    return false;
  }
};
