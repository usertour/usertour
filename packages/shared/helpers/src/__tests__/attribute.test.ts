import { BizAttributeTypes, UserTourTypes, RulesCondition, SimpleAttribute } from '@usertour/types';
import { evaluateFilterConditions } from '../conditions/attribute';

// Test data setup
const testAttributes: SimpleAttribute[] = [
  {
    id: 'email-attr',
    codeName: 'email',
    dataType: BizAttributeTypes.String,
  },
  {
    id: 'age-attr',
    codeName: 'age',
    dataType: BizAttributeTypes.Number,
  },
  {
    id: 'isPremium-attr',
    codeName: 'isPremium',
    dataType: BizAttributeTypes.Boolean,
  },
  {
    id: 'roles-attr',
    codeName: 'roles',
    dataType: BizAttributeTypes.List,
  },
  {
    id: 'signUpDate-attr',
    codeName: 'signUpDate',
    dataType: BizAttributeTypes.DateTime,
  },
  {
    id: 'score-attr',
    codeName: 'score',
    dataType: BizAttributeTypes.Number,
  },
];

const testUserAttributes: UserTourTypes.Attributes = {
  email: 'user@example.com',
  age: 25,
  isPremium: true,
  roles: ['admin', 'user'],
  signUpDate: '2024-01-15T10:30:00Z',
  score: 85.5,
} as UserTourTypes.Attributes;

