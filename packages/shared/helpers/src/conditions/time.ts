import { RulesCondition } from '@usertour/types';
import { isAfter, isBefore, isValid, parseISO } from 'date-fns';

/**
 * Evaluate time condition based on start and end time rules
 * @param rules - Time condition rules
 * @returns boolean indicating if current time matches the condition
 */
export const evaluateTimeCondition = (rules: RulesCondition): boolean => {
  try {
    const { endDate, endDateHour, endDateMinute, startDate, startDateHour, startDateMinute } =
      rules.data || {};

    // Validate required fields
    if (!startDate || !startDateHour || !startDateMinute) {
      return false;
    }

    // Create start time
    const startTimeString = `${startDate}T${startDateHour.padStart(2, '0')}:${startDateMinute.padStart(2, '0')}:00`;
    const startTime = parseISO(startTimeString);

    if (!isValid(startTime)) {
      return false;
    }

    const now = new Date();

    // If no end date specified, only check if current time is after start time
    if (!endDate || !endDateHour || !endDateMinute) {
      return isAfter(now, startTime);
    }

    // Create end time
    const endTimeString = `${endDate}T${endDateHour.padStart(2, '0')}:${endDateMinute.padStart(2, '0')}:00`;
    const endTime = parseISO(endTimeString);

    if (!isValid(endTime)) {
      return false;
    }

    // Check if current time is within the range
    return isAfter(now, startTime) && isBefore(now, endTime);
  } catch {
    return false;
  }
};
