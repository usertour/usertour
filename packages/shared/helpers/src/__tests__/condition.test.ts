import { RulesCondition, RulesType } from '@usertour/types';
import { filterConditionsByType, isConditionsActived } from '../conditions/condition';

describe('filterConditionsByType', () => {
  test('should return empty array when no conditions provided', () => {
    const result = filterConditionsByType([], [RulesType.CURRENT_PAGE, RulesType.TIME]);
    expect(result).toEqual([]);
  });

  test('should filter out non-matching types', () => {
    const conditions: RulesCondition[] = [
      {
        id: '1',
        type: 'element',
        operators: 'and',
        actived: true,
        data: {},
      },
      {
        id: '2',
        type: 'current-page',
        operators: 'and',
        actived: true,
        data: {},
      },
    ];

    const result = filterConditionsByType(conditions, [RulesType.CURRENT_PAGE, RulesType.TIME]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('current-page');
  });

  test('should keep matching types', () => {
    const conditions: RulesCondition[] = [
      {
        id: '1',
        type: 'current-page',
        operators: 'and',
        actived: true,
        data: {},
      },
      {
        id: '2',
        type: 'time',
        operators: 'and',
        actived: true,
        data: {},
      },
    ];

    const result = filterConditionsByType(conditions, [RulesType.CURRENT_PAGE, RulesType.TIME]);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.type)).toEqual(['current-page', 'time']);
  });

  test('should handle nested group conditions', () => {
    const conditions: RulesCondition[] = [
      {
        id: '1',
        type: 'group',
        operators: 'and',
        data: {},
        conditions: [
          {
            id: '2',
            type: 'current-page',
            operators: 'and',
            actived: true,
            data: {},
          },
          {
            id: '3',
            type: 'element', // This should be filtered out
            operators: 'and',
            actived: true,
            data: {},
          },
        ],
      },
    ];

    const result = filterConditionsByType(conditions, [RulesType.CURRENT_PAGE, RulesType.TIME]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('group');
    expect(result[0].conditions).toHaveLength(1);
    expect(result[0].conditions![0].type).toBe('current-page');
  });

  test('should remove groups with no matching conditions', () => {
    const conditions: RulesCondition[] = [
      {
        id: '1',
        type: 'group',
        operators: 'and',
        data: {},
        conditions: [
          {
            id: '2',
            type: 'element', // This should be filtered out
            operators: 'and',
            actived: true,
            data: {},
          },
        ],
      },
    ];

    const result = filterConditionsByType(conditions, [RulesType.CURRENT_PAGE, RulesType.TIME]);
    expect(result).toHaveLength(0);
  });
});

describe('isConditionsActived', () => {
  test('should return false when no conditions provided', () => {
    const result = isConditionsActived([]);
    expect(result).toBe(false);
  });

  test('should return true when all conditions are actived with AND logic', () => {
    const conditions: RulesCondition[] = [
      {
        id: '1',
        type: 'current-page',
        operators: 'and',
        actived: true,
        data: {},
      },
      {
        id: '2',
        type: 'time',
        operators: 'and',
        actived: true,
        data: {},
      },
    ];

    const result = isConditionsActived(conditions);
    expect(result).toBe(true);
  });

  test('should return false when one condition is not actived with AND logic', () => {
    const conditions: RulesCondition[] = [
      {
        id: '1',
        type: 'current-page',
        operators: 'and',
        actived: true,
        data: {},
      },
      {
        id: '2',
        type: 'time',
        operators: 'and',
        actived: false,
        data: {},
      },
    ];

    const result = isConditionsActived(conditions);
    expect(result).toBe(false);
  });

  test('should return true when at least one condition is actived with OR logic', () => {
    const conditions: RulesCondition[] = [
      {
        id: '1',
        type: 'current-page',
        operators: 'or',
        actived: false,
        data: {},
      },
      {
        id: '2',
        type: 'time',
        operators: 'or',
        actived: true,
        data: {},
      },
    ];

    const result = isConditionsActived(conditions);
    expect(result).toBe(true);
  });

  test('should handle nested group conditions', () => {
    const conditions: RulesCondition[] = [
      {
        id: '1',
        type: 'group',
        operators: 'and',
        data: {},
        conditions: [
          {
            id: '2',
            type: 'current-page',
            operators: 'and',
            actived: true,
            data: {},
          },
          {
            id: '3',
            type: 'time',
            operators: 'and',
            actived: true,
            data: {},
          },
        ],
      },
    ];

    const result = isConditionsActived(conditions);
    expect(result).toBe(true);
  });
});
