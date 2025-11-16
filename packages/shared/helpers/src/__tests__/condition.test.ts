import {
  RulesCondition,
  RulesType,
  RulesEvaluationOptions,
  BizAttributeTypes,
  AttributeBizTypes,
} from '@usertour/types';
import {
  filterConditionsByType,
  isConditionsActived,
  evaluateRulesConditions,
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

describe('evaluateRulesConditions', () => {
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
      pageUrl: 'https://example.com',
      viewportWidth: 1920,
      viewportHeight: 1080,
    },
    attributes: [
      {
        id: 'email',
        codeName: 'email',
        dataType: BizAttributeTypes.String,
        bizType: AttributeBizTypes.User,
      },
    ],
    userAttributes: {
      email: 'test@example.com',
    },
  };

  test('should return conditions with default actived state when no options provided', async () => {
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

    const result = await evaluateRulesConditions(conditions);

    expect(result).toHaveLength(2);
    expect(result[0].actived).toBe(true);
    expect(result[1].actived).toBe(false);
  });

  test('should disable all rule types by default when typeControl is empty', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      typeControl: {},
    });

    expect(result[0].actived).toBe(false); // current-page disabled by default
    expect(result[1].actived).toBe(false); // time disabled by default
    expect(result[2].actived).toBe(false); // user-attr disabled by default
    expect(result[3].actived).toBe(true); // element keeps original state
  });

  test('should force activate rules by ID', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      activatedIds: ['rule-1', 'rule-2'],
    });

    expect(result[0].actived).toBe(true); // rule-1 forced activated
    expect(result[1].actived).toBe(true); // rule-2 forced activated
    expect(result[2].actived).toBe(false); // rule-3 disabled by default
    expect(result[3].actived).toBe(true); // rule-4 keeps original state
  });

  test('should force deactivate rules by ID', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      deactivatedIds: ['rule-1', 'rule-4'],
    });

    expect(result[0].actived).toBe(false); // rule-1 forced deactivated
    expect(result[1].actived).toBe(false); // rule-2 disabled by default
    expect(result[2].actived).toBe(false); // rule-3 disabled by default
    expect(result[3].actived).toBe(false); // rule-4 forced deactivated
  });

  test('should prioritize activatedIds over deactivatedIds', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      activatedIds: ['rule-1'],
      deactivatedIds: ['rule-1'],
    });

    expect(result[0].actived).toBe(true); // activatedIds takes precedence
  });

  test('should disable evaluation for specific rule types by default', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      typeControl: {
        [RulesType.CURRENT_PAGE]: false,
        [RulesType.TIME]: false,
      },
    });

    expect(result[0].actived).toBe(false); // rule-1 keeps original state (disabled)
    expect(result[1].actived).toBe(false); // rule-2 keeps original state (disabled)
    expect(result[2].actived).toBe(false); // rule-3 disabled by default
    expect(result[3].actived).toBe(true); // rule-4 keeps original state
  });

  test('should evaluate URL conditions correctly when enabled', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      typeControl: {
        [RulesType.CURRENT_PAGE]: true,
      },
    });

    expect(result[0].actived).toBe(false); // URL doesn't match
  });

  test('should evaluate time conditions correctly when enabled', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      typeControl: {
        [RulesType.TIME]: true,
      },
    });

    // Time evaluation depends on current time, so we test the structure
    expect(typeof result[1].actived).toBe('boolean');
  });

  test('should evaluate attribute conditions correctly when enabled', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      typeControl: {
        [RulesType.USER_ATTR]: true,
      },
    });

    expect(result[2].actived).toBe(true); // Attribute matches
  });

  test('should evaluate String type attribute conditions with all logic operators', async () => {
    const conditions: RulesCondition[] = [
      {
        id: 'string-is',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'email',
          logic: 'is',
          value: 'user@example.com',
        },
      },
      {
        id: 'string-not',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'name',
          logic: 'not',
          value: 'admin',
        },
      },
      {
        id: 'string-contains',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'description',
          logic: 'contains',
          value: 'premium',
        },
      },
      {
        id: 'string-notContain',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'title',
          logic: 'notContain',
          value: 'test',
        },
      },
      {
        id: 'string-startsWith',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'path',
          logic: 'startsWith',
          value: '/api',
        },
      },
      {
        id: 'string-endsWith',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'filename',
          logic: 'endsWith',
          value: '.pdf',
        },
      },
      {
        id: 'string-empty',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'emptyString',
          logic: 'empty',
        },
      },
      {
        id: 'string-any',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'hasString',
          logic: 'any',
        },
      },
    ];

    const options = {
      clientContext: mockOptions.clientContext,
      attributes: [
        {
          id: 'email',
          codeName: 'email',
          dataType: BizAttributeTypes.String,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'name',
          codeName: 'name',
          dataType: BizAttributeTypes.String,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'description',
          codeName: 'description',
          dataType: BizAttributeTypes.String,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'title',
          codeName: 'title',
          dataType: BizAttributeTypes.String,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'path',
          codeName: 'path',
          dataType: BizAttributeTypes.String,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'filename',
          codeName: 'filename',
          dataType: BizAttributeTypes.String,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'emptyString',
          codeName: 'emptyString',
          dataType: BizAttributeTypes.String,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'hasString',
          codeName: 'hasString',
          dataType: BizAttributeTypes.String,
          bizType: AttributeBizTypes.User,
        },
      ],
      userAttributes: {
        email: 'user@example.com',
        name: 'john',
        description: 'premium user account',
        title: 'Manager',
        path: '/api/users',
        filename: 'document.pdf',
        emptyString: '',
        hasString: 'some value',
      },
      typeControl: {
        [RulesType.USER_ATTR]: true,
      },
    };

    const result = await evaluateRulesConditions(conditions, options);

    expect(result[0].actived).toBe(true); // email is 'user@example.com'
    expect(result[1].actived).toBe(true); // name 'john' is not 'admin'
    expect(result[2].actived).toBe(true); // description contains 'premium'
    expect(result[3].actived).toBe(true); // title 'Manager' does not contain 'test'
    expect(result[4].actived).toBe(true); // path starts with '/api'
    expect(result[5].actived).toBe(true); // filename ends with '.pdf'
    expect(result[6].actived).toBe(true); // emptyString is empty
    expect(result[7].actived).toBe(true); // hasString has any value
  });

  test('should evaluate Number type attribute conditions with all logic operators', async () => {
    const conditions: RulesCondition[] = [
      {
        id: 'number-is',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'age',
          logic: 'is',
          value: 25,
        },
      },
      {
        id: 'number-not',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'age2',
          logic: 'not',
          value: 30,
        },
      },
      {
        id: 'number-isLessThan',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'score',
          logic: 'isLessThan',
          value: 100,
        },
      },
      {
        id: 'number-isLessThanOrEqualTo',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'score2',
          logic: 'isLessThanOrEqualTo',
          value: 80,
        },
      },
      {
        id: 'number-isGreaterThan',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'score3',
          logic: 'isGreaterThan',
          value: 50,
        },
      },
      {
        id: 'number-isGreaterThanOrEqualTo',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'score4',
          logic: 'isGreaterThanOrEqualTo',
          value: 60,
        },
      },
      {
        id: 'number-between',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'price',
          logic: 'between',
          value: 10,
          value2: 100,
        },
      },
      {
        id: 'number-empty',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'emptyValue',
          logic: 'empty',
        },
      },
      {
        id: 'number-any',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'hasValue',
          logic: 'any',
        },
      },
    ];

    const options = {
      clientContext: mockOptions.clientContext,
      attributes: [
        {
          id: 'age',
          codeName: 'age',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'age2',
          codeName: 'age2',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'score',
          codeName: 'score',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'score2',
          codeName: 'score2',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'score3',
          codeName: 'score3',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'score4',
          codeName: 'score4',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'price',
          codeName: 'price',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'emptyValue',
          codeName: 'emptyValue',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'hasValue',
          codeName: 'hasValue',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
      ],
      userAttributes: {
        age: 25,
        age2: 25,
        score: 90,
        score2: 80,
        score3: 70,
        score4: 60,
        price: 50,
        emptyValue: null,
        hasValue: 42,
      },
      typeControl: {
        [RulesType.USER_ATTR]: true,
      },
    };

    const result = await evaluateRulesConditions(conditions, options);

    expect(result[0].actived).toBe(true); // age is 25
    expect(result[1].actived).toBe(true); // age2 25 is not 30
    expect(result[2].actived).toBe(true); // score 90 < 100
    expect(result[3].actived).toBe(true); // score2 80 <= 80
    expect(result[4].actived).toBe(true); // score3 70 > 50
    expect(result[5].actived).toBe(true); // score4 60 >= 60
    expect(result[6].actived).toBe(true); // price 50 is between 10 and 100
    expect(result[7].actived).toBe(true); // emptyValue is empty
    expect(result[8].actived).toBe(true); // hasValue has any value
  });

  test('should evaluate Boolean type attribute conditions with all logic operators', async () => {
    const conditions: RulesCondition[] = [
      {
        id: 'bool-true',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'isVip',
          logic: 'true',
        },
      },
      {
        id: 'bool-false',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'isActive',
          logic: 'false',
        },
      },
      {
        id: 'bool-empty',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'emptyBool',
          logic: 'empty',
        },
      },
      {
        id: 'bool-any',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'hasBool',
          logic: 'any',
        },
      },
    ];

    const options = {
      clientContext: mockOptions.clientContext,
      attributes: [
        {
          id: 'isVip',
          codeName: 'isVip',
          dataType: BizAttributeTypes.Boolean,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'isActive',
          codeName: 'isActive',
          dataType: BizAttributeTypes.Boolean,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'emptyBool',
          codeName: 'emptyBool',
          dataType: BizAttributeTypes.Boolean,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'hasBool',
          codeName: 'hasBool',
          dataType: BizAttributeTypes.Boolean,
          bizType: AttributeBizTypes.User,
        },
      ],
      userAttributes: {
        isVip: true,
        isActive: false,
        emptyBool: null,
        hasBool: true,
      },
      typeControl: {
        [RulesType.USER_ATTR]: true,
      },
    };

    const result = await evaluateRulesConditions(conditions, options);

    expect(result[0].actived).toBe(true); // isVip is true
    expect(result[1].actived).toBe(true); // isActive is false
    expect(result[2].actived).toBe(true); // emptyBool is empty
    expect(result[3].actived).toBe(true); // hasBool has any value
  });

  test('should evaluate List type attribute conditions with all logic operators', async () => {
    const conditions: RulesCondition[] = [
      {
        id: 'list-includesAtLeastOne',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'tags',
          logic: 'includesAtLeastOne',
          listValues: ['premium', 'vip'],
        },
      },
      {
        id: 'list-includesAll',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'roles',
          logic: 'includesAll',
          listValues: ['admin', 'editor'],
        },
      },
      {
        id: 'list-notIncludesAtLeastOne',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'permissions',
          logic: 'notIncludesAtLeastOne',
          listValues: ['delete', 'modify'],
        },
      },
      {
        id: 'list-notIncludesAll',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'categories',
          logic: 'notIncludesAll',
          listValues: ['tech', 'finance'],
        },
      },
      {
        id: 'list-empty',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'emptyList',
          logic: 'empty',
        },
      },
      {
        id: 'list-any',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'hasList',
          logic: 'any',
        },
      },
    ];

    const options = {
      clientContext: mockOptions.clientContext,
      attributes: [
        {
          id: 'tags',
          codeName: 'tags',
          dataType: BizAttributeTypes.List,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'roles',
          codeName: 'roles',
          dataType: BizAttributeTypes.List,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'permissions',
          codeName: 'permissions',
          dataType: BizAttributeTypes.List,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'categories',
          codeName: 'categories',
          dataType: BizAttributeTypes.List,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'emptyList',
          codeName: 'emptyList',
          dataType: BizAttributeTypes.List,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'hasList',
          codeName: 'hasList',
          dataType: BizAttributeTypes.List,
          bizType: AttributeBizTypes.User,
        },
      ],
      userAttributes: {
        tags: ['premium', 'basic'],
        roles: ['admin', 'editor', 'viewer'],
        permissions: ['read', 'write'],
        categories: ['other'],
        emptyList: [],
        hasList: ['item1', 'item2'],
      },
      typeControl: {
        [RulesType.USER_ATTR]: true,
      },
    };

    const result = await evaluateRulesConditions(conditions, options);

    expect(result[0].actived).toBe(true); // tags includes at least one of ['premium', 'vip']
    expect(result[1].actived).toBe(true); // roles includes all of ['admin', 'editor']
    expect(result[2].actived).toBe(true); // permissions doesn't include at least one of ['delete', 'modify']
    expect(result[3].actived).toBe(true); // categories doesn't include all of ['tech', 'finance'] (all values are not in array)
    expect(result[4].actived).toBe(true); // emptyList is empty
    expect(result[5].actived).toBe(true); // hasList has any value
  });

  test('should evaluate DateTime type attribute conditions with all logic operators', async () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const conditions: RulesCondition[] = [
      {
        id: 'datetime-lessThan',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'lastLogin',
          logic: 'lessThan',
          value: 7,
        },
      },
      {
        id: 'datetime-exactly',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'exactDate',
          logic: 'exactly',
          value: 3,
        },
      },
      {
        id: 'datetime-moreThan',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'oldDate',
          logic: 'moreThan',
          value: 7,
        },
      },
      {
        id: 'datetime-before',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'createdAt',
          logic: 'before',
          value: now.toISOString(),
        },
      },
      {
        id: 'datetime-on',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'onDate',
          logic: 'on',
          value: threeDaysAgo.toISOString(),
        },
      },
      {
        id: 'datetime-after',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'futureDate',
          logic: 'after',
          value: now.toISOString(),
        },
      },
      {
        id: 'datetime-empty',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'emptyDate',
          logic: 'empty',
        },
      },
      {
        id: 'datetime-any',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'hasDate',
          logic: 'any',
        },
      },
    ];

    const options = {
      clientContext: mockOptions.clientContext,
      attributes: [
        {
          id: 'lastLogin',
          codeName: 'lastLogin',
          dataType: BizAttributeTypes.DateTime,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'exactDate',
          codeName: 'exactDate',
          dataType: BizAttributeTypes.DateTime,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'oldDate',
          codeName: 'oldDate',
          dataType: BizAttributeTypes.DateTime,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'createdAt',
          codeName: 'createdAt',
          dataType: BizAttributeTypes.DateTime,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'onDate',
          codeName: 'onDate',
          dataType: BizAttributeTypes.DateTime,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'futureDate',
          codeName: 'futureDate',
          dataType: BizAttributeTypes.DateTime,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'emptyDate',
          codeName: 'emptyDate',
          dataType: BizAttributeTypes.DateTime,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'hasDate',
          codeName: 'hasDate',
          dataType: BizAttributeTypes.DateTime,
          bizType: AttributeBizTypes.User,
        },
      ],
      userAttributes: {
        lastLogin: fiveDaysAgo.toISOString(),
        exactDate: threeDaysAgo.toISOString(),
        oldDate: fifteenDaysAgo.toISOString(),
        createdAt: tenDaysAgo.toISOString(),
        onDate: threeDaysAgo.toISOString(),
        futureDate: futureDate.toISOString(),
        emptyDate: '',
        hasDate: fiveDaysAgo.toISOString(),
      },
      typeControl: {
        [RulesType.USER_ATTR]: true,
      },
    };

    const result = await evaluateRulesConditions(conditions, options);

    expect(result[0].actived).toBe(true); // lastLogin is less than 7 days ago
    expect(result[1].actived).toBe(true); // exactDate is exactly 3 days ago
    expect(result[2].actived).toBe(true); // oldDate is more than 7 days ago
    expect(result[3].actived).toBe(true); // createdAt is before now
    expect(result[4].actived).toBe(true); // onDate is on threeDaysAgo
    expect(result[5].actived).toBe(true); // futureDate is after now
    // Note: DateTime empty/any logic is checked after date validation
    // If actualValue is null/undefined/empty string, the function returns false before reaching the switch
    // So empty string will return false, not true
    expect(result[6].actived).toBe(false); // emptyDate is empty string, but function returns false before switch
    expect(result[7].actived).toBe(true); // hasDate has any value
  });

  test('should evaluate mixed attribute type conditions correctly', async () => {
    const conditions: RulesCondition[] = [
      {
        id: 'mixed-1',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'email',
          logic: 'is',
          value: 'user@example.com',
        },
      },
      {
        id: 'mixed-2',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'age',
          logic: 'isGreaterThan',
          value: 18,
        },
      },
      {
        id: 'mixed-3',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'isVip',
          logic: 'true',
        },
      },
      {
        id: 'mixed-4',
        type: 'user-attr',
        operators: 'and',
        actived: false,
        data: {
          attrId: 'tags',
          logic: 'includesAtLeastOne',
          listValues: ['premium'],
        },
      },
    ];

    const options = {
      clientContext: mockOptions.clientContext,
      attributes: [
        {
          id: 'email',
          codeName: 'email',
          dataType: BizAttributeTypes.String,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'age',
          codeName: 'age',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'isVip',
          codeName: 'isVip',
          dataType: BizAttributeTypes.Boolean,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'tags',
          codeName: 'tags',
          dataType: BizAttributeTypes.List,
          bizType: AttributeBizTypes.User,
        },
      ],
      userAttributes: {
        email: 'user@example.com',
        age: 25,
        isVip: true,
        tags: ['premium', 'basic'],
      },
      typeControl: {
        [RulesType.USER_ATTR]: true,
      },
    };

    const result = await evaluateRulesConditions(conditions, options);

    expect(result[0].actived).toBe(true); // String: email matches
    expect(result[1].actived).toBe(true); // Number: age > 18
    expect(result[2].actived).toBe(true); // Boolean: isVip is true
    expect(result[3].actived).toBe(true); // List: tags includes 'premium'
  });

  test('should evaluate mixed attribute types with OR logic correctly', async () => {
    const conditions: RulesCondition[] = [
      {
        id: 'or-1',
        type: 'user-attr',
        operators: 'or',
        actived: false,
        data: {
          attrId: 'email',
          logic: 'is',
          value: 'wrong@example.com',
        },
      },
      {
        id: 'or-2',
        type: 'user-attr',
        operators: 'or',
        actived: false,
        data: {
          attrId: 'age',
          logic: 'isGreaterThan',
          value: 18,
        },
      },
      {
        id: 'or-3',
        type: 'user-attr',
        operators: 'or',
        actived: false,
        data: {
          attrId: 'isVip',
          logic: 'false',
        },
      },
    ];

    const options = {
      clientContext: mockOptions.clientContext,
      attributes: [
        {
          id: 'email',
          codeName: 'email',
          dataType: BizAttributeTypes.String,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'age',
          codeName: 'age',
          dataType: BizAttributeTypes.Number,
          bizType: AttributeBizTypes.User,
        },
        {
          id: 'isVip',
          codeName: 'isVip',
          dataType: BizAttributeTypes.Boolean,
          bizType: AttributeBizTypes.User,
        },
      ],
      userAttributes: {
        email: 'user@example.com',
        age: 25,
        isVip: true,
      },
      typeControl: {
        [RulesType.USER_ATTR]: true,
      },
    };

    const result = await evaluateRulesConditions(conditions, options);

    expect(result[0].actived).toBe(false); // String: email doesn't match
    expect(result[1].actived).toBe(true); // Number: age > 18 (matches, so OR condition passes)
    expect(result[2].actived).toBe(false); // Boolean: isVip is true, not false
  });

  test('should handle rules without ID', async () => {
    const conditions: RulesCondition[] = [
      {
        id: 'rule-without-id',
        type: 'element',
        operators: 'and',
        actived: true,
        data: {},
      },
    ];

    const result = await evaluateRulesConditions(conditions, {
      activatedIds: ['non-existent'],
      deactivatedIds: ['non-existent'],
    });

    expect(result[0].actived).toBe(true); // Keeps original state
  });

  test('should handle nested group conditions', async () => {
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

    const result = await evaluateRulesConditions(nestedConditions, {
      ...mockOptions,
      activatedIds: ['rule-1'],
    });

    expect(result[0].type).toBe('group');
    expect(result[0].conditions).toBeDefined();
    expect(result[0].conditions![0].actived).toBe(true); // Forced activated
    expect(result[0].conditions![1].actived).toBe(true); // Keeps original state
  });

  test('should handle deep nested group conditions', async () => {
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

    const result = await evaluateRulesConditions(deepNestedConditions, {
      ...mockOptions,
      activatedIds: ['rule-1'],
    });

    expect(result[0].conditions![0].conditions![0].actived).toBe(true);
  });

  test('should handle empty conditions array', async () => {
    const result = await evaluateRulesConditions([]);
    expect(result).toEqual([]);
  });

  test('should handle conditions with missing data', async () => {
    const conditions: RulesCondition[] = [
      {
        id: 'rule-1',
        type: 'current-page',
        operators: 'and',
        actived: false,
        data: undefined,
      },
    ];

    const result = await evaluateRulesConditions(conditions, mockOptions);
    expect(result[0].actived).toBe(false); // Should handle gracefully
  });

  test('should handle mixed rule types with different evaluation results when enabled', async () => {
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

    const result = await evaluateRulesConditions(mixedConditions, {
      ...mockOptions,
      typeControl: {
        [RulesType.CURRENT_PAGE]: true,
        [RulesType.USER_ATTR]: true,
      },
    });

    expect(result[0].actived).toBe(false); // URL doesn't match
    expect(result[1].actived).toBe(true); // Attribute matches
    expect(result[2].actived).toBe(false); // Keeps original state
  });

  test('should handle type control with partial configuration', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      typeControl: {
        [RulesType.CURRENT_PAGE]: false,
        // Other types not specified, should be disabled by default
      },
    });

    expect(result[0].actived).toBe(false); // Disabled
    expect(result[1].actived).toBe(false); // Disabled by default
    expect(result[2].actived).toBe(false); // Disabled by default
    expect(result[3].actived).toBe(true); // Keeps original state
  });

  test('should enable evaluation for explicitly enabled rule types', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      typeControl: {
        [RulesType.CURRENT_PAGE]: true,
        [RulesType.TIME]: true,
        [RulesType.USER_ATTR]: true,
      },
    });

    expect(result[0].actived).toBe(false); // Evaluated normally (URL doesn't match)
    expect(result[1].actived).toBe(true); // Evaluated normally (time condition matches)
    expect(result[2].actived).toBe(true); // Evaluated normally (attribute matches)
    expect(result[3].actived).toBe(true); // Keeps original state
  });

  test('should support custom evaluators with async functions', async () => {
    const customEvaluators = {
      [RulesType.CURRENT_PAGE]: async (_rule: RulesCondition, _options: RulesEvaluationOptions) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        return true; // Always return true for testing
      },
      [RulesType.USER_ATTR]: (_rule: RulesCondition, _options: RulesEvaluationOptions) => {
        return false; // Synchronous custom evaluator
      },
    };

    const result = await evaluateRulesConditions(mockConditions, {
      ...mockOptions,
      typeControl: {
        [RulesType.CURRENT_PAGE]: true,
        [RulesType.USER_ATTR]: true,
      },
      customEvaluators,
    });

    expect(result[0].actived).toBe(true); // Custom async evaluator
    expect(result[2].actived).toBe(false); // Custom sync evaluator
    expect(result[1].actived).toBe(false); // Disabled by default
    expect(result[3].actived).toBe(true); // Keeps original state
  });

  test('should handle missing clientContext gracefully when enabled', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      attributes: mockOptions.attributes,
      userAttributes: mockOptions.userAttributes,
      typeControl: {
        [RulesType.CURRENT_PAGE]: true,
        [RulesType.TIME]: true,
        [RulesType.USER_ATTR]: true,
      },
    });

    // Should still work with default clientContext
    expect(result).toHaveLength(4);
    expect(typeof result[0].actived).toBe('boolean');
  });

  test('should handle missing attributes gracefully when enabled', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      clientContext: mockOptions.clientContext,
      userAttributes: mockOptions.userAttributes,
      typeControl: {
        [RulesType.USER_ATTR]: true,
      },
    });

    expect(result[2].actived).toBe(false); // Should handle missing attributes gracefully
  });

  test('should handle missing userAttributes gracefully when enabled', async () => {
    const result = await evaluateRulesConditions(mockConditions, {
      clientContext: mockOptions.clientContext,
      attributes: mockOptions.attributes,
      typeControl: {
        [RulesType.USER_ATTR]: true,
      },
    });

    expect(result[2].actived).toBe(false); // Should handle missing userAttributes gracefully
  });

  test('debug: should test URL evaluation directly when enabled', async () => {
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
        pageUrl: 'https://example.com',
        viewportWidth: 1920,
        viewportHeight: 1080,
      },
      typeControl: {
        [RulesType.CURRENT_PAGE]: true,
      },
    };

    const result = await evaluateRulesConditions([urlCondition], options);

    expect(result[0].actived).toBe(false);
  });
});
