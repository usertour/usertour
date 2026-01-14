import {
  BizAttributeTypes,
  UserTourTypes,
  RulesCondition,
  SimpleAttribute,
  AttributeBizTypes,
} from '@usertour/types';
import { evaluateFilterConditions, evaluateAttributeCondition } from '../conditions/attribute';

// Test data setup
const testAttributes: SimpleAttribute[] = [
  {
    id: 'email-attr',
    codeName: 'email',
    dataType: BizAttributeTypes.String,
    bizType: AttributeBizTypes.User,
  },
  {
    id: 'age-attr',
    codeName: 'age',
    dataType: BizAttributeTypes.Number,
    bizType: AttributeBizTypes.User,
  },
  {
    id: 'isPremium-attr',
    codeName: 'isPremium',
    dataType: BizAttributeTypes.Boolean,
    bizType: AttributeBizTypes.User,
  },
  {
    id: 'roles-attr',
    codeName: 'roles',
    dataType: BizAttributeTypes.List,
    bizType: AttributeBizTypes.User,
  },
  {
    id: 'tags-attr',
    codeName: 'tags',
    dataType: BizAttributeTypes.List,
    bizType: AttributeBizTypes.User,
  },
  {
    id: 'signUpDate-attr',
    codeName: 'signUpDate',
    dataType: BizAttributeTypes.DateTime,
    bizType: AttributeBizTypes.User,
  },
  {
    id: 'score-attr',
    codeName: 'score',
    dataType: BizAttributeTypes.Number,
    bizType: AttributeBizTypes.User,
  },
  {
    id: 'sdsdd-attr',
    codeName: 'sdsdd',
    dataType: BizAttributeTypes.Number,
    bizType: AttributeBizTypes.User,
  },
  // Company attributes
  {
    id: 'company-name-attr',
    codeName: 'companyName',
    dataType: BizAttributeTypes.String,
    bizType: AttributeBizTypes.Company,
  },
  {
    id: 'company-size-attr',
    codeName: 'companySize',
    dataType: BizAttributeTypes.Number,
    bizType: AttributeBizTypes.Company,
  },
  // Membership attributes
  {
    id: 'membership-level-attr',
    codeName: 'membershipLevel',
    dataType: BizAttributeTypes.String,
    bizType: AttributeBizTypes.Membership,
  },
  {
    id: 'membership-duration-attr',
    codeName: 'membershipDuration',
    dataType: BizAttributeTypes.Number,
    bizType: AttributeBizTypes.Membership,
  },
];

const testUserAttributes: UserTourTypes.Attributes = {
  email: 'user@example.com',
  age: 25,
  isPremium: true,
  roles: ['admin', 'user'],
  tags: [123, 456],
  signUpDate: '2024-01-15T10:30:00Z',
  score: 85.5,
  sdsdd: 101,
} as UserTourTypes.Attributes;

const testCompanyAttributes: UserTourTypes.Attributes = {
  companyName: 'Example Corp',
  companySize: 500,
} as UserTourTypes.Attributes;

const testMembershipAttributes: UserTourTypes.Attributes = {
  membershipLevel: 'premium',
  membershipDuration: 12,
} as UserTourTypes.Attributes;