describe('Attribute Filter - Complete Test Suite', () => {
  describe('String conditions (8 cases)', () => {
    test('should evaluate "is" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-1',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'user@example.com',
            attrId: 'email-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "not" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-2',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'not',
            value: 'other@example.com',
            attrId: 'email-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "contains" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-3',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'contains',
            value: 'example.com',
            attrId: 'email-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "notContain" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-4',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'notContain',
            value: 'gmail.com',
            attrId: 'email-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "startsWith" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-5',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'startsWith',
            value: 'user',
            attrId: 'email-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "endsWith" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-6',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'endsWith',
            value: 'example.com',
            attrId: 'email-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "empty" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-7',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'empty',
            attrId: 'email-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });

    test('should evaluate "any" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-8',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'any',
            attrId: 'email-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });
  });

  describe('Number conditions (9 cases)', () => {
    test('should evaluate "is" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-9',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 25,
            attrId: 'age-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "not" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-10',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'not',
            value: 30,
            attrId: 'age-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "isLessThan" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-11',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'isLessThan',
            value: 30,
            attrId: 'age-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "isLessThanOrEqualTo" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-12',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'isLessThanOrEqualTo',
            value: 25,
            attrId: 'age-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "isGreaterThan" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-13',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'isGreaterThan',
            value: 18,
            attrId: 'age-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "isGreaterThanOrEqualTo" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-14',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'isGreaterThanOrEqualTo',
            value: 25,
            attrId: 'age-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "between" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-15',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'between',
            value: 20,
            value2: 30,
            attrId: 'age-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "empty" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-16',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'empty',
            attrId: 'age-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });

    test('should evaluate "any" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-17',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'any',
            attrId: 'age-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });
  });

  describe('Boolean conditions (4 cases)', () => {
    test('should evaluate "true" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-18',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'true',
            attrId: 'isPremium-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "false" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-19',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'false',
            attrId: 'isPremium-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });

    test('should evaluate "empty" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-20',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'empty',
            attrId: 'isPremium-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });

    test('should evaluate "any" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-21',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'any',
            attrId: 'isPremium-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });
  });

  describe('List conditions (6 cases)', () => {
    test('should evaluate "includesAtLeastOne" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-22',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'includesAtLeastOne',
            listValues: ['admin'],
            attrId: 'roles-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "includesAll" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-23',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'includesAll',
            listValues: ['admin', 'user'],
            attrId: 'roles-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "notIncludesAtLeastOne" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-24',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'notIncludesAtLeastOne',
            listValues: ['guest'],
            attrId: 'roles-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "notIncludesAll" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-25',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'notIncludesAll',
            listValues: ['admin', 'guest'],
            attrId: 'roles-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "empty" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-26',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'empty',
            attrId: 'roles-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });

    test('should evaluate "any" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-27',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'any',
            attrId: 'roles-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });
  });

  describe('DateTime conditions (8 cases)', () => {
    test('should evaluate "lessThan" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-28',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'lessThan',
            value: 600, // 600 days ago (signUpDate is 575 days ago, which is < 600, so should be false)
            attrId: 'signUpDate-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "exactly" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-29',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'exactly',
            value: 30, // 30 days ago
            attrId: 'signUpDate-attr',
          },
        },
      ];
      // This will be false because the signUpDate is not exactly 30 days ago
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });

    test('should evaluate "moreThan" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-30',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'moreThan',
            value: 500, // 500 days ago (signUpDate is 575 days ago, which is > 500, so should be true)
            attrId: 'signUpDate-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "before" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-31',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'before',
            value: '2024-02-01T00:00:00Z',
            attrId: 'signUpDate-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "on" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-32',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'on',
            value: '2024-01-15T00:00:00Z',
            attrId: 'signUpDate-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "after" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-33',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'after',
            value: '2024-01-01T00:00:00Z',
            attrId: 'signUpDate-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate "empty" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-34',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'empty',
            attrId: 'signUpDate-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });

    test('should evaluate "any" condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-35',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'any',
            attrId: 'signUpDate-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });
  });

  describe('Complex conditions with AND/OR logic', () => {
    test('should evaluate AND condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-36',
          type: 'group',
          operators: 'and',
          data: {},
          conditions: [
            {
              id: 'condition-36-1',
              type: 'condition',
              operators: 'and',
              data: {
                logic: 'contains',
                value: 'example.com',
                attrId: 'email-attr',
              },
            },
            {
              id: 'condition-36-2',
              type: 'condition',
              operators: 'and',
              data: {
                logic: 'isGreaterThan',
                value: 18,
                attrId: 'age-attr',
              },
            },
          ],
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate OR condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-37',
          type: 'group',
          operators: 'or',
          data: {},
          conditions: [
            {
              id: 'condition-37-1',
              type: 'condition',
              operators: 'or',
              data: {
                logic: 'is',
                value: 'wrong@email.com',
                attrId: 'email-attr',
              },
            },
            {
              id: 'condition-37-2',
              type: 'condition',
              operators: 'or',
              data: {
                logic: 'isGreaterThan',
                value: 18,
                attrId: 'age-attr',
              },
            },
          ],
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should evaluate mixed AND/OR condition correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-38',
          type: 'group',
          operators: 'and',
          data: {},
          conditions: [
            {
              id: 'condition-38-1',
              type: 'condition',
              operators: 'and',
              data: {
                logic: 'contains',
                value: 'example.com',
                attrId: 'email-attr',
              },
            },
            {
              id: 'condition-38-2',
              type: 'group',
              operators: 'or',
              data: {},
              conditions: [
                {
                  id: 'condition-38-2-1',
                  type: 'condition',
                  operators: 'or',
                  data: {
                    logic: 'is',
                    value: 'wrong@email.com',
                    attrId: 'email-attr',
                  },
                },
                {
                  id: 'condition-38-2-2',
                  type: 'condition',
                  operators: 'or',
                  data: {
                    logic: 'isGreaterThan',
                    value: 18,
                    attrId: 'age-attr',
                  },
                },
              ],
            },
          ],
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty conditions array', () => {
      expect(evaluateFilterConditions([], testAttributes, testUserAttributes)).toBe(true);
    });

    test('should handle null/undefined conditions', () => {
      expect(evaluateFilterConditions(null as any, testAttributes, testUserAttributes)).toBe(true);
    });

    test('should handle missing attribute', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-39',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'test',
            attrId: 'non-existent-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });

    test('should handle missing user attribute value', () => {
      const userAttributesWithoutEmail: UserTourTypes.Attributes = {
        age: 25,
        isPremium: true,
      } as UserTourTypes.Attributes;

      const condition: RulesCondition[] = [
        {
          id: 'condition-40',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'test@example.com',
            attrId: 'email-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, userAttributesWithoutEmail)).toBe(
        false,
      );
    });

    test('should handle invalid data type', () => {
      const invalidAttribute: SimpleAttribute[] = [
        {
          id: 'invalid-attr',
          codeName: 'invalid',
          dataType: 999, // Invalid data type
        },
      ];

      const condition: RulesCondition[] = [
        {
          id: 'condition-41',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'test',
            attrId: 'invalid-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, invalidAttribute, testUserAttributes)).toBe(false);
    });

    test('should handle invalid logic', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-42',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'invalidLogic',
            value: 'test',
            attrId: 'email-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });

    test('should handle missing data in condition', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-43',
          type: 'condition',
          operators: 'and',
          data: undefined,
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });

    test('should handle missing attrId in condition', () => {
      const condition: RulesCondition[] = [
        {
          id: 'condition-44',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'test',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, testAttributes, testUserAttributes)).toBe(false);
    });
  });
});
