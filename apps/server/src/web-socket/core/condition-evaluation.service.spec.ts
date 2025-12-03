import { Test, TestingModule } from '@nestjs/testing';
import {
  ConditionEvaluationService,
  ConditionEvaluationContext,
} from './condition-evaluation.service';
import { PrismaService } from 'nestjs-prisma';
import { RulesCondition, BizAttributeTypes, ChecklistData, RulesType } from '@usertour/types';
import { AttributeBizType } from '@/attributes/models/attribute.model';
import { Step } from '@/common/types/schema';

describe('ConditionEvaluationService', () => {
  let service: ConditionEvaluationService;

  const createMockContext = (): ConditionEvaluationContext => ({
    environment: {
      id: 'env-1',
      projectId: 'project-1',
      name: 'Test Environment',
      token: 'test-token',
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    bizUser: {
      id: 'biz-user-1',
      externalUserId: 'user-1',
      externalCompanyId: 'company-1',
      data: {
        email: 'user@example.com',
        age: 25,
        isPremium: true,
        roles: ['admin', 'user'],
      },
    } as any,
    externalCompanyId: 'company-1',
    attributes: [
      {
        id: 'attr-email',
        codeName: 'email',
        dataType: BizAttributeTypes.String,
        bizType: AttributeBizType.USER,
        projectId: 'project-1',
        displayName: 'Email',
        description: 'User email',
        createdAt: new Date(),
        updatedAt: new Date(),
        predefined: false,
        randomMax: 0,
        source: '',
      },
      {
        id: 'attr-age',
        codeName: 'age',
        dataType: BizAttributeTypes.Number,
        bizType: AttributeBizType.USER,
        projectId: 'project-1',
        displayName: 'Age',
        description: 'User age',
        createdAt: new Date(),
        updatedAt: new Date(),
        predefined: false,
        randomMax: 0,
        source: '',
      },
      {
        id: 'attr-isPremium',
        codeName: 'isPremium',
        dataType: BizAttributeTypes.Boolean,
        bizType: AttributeBizType.USER,
        projectId: 'project-1',
        displayName: 'Is Premium',
        description: 'User premium status',
        createdAt: new Date(),
        updatedAt: new Date(),
        predefined: false,
        randomMax: 0,
        source: '',
      },
      {
        id: 'attr-roles',
        codeName: 'roles',
        dataType: BizAttributeTypes.List,
        bizType: AttributeBizType.USER,
        projectId: 'project-1',
        displayName: 'Roles',
        description: 'User roles',
        createdAt: new Date(),
        updatedAt: new Date(),
        predefined: false,
        randomMax: 0,
        source: '',
      },
      {
        id: 'attr-companyName',
        codeName: 'companyName',
        dataType: BizAttributeTypes.String,
        bizType: AttributeBizType.COMPANY,
        projectId: 'project-1',
        displayName: 'Company Name',
        description: 'Company name',
        createdAt: new Date(),
        updatedAt: new Date(),
        predefined: false,
        randomMax: 0,
        source: '',
      },
    ] as any,
  });

  beforeEach(async () => {
    const mockPrismaService = {
      attribute: {
        findMany: jest.fn(),
      },
      bizSegment: {
        findMany: jest.fn(),
      },
      bizEvent: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConditionEvaluationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ConditionEvaluationService>(ConditionEvaluationService);
  });

  describe('evaluateRulesConditions', () => {
    it('should evaluate simple user attribute condition correctly', async () => {
      const conditions: RulesCondition[] = [
        {
          id: 'rule-1',
          type: RulesType.USER_ATTR,
          operators: 'and',
          data: {
            attrId: 'attr-email',
            logic: 'is',
            value: 'user@example.com',
          },
        },
      ];

      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result).toHaveLength(1);
      expect(result[0].actived).toBe(true);
    });

    it('should evaluate group conditions with AND logic', async () => {
      const conditions: RulesCondition[] = [
        {
          id: 'rule-1',
          type: 'group',
          operators: 'and',
          data: {},
          conditions: [
            {
              id: 'rule-1-1',
              type: RulesType.USER_ATTR,
              operators: 'and',
              data: {
                attrId: 'attr-email',
                logic: 'contains',
                value: 'example.com',
              },
            },
            {
              id: 'rule-1-2',
              type: RulesType.USER_ATTR,
              operators: 'and',
              data: {
                attrId: 'attr-age',
                logic: 'isGreaterThan',
                value: 18,
              },
            },
          ],
        },
      ];

      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('group');
      expect(result[0].conditions).toBeDefined();
      expect(result[0].conditions![0].actived).toBe(true);
      expect(result[0].conditions![1].actived).toBe(true);
    });

    it('should return false for non-existent attribute', async () => {
      const conditions: RulesCondition[] = [
        {
          id: 'rule-1',
          type: RulesType.USER_ATTR,
          operators: 'and',
          data: {
            attrId: 'attr-non-existent',
            logic: 'is',
            value: 'value',
          },
        },
      ];

      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result).toHaveLength(1);
      expect(result[0].actived).toBe(false);
    });

    it('should handle empty conditions array', async () => {
      const conditions: RulesCondition[] = [];
      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result).toEqual([]);
    });

    it('should evaluate number attribute condition correctly', async () => {
      const conditions: RulesCondition[] = [
        {
          id: 'rule-1',
          type: RulesType.USER_ATTR,
          operators: 'and',
          data: {
            attrId: 'attr-age',
            logic: 'isGreaterThan',
            value: 18,
          },
        },
      ];

      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result).toHaveLength(1);
      expect(result[0].actived).toBe(true);
    });

    it('should evaluate boolean attribute condition correctly', async () => {
      const conditions: RulesCondition[] = [
        {
          id: 'rule-1',
          type: RulesType.USER_ATTR,
          operators: 'and',
          data: {
            attrId: 'attr-isPremium',
            logic: 'true',
          },
        },
      ];

      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result).toHaveLength(1);
      expect(result[0].actived).toBe(true);
    });

    it('should evaluate list attribute condition correctly', async () => {
      const conditions: RulesCondition[] = [
        {
          id: 'rule-1',
          type: RulesType.USER_ATTR,
          operators: 'and',
          data: {
            attrId: 'attr-roles',
            logic: 'includesAtLeastOne',
            listValues: ['admin'],
          },
        },
      ];

      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result).toHaveLength(1);
      expect(result[0].actived).toBe(true);
    });
  });

  describe('evaluateChecklistConditions', () => {
    it('should evaluate checklist item conditions correctly', async () => {
      const checklistData: ChecklistData = {
        buttonText: '',
        initialDisplay: 'all',
        completionOrder: 'any',
        preventDismissChecklist: false,
        items: [
          {
            id: 'item-1',
            name: 'Task 1',
            isCompleted: false,
            clickedActions: [],
            onlyShowTask: false,
            completeConditions: [
              {
                id: 'condition-1',
                type: RulesType.USER_ATTR,
                operators: 'and',
                data: {
                  attrId: 'attr-email',
                  logic: 'is',
                  value: 'user@example.com',
                },
              },
            ],
            onlyShowTaskConditions: [],
          } as any,
        ],
      } as any;

      const context = createMockContext();
      const result = await service.evaluateChecklistConditions(checklistData, context);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].completeConditions).toBeDefined();
      expect(result.items[0].completeConditions![0].actived).toBe(true);
    });

    it('should handle checklist items without conditions', async () => {
      const checklistData: ChecklistData = {
        buttonText: '',
        initialDisplay: 'all',
        completionOrder: 'any',
        preventDismissChecklist: false,
        items: [
          {
            id: 'item-1',
            name: 'Task 1',
            isCompleted: false,
            clickedActions: [],
            onlyShowTask: false,
            completeConditions: [],
            onlyShowTaskConditions: [],
          } as any,
        ],
      } as any;

      const context = createMockContext();
      const result = await service.evaluateChecklistConditions(checklistData, context);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].completeConditions).toEqual([]);
    });
  });

  describe('evaluateStepTriggers', () => {
    it('should evaluate step triggers correctly', async () => {
      const steps: Step[] = [
        {
          id: 'step-1',
          cvid: 'cvid-1',
          name: 'Step 1',
          type: 'tooltip',
          sequence: 1,
          setting: {},
          trigger: [
            {
              id: 'trigger-1',
              actions: [],
              conditions: [
                {
                  id: 'condition-1',
                  type: RulesType.USER_ATTR,
                  operators: 'and',
                  data: {
                    attrId: 'attr-email',
                    logic: 'is',
                    value: 'user@example.com',
                  },
                },
              ],
            },
          ],
        } as any,
      ];

      const context = createMockContext();
      const result = await service.evaluateStepTriggers(steps, context);

      expect(result).toHaveLength(1);
      expect(result[0].trigger).toBeDefined();
      if (Array.isArray(result[0].trigger)) {
        const trigger = result[0].trigger[0] as any;
        expect(trigger.conditions[0].actived).toBe(true);
      }
    });

    it('should handle steps without triggers', async () => {
      const steps: Step[] = [
        {
          id: 'step-1',
          cvid: 'cvid-1',
          name: 'Step 1',
          type: 'tooltip',
          sequence: 1,
          setting: {},
        } as any,
      ];

      const context = createMockContext();
      const result = await service.evaluateStepTriggers(steps, context);

      expect(result).toHaveLength(1);
      expect(result[0].trigger).toBeUndefined();
    });
  });
});
