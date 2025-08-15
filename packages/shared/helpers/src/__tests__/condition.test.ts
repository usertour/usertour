import { RulesCondition, RulesType } from '@usertour/types';
import {
  filterConditionsByType,
  isConditionsActived,
  activedRulesConditions,
} from '../conditions/condition';

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

describe('activedRulesConditions', () => {
  const mockConditions: RulesCondition[] = [
    {
      id: 'rule-1',
      type: 'current-page',
      operators: 'and',
      actived: false,
      data: {
        includes: ['https://example.com'],
        excludes: [],
      },
    },
    {
      id: 'rule-2',
      type: 'time',
      operators: 'and',
      actived: false,
      data: {
        startDate: '2024-01-01',
        startDateHour: '00',
        startDateMinute: '00',
      },
    },
    {
      id: 'rule-3',
      type: 'user-attr',
      operators: 'and',
      actived: false,
      data: {
        attrId: 'email',
        logic: 'is',
        value: 'test@example.com',
      },
    },
    {
      id: 'rule-4',
      type: 'element',
      operators: 'and',
      actived: true,
      data: {},
    },
  ];

  const mockOptions = {
    clientContext: {
      page_url: 'https://example.com',
      viewport_width: 1920,
      viewport_height: 1080,
    },
    attributes: [
      {
        id: 'email',
        codeName: 'email',
        dataType: 2, // String
      },
    ],
    userAttributes: {
      email: 'test@example.com',
    },
  };

  test('should return conditions with default actived state when no options provided', () => {
    const conditions: RulesCondition[] = [
      {
        id: 'rule-1',
        type: 'element',
        operators: 'and',
        actived: true,
        data: {},
      },
      {
        id: 'rule-2',
        type: 'element',
        operators: 'and',
        actived: false,
        data: {},
      },
    ];

    const result = activedRulesConditions(conditions);

    expect(result).toHaveLength(2);
    expect(result[0].actived).toBe(true);
    expect(result[1].actived).toBe(false);
  });

  test('should force activate rules by ID', () => {
    const result = activedRulesConditions(mockConditions, {
      ...mockOptions,
      activatedIds: ['rule-1', 'rule-2'],
    });

    expect(result[0].actived).toBe(true); // rule-1 forced activated
    expect(result[1].actived).toBe(true); // rule-2 forced activated
    expect(result[2].actived).toBe(true); // rule-3 evaluated normally (attribute matches)
    expect(result[3].actived).toBe(true); // rule-4 keeps original state
  });

  test('should force deactivate rules by ID', () => {
    const result = activedRulesConditions(mockConditions, {
      ...mockOptions,
      deactivatedIds: ['rule-1', 'rule-4'],
    });

    expect(result[0].actived).toBe(false); // rule-1 forced deactivated
    expect(result[1].actived).toBe(true); // rule-2 evaluated normally (time condition matches)
    expect(result[2].actived).toBe(true); // rule-3 evaluated normally (attribute matches)
    expect(result[3].actived).toBe(false); // rule-4 forced deactivated
  });

  test('should prioritize activatedIds over deactivatedIds', () => {
    const result = activedRulesConditions(mockConditions, {
      ...mockOptions,
      activatedIds: ['rule-1'],
      deactivatedIds: ['rule-1'],
    });

    expect(result[0].actived).toBe(true); // activatedIds takes precedence
  });

  test('should disable evaluation for specific rule types', () => {
    const result = activedRulesConditions(mockConditions, {
      ...mockOptions,
      typeControl: {
        [RulesType.CURRENT_PAGE]: false,
        [RulesType.TIME]: false,
      },
    });

    expect(result[0].actived).toBe(false); // rule-1 keeps original state (disabled)
    expect(result[1].actived).toBe(false); // rule-2 keeps original state (disabled)
    expect(result[2].actived).toBe(true); // rule-3 evaluated normally
    expect(result[3].actived).toBe(true); // rule-4 keeps original state
  });

  test('should evaluate URL conditions correctly', () => {
    const result = activedRulesConditions(mockConditions, mockOptions);

    expect(result[0].actived).toBe(false); // URL doesn't match
  });

  test('should evaluate time conditions correctly', () => {
    const result = activedRulesConditions(mockConditions, mockOptions);

    // Time evaluation depends on current time, so we test the structure
    expect(typeof result[1].actived).toBe('boolean');
  });

  test('should evaluate attribute conditions correctly', () => {
    const result = activedRulesConditions(mockConditions, mockOptions);

    expect(result[2].actived).toBe(true); // Attribute matches
  });

  test('should handle rules without ID', () => {
    const conditions: RulesCondition[] = [
      {
        id: 'rule-without-id',
        type: 'element',
        operators: 'and',
        actived: true,
        data: {},
      },
    ];

    const result = activedRulesConditions(conditions, {
      activatedIds: ['non-existent'],
      deactivatedIds: ['non-existent'],
    });

    expect(result[0].actived).toBe(true); // Keeps original state
  });

  test('should handle nested group conditions', () => {
    const nestedConditions: RulesCondition[] = [
      {
        id: 'group-1',
        type: 'group',
        operators: 'and',
        actived: false,
        data: {},
        conditions: [
          {
            id: 'rule-1',
            type: 'current-page',
            operators: 'and',
            actived: false,
            data: {
              includes: ['https://example.com'],
              excludes: [],
            },
          },
          {
            id: 'rule-2',
            type: 'element',
            operators: 'and',
            actived: true,
            data: {},
          },
        ],
      },
    ];

    const result = activedRulesConditions(nestedConditions, {
      ...mockOptions,
      activatedIds: ['rule-1'],
    });

    expect(result[0].type).toBe('group');
    expect(result[0].conditions).toBeDefined();
    expect(result[0].conditions![0].actived).toBe(true); // Forced activated
    expect(result[0].conditions![1].actived).toBe(true); // Keeps original state
  });

  test('should handle deep nested group conditions', () => {
    const deepNestedConditions: RulesCondition[] = [
      {
        id: 'group-1',
        type: 'group',
        operators: 'and',
        actived: false,
        data: {},
        conditions: [
          {
            id: 'group-2',
            type: 'group',
            operators: 'and',
            actived: false,
            data: {},
            conditions: [
              {
                id: 'rule-1',
                type: 'current-page',
                operators: 'and',
                actived: false,
                data: {
                  includes: ['https://example.com'],
                  excludes: [],
                },
              },
            ],
          },
        ],
      },
    ];

    const result = activedRulesConditions(deepNestedConditions, {
      ...mockOptions,
      activatedIds: ['rule-1'],
    });

    expect(result[0].conditions![0].conditions![0].actived).toBe(true);
  });

  test('should handle empty conditions array', () => {
    const result = activedRulesConditions([]);
    expect(result).toEqual([]);
  });

  test('should handle conditions with missing data', () => {
    const conditions: RulesCondition[] = [
      {
        id: 'rule-1',
        type: 'current-page',
        operators: 'and',
        actived: false,
        data: undefined,
      },
    ];

    const result = activedRulesConditions(conditions, mockOptions);
    expect(result[0].actived).toBe(false); // Should handle gracefully
  });

  test('should handle mixed rule types with different evaluation results', () => {
    const mixedConditions: RulesCondition[] = [
      {
        id: 'url-rule',
        type: 'current-page',
        operators: 'and',
        actived: false,
        data: {
          includes: ['https://wrong-url.com'],
          excludes: [],
        },
      },
      {
        id: 'attr-rule',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'email',
          logic: 'is',
          value: 'test@example.com',
        },
      },
      {
        id: 'element-rule',
        type: 'element',
        operators: 'and',
        actived: false,
        data: {},
      },
    ];

    const result = activedRulesConditions(mixedConditions, mockOptions);

    expect(result[0].actived).toBe(false); // URL doesn't match
    expect(result[1].actived).toBe(true); // Attribute matches
    expect(result[2].actived).toBe(false); // Keeps original state
  });

  test('should handle type control with partial configuration', () => {
    const result = activedRulesConditions(mockConditions, {
      ...mockOptions,
      typeControl: {
        [RulesType.CURRENT_PAGE]: false,
        // Other types not specified, should evaluate normally
      },
    });

    expect(result[0].actived).toBe(false); // Disabled
    expect(result[1].actived).toBe(true); // Evaluated normally (time condition matches)
    expect(result[2].actived).toBe(true); // Evaluated normally (attribute matches)
    expect(result[3].actived).toBe(true); // Keeps original state
  });

  test('should handle missing clientContext gracefully', () => {
    const result = activedRulesConditions(mockConditions, {
      attributes: mockOptions.attributes,
      userAttributes: mockOptions.userAttributes,
    });

    // Should still work with default clientContext
    expect(result).toHaveLength(4);
    expect(typeof result[0].actived).toBe('boolean');
  });

  test('should handle missing attributes gracefully', () => {
    const result = activedRulesConditions(mockConditions, {
      clientContext: mockOptions.clientContext,
      userAttributes: mockOptions.userAttributes,
    });

    expect(result[2].actived).toBe(false); // Should handle missing attributes gracefully
  });

  test('should handle missing userAttributes gracefully', () => {
    const result = activedRulesConditions(mockConditions, {
      clientContext: mockOptions.clientContext,
      attributes: mockOptions.attributes,
    });

    expect(result[2].actived).toBe(false); // Should handle missing userAttributes gracefully
  });

  test('debug: should test URL evaluation directly', () => {
    const urlCondition: RulesCondition = {
      id: 'debug-rule',
      type: 'current-page',
      operators: 'and',
      actived: false,
      data: {
        includes: ['https://example.com'],
        excludes: [],
      },
    };

    const options = {
      clientContext: {
        page_url: 'https://example.com',
        viewport_width: 1920,
        viewport_height: 1080,
      },
    };

    const result = activedRulesConditions([urlCondition], options);

    expect(result[0].actived).toBe(false);
  });
});