// Default options for tests
const defaultOptions = {
  attributes: testAttributes,
  userAttributes: testUserAttributes,
  companyAttributes: testCompanyAttributes,
  membershipAttributes: testMembershipAttributes,
};

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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });
  });

  describe('Number conditions with string values', () => {
    test('should evaluate "is" condition when actualValue is number and expectedValue is string', () => {
      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-1',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: '101' as any,
            attrId: 'sdsdd-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should evaluate "is" condition when actualValue is string and expectedValue is number', () => {
      const userAttributesWithStringNumber: UserTourTypes.Attributes = {
        ...testUserAttributes,
        sdsdd: '101' as any,
      };

      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-2',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 101,
            attrId: 'sdsdd-attr',
          },
        },
      ];
      expect(
        evaluateFilterConditions(condition, {
          ...defaultOptions,
          userAttributes: userAttributesWithStringNumber,
        }),
      ).toBe(true);
    });

    test('should evaluate "is" condition when both actualValue and expectedValue are strings', () => {
      const userAttributesWithStringNumber: UserTourTypes.Attributes = {
        ...testUserAttributes,
        sdsdd: '101' as any,
      };

      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-3',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: '101' as any,
            attrId: 'sdsdd-attr',
          },
        },
      ];
      expect(
        evaluateFilterConditions(condition, {
          ...defaultOptions,
          userAttributes: userAttributesWithStringNumber,
        }),
      ).toBe(true);
    });

    test('should evaluate "not" condition when actualValue is number and expectedValue is string', () => {
      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-4',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'not',
            value: '102' as any,
            attrId: 'sdsdd-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should evaluate "isLessThan" condition when expectedValue is string', () => {
      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-5',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'isLessThan',
            value: '102' as any,
            attrId: 'sdsdd-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should evaluate "isGreaterThan" condition when expectedValue is string', () => {
      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-6',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'isGreaterThan',
            value: '100' as any,
            attrId: 'sdsdd-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should evaluate "between" condition when value and value2 are strings', () => {
      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-7',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'between',
            value: '100' as any,
            value2: '103' as any,
            attrId: 'sdsdd-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should evaluate "between" condition when actualValue is string and values are strings', () => {
      const userAttributesWithStringNumber: UserTourTypes.Attributes = {
        ...testUserAttributes,
        sdsdd: '101' as any,
      };

      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-8',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'between',
            value: '100' as any,
            value2: '103' as any,
            attrId: 'sdsdd-attr',
          },
        },
      ];
      expect(
        evaluateFilterConditions(condition, {
          ...defaultOptions,
          userAttributes: userAttributesWithStringNumber,
        }),
      ).toBe(true);
    });

    test('should return false when actualValue is NaN', () => {
      const userAttributesWithNaN: UserTourTypes.Attributes = {
        ...testUserAttributes,
        sdsdd: 'not-a-number' as any,
      };

      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-9',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 101,
            attrId: 'sdsdd-attr',
          },
        },
      ];
      expect(
        evaluateFilterConditions(condition, {
          ...defaultOptions,
          userAttributes: userAttributesWithNaN,
        }),
      ).toBe(false);
    });

    test('should handle decimal string values correctly', () => {
      const userAttributesWithDecimal: UserTourTypes.Attributes = {
        ...testUserAttributes,
        score: '85.5' as any,
      };

      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-10',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: '85.5' as any,
            attrId: 'score-attr',
          },
        },
      ];
      expect(
        evaluateFilterConditions(condition, {
          ...defaultOptions,
          userAttributes: userAttributesWithDecimal,
        }),
      ).toBe(true);
    });

    test('should handle negative string values correctly', () => {
      const userAttributesWithNegative: UserTourTypes.Attributes = {
        ...testUserAttributes,
        sdsdd: '-50' as any,
      };

      const condition: RulesCondition[] = [
        {
          id: 'number-string-condition-11',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'isLessThan',
            value: '0' as any,
            attrId: 'sdsdd-attr',
          },
        },
      ];
      expect(
        evaluateFilterConditions(condition, {
          ...defaultOptions,
          userAttributes: userAttributesWithNegative,
        }),
      ).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    describe('notIncludesAtLeastOne condition', () => {
      test('should return true when at least one value is not included (single value not included)', () => {
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
        // roles: ['admin', 'user'], 'guest' is not included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
      });

      test('should return true when at least one value is not included (partial values not included)', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-24-2',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAtLeastOne',
              listValues: ['admin', 'guest'],
              attrId: 'roles-attr',
            },
          },
        ];
        // roles: ['admin', 'user'], 'admin' is included but 'guest' is not
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
      });

      test('should return true when all values are not included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-24-3',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAtLeastOne',
              listValues: ['guest', 'visitor'],
              attrId: 'roles-attr',
            },
          },
        ];
        // roles: ['admin', 'user'], both 'guest' and 'visitor' are not included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
      });

      test('should return false when all values are included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-24-4',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAtLeastOne',
              listValues: ['admin', 'user'],
              attrId: 'roles-attr',
            },
          },
        ];
        // roles: ['admin', 'user'], both values are included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
      });

      test('should return false when single value is included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-24-5',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAtLeastOne',
              listValues: ['admin'],
              attrId: 'roles-attr',
            },
          },
        ];
        // roles: ['admin', 'user'], 'admin' is included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
      });

      test('should return true for numeric list when at least one value is not included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-24-6',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAtLeastOne',
              listValues: [123, 444],
              attrId: 'tags-attr',
            },
          },
        ];
        // tags: [123, 456], 123 is included but 444 is not
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
      });

      test('should return false for numeric list when all values are included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-24-7',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAtLeastOne',
              listValues: [123, 456],
              attrId: 'tags-attr',
            },
          },
        ];
        // tags: [123, 456], both values are included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
      });
    });

    describe('notIncludesAll condition', () => {
      test('should return true when all values are not included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-25',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAll',
              listValues: ['guest', 'visitor'],
              attrId: 'roles-attr',
            },
          },
        ];
        // roles: ['admin', 'user'], both 'guest' and 'visitor' are not included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
      });

      test('should return true when single value is not included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-25-2',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAll',
              listValues: ['guest'],
              attrId: 'roles-attr',
            },
          },
        ];
        // roles: ['admin', 'user'], 'guest' is not included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
      });

      test('should return false when at least one value is included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-25-3',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAll',
              listValues: ['admin', 'guest'],
              attrId: 'roles-attr',
            },
          },
        ];
        // roles: ['admin', 'user'], 'admin' is included but 'guest' is not
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
      });

      test('should return false when all values are included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-25-4',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAll',
              listValues: ['admin', 'user'],
              attrId: 'roles-attr',
            },
          },
        ];
        // roles: ['admin', 'user'], both values are included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
      });

      test('should return false when single value is included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-25-5',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAll',
              listValues: ['admin'],
              attrId: 'roles-attr',
            },
          },
        ];
        // roles: ['admin', 'user'], 'admin' is included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
      });

      test('should return true for numeric list when all values are not included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-25-6',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAll',
              listValues: [1234, 789],
              attrId: 'tags-attr',
            },
          },
        ];
        // tags: [123, 456], both 1234 and 789 are not included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
      });

      test('should return false for numeric list when at least one value is included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-25-7',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAll',
              listValues: [123, 444],
              attrId: 'tags-attr',
            },
          },
        ];
        // tags: [123, 456], 123 is included but 444 is not
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
      });

      test('should return false for numeric list when all values are included', () => {
        const condition: RulesCondition[] = [
          {
            id: 'condition-25-8',
            type: 'condition',
            operators: 'and',
            data: {
              logic: 'notIncludesAll',
              listValues: [123, 456],
              attrId: 'tags-attr',
            },
          },
        ];
        // tags: [123, 456], both values are included
        expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
      });
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
            value: 30, // Check if signUpDate is within the last 30 days (it's not, so should be false)
            attrId: 'signUpDate-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty conditions array', () => {
      expect(evaluateFilterConditions([], defaultOptions)).toBe(true);
    });

    test('should handle null/undefined conditions', () => {
      expect(evaluateFilterConditions(null as any, defaultOptions)).toBe(true);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(
        evaluateFilterConditions(condition, {
          ...defaultOptions,
          userAttributes: userAttributesWithoutEmail,
        }),
      ).toBe(false);
    });

    test('should handle invalid data type', () => {
      const invalidAttribute: SimpleAttribute[] = [
        {
          id: 'invalid-attr',
          codeName: 'invalid',
          dataType: 999 as any, // Invalid data type for testing
          bizType: AttributeBizTypes.User,
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
      expect(
        evaluateFilterConditions(condition, {
          ...defaultOptions,
          attributes: invalidAttribute,
        }),
      ).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
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
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
    });
  });

  describe('Company attributes evaluation', () => {
    test('should evaluate company string attribute correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'company-condition-1',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'Example Corp',
            attrId: 'company-name-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should evaluate company number attribute correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'company-condition-2',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'isGreaterThan',
            value: 100,
            attrId: 'company-size-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should handle missing company attribute value', () => {
      const condition: RulesCondition[] = [
        {
          id: 'company-condition-3',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'Test Corp',
            attrId: 'company-name-attr',
          },
        },
      ];

      const optionsWithoutCompany = {
        ...defaultOptions,
        companyAttributes: {},
      };

      expect(evaluateFilterConditions(condition, optionsWithoutCompany)).toBe(false);
    });
  });

  describe('Membership attributes evaluation', () => {
    test('should evaluate membership string attribute correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'membership-condition-1',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'premium',
            attrId: 'membership-level-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should evaluate membership number attribute correctly', () => {
      const condition: RulesCondition[] = [
        {
          id: 'membership-condition-2',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'isGreaterThanOrEqualTo',
            value: 12,
            attrId: 'membership-duration-attr',
          },
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should handle missing membership attribute value', () => {
      const condition: RulesCondition[] = [
        {
          id: 'membership-condition-3',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'premium',
            attrId: 'membership-level-attr',
          },
        },
      ];

      const optionsWithoutMembership = {
        ...defaultOptions,
        membershipAttributes: {},
      };

      expect(evaluateFilterConditions(condition, optionsWithoutMembership)).toBe(false);
    });
  });

  describe('Mixed attribute types in conditions', () => {
    test('should evaluate mixed user and company attributes with AND logic', () => {
      const condition: RulesCondition[] = [
        {
          id: 'mixed-condition-1',
          type: 'group',
          operators: 'and',
          data: {},
          conditions: [
            {
              id: 'mixed-condition-1-1',
              type: 'condition',
              operators: 'and',
              data: {
                logic: 'contains',
                value: 'example.com',
                attrId: 'email-attr',
              },
            },
            {
              id: 'mixed-condition-1-2',
              type: 'condition',
              operators: 'and',
              data: {
                logic: 'isGreaterThan',
                value: 100,
                attrId: 'company-size-attr',
              },
            },
          ],
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should evaluate mixed user, company, and membership attributes with OR logic', () => {
      const condition: RulesCondition[] = [
        {
          id: 'mixed-condition-2',
          type: 'group',
          operators: 'or',
          data: {},
          conditions: [
            {
              id: 'mixed-condition-2-1',
              type: 'condition',
              operators: 'or',
              data: {
                logic: 'is',
                value: 'wrong@email.com',
                attrId: 'email-attr',
              },
            },
            {
              id: 'mixed-condition-2-2',
              type: 'condition',
              operators: 'or',
              data: {
                logic: 'is',
                value: 'Example Corp',
                attrId: 'company-name-attr',
              },
            },
            {
              id: 'mixed-condition-2-3',
              type: 'condition',
              operators: 'or',
              data: {
                logic: 'is',
                value: 'premium',
                attrId: 'membership-level-attr',
              },
            },
          ],
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });
  });

  describe('evaluateAttributeCondition function tests', () => {
    test('should evaluate single attribute condition correctly', () => {
      const condition: RulesCondition = {
        id: 'single-condition-1',
        type: 'condition',
        operators: 'and',
        data: {
          logic: 'is',
          value: 'user@example.com',
          attrId: 'email-attr',
        },
      };

      expect(evaluateAttributeCondition(condition, defaultOptions)).toBe(true);
    });

    test('should handle missing data in single condition', () => {
      const condition: RulesCondition = {
        id: 'single-condition-2',
        type: 'condition',
        operators: 'and',
        data: undefined,
      };

      expect(evaluateAttributeCondition(condition, defaultOptions)).toBe(false);
    });

    test('should handle missing attribute in single condition', () => {
      const condition: RulesCondition = {
        id: 'single-condition-3',
        type: 'condition',
        operators: 'and',
        data: {
          logic: 'is',
          value: 'test',
          attrId: 'non-existent-attr',
        },
      };

      expect(evaluateAttributeCondition(condition, defaultOptions)).toBe(false);
    });

    test('should handle missing attributes array', () => {
      const condition: RulesCondition = {
        id: 'single-condition-4',
        type: 'condition',
        operators: 'and',
        data: {
          logic: 'is',
          value: 'test',
          attrId: 'email-attr',
        },
      };

      const optionsWithoutAttributes = {
        ...defaultOptions,
        attributes: undefined,
      };

      expect(evaluateAttributeCondition(condition, optionsWithoutAttributes)).toBe(false);
    });

    test('should evaluate company attribute in single condition', () => {
      const condition: RulesCondition = {
        id: 'single-condition-5',
        type: 'condition',
        operators: 'and',
        data: {
          logic: 'is',
          value: 'Example Corp',
          attrId: 'company-name-attr',
        },
      };

      expect(evaluateAttributeCondition(condition, defaultOptions)).toBe(true);
    });

    test('should evaluate membership attribute in single condition', () => {
      const condition: RulesCondition = {
        id: 'single-condition-6',
        type: 'condition',
        operators: 'and',
        data: {
          logic: 'is',
          value: 'premium',
          attrId: 'membership-level-attr',
        },
      };

      expect(evaluateAttributeCondition(condition, defaultOptions)).toBe(true);
    });
  });

  describe('Additional edge cases for new functionality', () => {
    test('should handle empty attribute contexts', () => {
      const condition: RulesCondition[] = [
        {
          id: 'empty-context-1',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'test',
            attrId: 'email-attr',
          },
        },
      ];

      const emptyOptions = {
        attributes: testAttributes,
        userAttributes: {},
        companyAttributes: {},
        membershipAttributes: {},
      };

      expect(evaluateFilterConditions(condition, emptyOptions)).toBe(false);
    });

    test('should handle missing attribute contexts', () => {
      const condition: RulesCondition[] = [
        {
          id: 'missing-context-1',
          type: 'condition',
          operators: 'and',
          data: {
            logic: 'is',
            value: 'test',
            attrId: 'email-attr',
          },
        },
      ];

      const minimalOptions = {
        attributes: testAttributes,
      };

      expect(evaluateFilterConditions(condition, minimalOptions)).toBe(false);
    });

    test('should handle complex nested groups with mixed attribute types', () => {
      const condition: RulesCondition[] = [
        {
          id: 'complex-nested-1',
          type: 'group',
          operators: 'and',
          data: {},
          conditions: [
            {
              id: 'complex-nested-1-1',
              type: 'group',
              operators: 'or',
              data: {},
              conditions: [
                {
                  id: 'complex-nested-1-1-1',
                  type: 'condition',
                  operators: 'or',
                  data: {
                    logic: 'contains',
                    value: 'example.com',
                    attrId: 'email-attr',
                  },
                },
                {
                  id: 'complex-nested-1-1-2',
                  type: 'condition',
                  operators: 'or',
                  data: {
                    logic: 'is',
                    value: 'Test Corp',
                    attrId: 'company-name-attr',
                  },
                },
              ],
            },
            {
              id: 'complex-nested-1-2',
              type: 'condition',
              operators: 'and',
              data: {
                logic: 'is',
                value: 'premium',
                attrId: 'membership-level-attr',
              },
            },
          ],
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(true);
    });

    test('should handle empty group conditions', () => {
      const condition: RulesCondition[] = [
        {
          id: 'empty-group-1',
          type: 'group',
          operators: 'and',
          data: {},
          conditions: [],
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
    });

    test('should handle group with undefined conditions', () => {
      const condition: RulesCondition[] = [
        {
          id: 'undefined-group-1',
          type: 'group',
          operators: 'and',
          data: {},
          conditions: undefined,
        },
      ];
      expect(evaluateFilterConditions(condition, defaultOptions)).toBe(false);
    });
  });
});
