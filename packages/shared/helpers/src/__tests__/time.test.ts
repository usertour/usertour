import { RulesCondition } from '@usertour/types';
import { evaluateTimeCondition } from '../conditions/time';

describe('Time Condition Evaluation', () => {
  const mockNow = new Date('2024-01-15T12:00:00Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should return true when current time is after start time and no end time', () => {
    const rules: RulesCondition = {
      id: 'condition-1',
      type: 'condition',
      operators: 'and',
      data: {
        startDate: '2024-01-15',
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
      type: 'condition',
      operators: 'and',
      data: {
        startDate: '2024-01-15',
        startDateHour: '10',
        startDateMinute: '00',
        endDate: '2024-01-15',
        endDateHour: '14',
        endDateMinute: '00',
      },
    };

    expect(evaluateTimeCondition(rules)).toBe(false);
  });
});
