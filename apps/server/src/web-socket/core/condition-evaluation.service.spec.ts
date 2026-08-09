import { Test, TestingModule } from '@nestjs/testing';
import {
  ConditionEvaluationService,
  ConditionEvaluationContext,
} from './condition-evaluation.service';
import { PrismaService } from 'nestjs-prisma';
import { ProjectCacheService } from '@/shared/project-cache.service';
import {
  RulesCondition,
  BizAttributeTypes,
  ChecklistData,
  RulesType,
  ContentConditionLogic,
  BizEvents,
  EventCountLogic,
  EventTimeLogic,
  EventTimeUnit,
  EventScope,
} from '@usertour/types';
import { AttributeBizType } from '@/attributes/models/attribute.model';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import {
  createBizCompanyConditionsFilter,
  createBizUserConditionsFilter,
} from '@/common/attribute/filter';
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
      isPrimary: false,
      requireIdentityVerification: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    bizUser: {
      id: 'biz-user-1',
      // The model field is `externalId` (prisma: BizUser.externalId) and the
      // CONDITION-segment path reads it directly. The fixture used to carry
      // `externalUserId`, a name that exists only as a local in
      // web-socket.service.ts — no code reads it off a BizUser, and the `as
      // any` cast hid the mismatch.
      externalId: 'user-1',
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
      {
        id: 'attr-event-action',
        codeName: 'action',
        dataType: BizAttributeTypes.String,
        bizType: AttributeBizType.EVENT,
        projectId: 'project-1',
        displayName: 'Action',
        description: 'Event action attribute',
        createdAt: new Date(),
        updatedAt: new Date(),
        predefined: false,
        randomMax: 0,
        source: '',
      },
      {
        id: 'attr-event-timestamp',
        codeName: 'timestamp',
        dataType: BizAttributeTypes.DateTime,
        bizType: AttributeBizType.EVENT,
        projectId: 'project-1',
        displayName: 'Timestamp',
        description: 'Event timestamp attribute',
        createdAt: new Date(),
        updatedAt: new Date(),
        predefined: false,
        randomMax: 0,
        source: '',
      },
    ] as any,
  });

  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      attribute: {
        findMany: jest.fn(),
      },
      bizSegment: {
        findMany: jest.fn(),
      },
      bizEvent: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      segment: {
        findFirst: jest.fn(),
      },
      bizUserOnSegment: {
        findFirst: jest.fn(),
      },
      bizUser: {
        findFirst: jest.fn(),
      },
      bizUserOnCompany: {
        findFirst: jest.fn(),
      },
      bizCompanyOnSegment: {
        findFirst: jest.fn(),
      },
      bizCompany: {
        findFirst: jest.fn(),
      },
      bizSession: {
        count: jest.fn(),
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
        {
          // memoize without a request scope just runs the loader, matching
          // the production fallback path; the unit tests don't exercise
          // cross-call deduplication so this is sufficient.
          provide: ProjectCacheService,
          useValue: {
            memoize: <T>(_key: string, loader: () => Promise<T>) => loader(),
            memoKeys: {
              bizUserOnCompanyWithBizCompany: (
                bizUserId: string,
                envId: string,
                externalCompanyId: string,
              ) => `bizUserOnCompanyWithBizCompany:${bizUserId}:${envId}:${externalCompanyId}`,
              // Segment lookups memoize under their own namespaces. Missing
              // these is why the segment path could not be exercised at all:
              // the service calls memoKeys.segment(...) before any query, so a
              // segment test threw on an undefined key builder rather than
              // failing an assertion.
              segment: (segmentId: string) => `segment:${segmentId}`,
              bizUserOnSegment: (segmentId: string, bizUserId: string) =>
                `bizUserOnSegment:${segmentId}:${bizUserId}`,
              bizCompanyOnSegment: (segmentId: string, bizCompanyId: string) =>
                `bizCompanyOnSegment:${segmentId}:${bizCompanyId}`,
            },
          },
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

  describe('Content Condition Evaluation', () => {
    describe('Activation Condition (activated/unactivated)', () => {
      it('should return true when content is activated and logic is actived', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(1);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.ACTIVED,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(true);
        expect(mockPrismaService.bizSession.count).toHaveBeenCalledWith({
          where: {
            contentId: 'content-1',
            bizUserId: 'biz-user-1',
            deleted: false,
            state: 0,
          },
        });
      });

      it('should return false when content is not activated and logic is actived', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(0);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.ACTIVED,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(false);
      });

      it('should return true when content is not activated and logic is unactived', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(0);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.UNACTIVED,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(true);
      });

      it('should return false when content is activated and logic is unactived', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(1);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.UNACTIVED,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(false);
      });
    });

    describe('Seen Condition (seen/unseen)', () => {
      it('should return true when content is seen and logic is seen', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(1);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.SEEN,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(true);
        expect(mockPrismaService.bizSession.count).toHaveBeenCalledWith({
          where: {
            contentId: 'content-1',
            bizUserId: 'biz-user-1',
            deleted: false,
            bizEvent: {
              some: {
                event: { codeName: { in: [BizEvents.FLOW_STEP_SEEN, BizEvents.CHECKLIST_SEEN] } },
              },
            },
          },
        });
      });

      it('should return false when content is not seen and logic is seen', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(0);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.SEEN,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(false);
      });

      it('should return true when content is not seen and logic is unseen', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(0);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.UNSEEN,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(true);
      });

      it('should return false when content is seen and logic is unseen', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(1);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.UNSEEN,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(false);
      });
    });

    describe('Completed Condition (completed/uncompleted)', () => {
      it('should return true when content is completed and logic is completed', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(1);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.COMPLETED,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(true);
        expect(mockPrismaService.bizSession.count).toHaveBeenCalledWith({
          where: {
            contentId: 'content-1',
            bizUserId: 'biz-user-1',
            deleted: false,
            bizEvent: {
              some: {
                event: {
                  codeName: { in: [BizEvents.FLOW_COMPLETED, BizEvents.CHECKLIST_COMPLETED] },
                },
              },
            },
          },
        });
      });

      it('should return false when content is not completed and logic is completed', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(0);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.COMPLETED,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(false);
      });

      it('should return true when content is not completed and logic is uncompleted', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(0);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.UNCOMPLETED,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(true);
      });

      it('should return false when content is completed and logic is uncompleted', async () => {
        mockPrismaService.bizSession.count.mockResolvedValue(1);

        const conditions: RulesCondition[] = [
          {
            id: 'rule-1',
            type: RulesType.CONTENT,
            operators: 'and',
            data: {
              contentId: 'content-1',
              logic: ContentConditionLogic.UNCOMPLETED,
            },
          },
        ];

        const context = createMockContext();
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result).toHaveLength(1);
        expect(result[0].actived).toBe(false);
      });
    });

    it('should return false for content condition with missing contentId', async () => {
      const conditions: RulesCondition[] = [
        {
          id: 'rule-1',
          type: RulesType.CONTENT,
          operators: 'and',
          data: {
            logic: ContentConditionLogic.ACTIVED,
          },
        },
      ];

      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result).toHaveLength(1);
      expect(result[0].actived).toBe(false);
      expect(mockPrismaService.bizSession.count).not.toHaveBeenCalled();
    });

    it('should return false for content condition with missing logic', async () => {
      const conditions: RulesCondition[] = [
        {
          id: 'rule-1',
          type: RulesType.CONTENT,
          operators: 'and',
          data: {
            contentId: 'content-1',
          },
        },
      ];

      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result).toHaveLength(1);
      expect(result[0].actived).toBe(false);
      expect(mockPrismaService.bizSession.count).not.toHaveBeenCalled();
    });

    it('should return false for unknown content condition logic', async () => {
      const conditions: RulesCondition[] = [
        {
          id: 'rule-1',
          type: RulesType.CONTENT,
          operators: 'and',
          data: {
            contentId: 'content-1',
            logic: 'unknown-logic',
          },
        },
      ];

      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result).toHaveLength(1);
      expect(result[0].actived).toBe(false);
    });
  });

  // ==========================================================================
  // Event Condition Evaluation
  // ==========================================================================

  describe('Event Condition Evaluation', () => {
    const makeEventCondition = (overrides: Record<string, any> = {}): RulesCondition => ({
      id: 'event-rule-1',
      type: RulesType.EVENT,
      operators: 'and',
      data: {
        eventId: 'event-1',
        countLogic: EventCountLogic.AT_LEAST,
        count: 1,
        timeLogic: EventTimeLogic.AT_ANY_POINT_IN_TIME,
        timeUnit: EventTimeUnit.DAYS,
        scope: EventScope.BY_CURRENT_USER_IN_ANY_COMPANY,
        ...overrides,
      },
    });

    // --------------------------------------------------------------------
    // Basic & edge cases
    // --------------------------------------------------------------------

    it('should return false when eventId is missing', async () => {
      const conditions: RulesCondition[] = [makeEventCondition({ eventId: undefined })];
      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result[0].actived).toBe(false);
      expect(mockPrismaService.bizEvent.count).not.toHaveBeenCalled();
    });

    it('should return false for unknown condition type', async () => {
      const conditions: RulesCondition[] = [
        { id: 'rule-x', type: 'unknown-type' as any, operators: 'and', data: {} },
      ];
      const context = createMockContext();
      const result = await service.evaluateRulesConditions(conditions, context);

      expect(result[0].actived).toBe(false);
    });

    // --------------------------------------------------------------------
    // Count logic
    // --------------------------------------------------------------------

    describe('Count logic', () => {
      it('atLeast — true when eventCount >= count', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(3);
        const conditions = [makeEventCondition({ countLogic: EventCountLogic.AT_LEAST, count: 2 })];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(true);
      });

      it('atLeast — false when eventCount < count', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [makeEventCondition({ countLogic: EventCountLogic.AT_LEAST, count: 2 })];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(false);
      });

      it('atMost — true when eventCount <= count', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(2);
        const conditions = [makeEventCondition({ countLogic: EventCountLogic.AT_MOST, count: 3 })];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(true);
      });

      it('atMost — false when eventCount > count', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(4);
        const conditions = [makeEventCondition({ countLogic: EventCountLogic.AT_MOST, count: 3 })];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(false);
      });

      it('exactly — true when eventCount === count', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(5);
        const conditions = [makeEventCondition({ countLogic: EventCountLogic.EXACTLY, count: 5 })];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(true);
      });

      it('exactly — false when eventCount !== count', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(4);
        const conditions = [makeEventCondition({ countLogic: EventCountLogic.EXACTLY, count: 5 })];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(false);
      });

      it('between — true when eventCount is within range', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(5);
        const conditions = [
          makeEventCondition({ countLogic: EventCountLogic.BETWEEN, count: 3, count2: 7 }),
        ];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(true);
      });

      it('between — false when eventCount is outside range', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(10);
        const conditions = [
          makeEventCondition({ countLogic: EventCountLogic.BETWEEN, count: 3, count2: 7 }),
        ];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(false);
      });

      it('between — handles reversed count/count2 order', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(5);
        const conditions = [
          makeEventCondition({ countLogic: EventCountLogic.BETWEEN, count: 7, count2: 3 }),
        ];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(true);
      });
    });

    // --------------------------------------------------------------------
    // Time logic
    // --------------------------------------------------------------------

    describe('Time logic', () => {
      it('atAnyPointInTime — no createdAt filter applied', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [makeEventCondition({ timeLogic: EventTimeLogic.AT_ANY_POINT_IN_TIME })];
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.createdAt).toBeUndefined();
      });

      it('inTheLast — applies gte createdAt filter', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            timeLogic: EventTimeLogic.IN_THE_LAST,
            windowValue: 7,
            timeUnit: EventTimeUnit.DAYS,
          }),
        ];
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.createdAt).toBeDefined();
        expect(passedWhere.createdAt.gte).toBeInstanceOf(Date);
        expect(passedWhere.createdAt.lte).toBeUndefined();
      });

      it('moreThan — applies lte createdAt filter', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            timeLogic: EventTimeLogic.MORE_THAN,
            windowValue: 30,
            timeUnit: EventTimeUnit.DAYS,
          }),
        ];
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.createdAt).toBeDefined();
        expect(passedWhere.createdAt.lte).toBeInstanceOf(Date);
        expect(passedWhere.createdAt.gte).toBeUndefined();
      });

      it('between — applies gte and lte createdAt filter', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            timeLogic: EventTimeLogic.BETWEEN,
            windowValue: 7,
            windowValue2: 30,
            timeUnit: EventTimeUnit.DAYS,
          }),
        ];
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.createdAt).toBeDefined();
        expect(passedWhere.createdAt.gte).toBeInstanceOf(Date);
        expect(passedWhere.createdAt.lte).toBeInstanceOf(Date);
        expect(passedWhere.createdAt.gte.getTime()).toBeLessThan(
          passedWhere.createdAt.lte.getTime(),
        );
      });

      it('inTheLast — no createdAt filter if windowValue is missing', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            timeLogic: EventTimeLogic.IN_THE_LAST,
            windowValue: undefined,
          }),
        ];
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.createdAt).toBeUndefined();
      });

      it('between — no createdAt filter if windowValue2 is missing', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            timeLogic: EventTimeLogic.BETWEEN,
            windowValue: 7,
            windowValue2: undefined,
          }),
        ];
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.createdAt).toBeUndefined();
      });

      it('time unit conversion — seconds', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            timeLogic: EventTimeLogic.IN_THE_LAST,
            windowValue: 60,
            timeUnit: EventTimeUnit.SECONDS,
          }),
        ];
        const before = Date.now();
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        const gteTime = passedWhere.createdAt.gte.getTime();
        // 60 seconds = 60000 ms
        expect(before - gteTime).toBeGreaterThanOrEqual(59000);
        expect(before - gteTime).toBeLessThanOrEqual(62000);
      });

      it('time unit conversion — minutes', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            timeLogic: EventTimeLogic.IN_THE_LAST,
            windowValue: 5,
            timeUnit: EventTimeUnit.MINUTES,
          }),
        ];
        const before = Date.now();
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        const gteTime = passedWhere.createdAt.gte.getTime();
        // 5 minutes = 300000 ms
        expect(before - gteTime).toBeGreaterThanOrEqual(299000);
        expect(before - gteTime).toBeLessThanOrEqual(302000);
      });

      it('time unit conversion — hours', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            timeLogic: EventTimeLogic.IN_THE_LAST,
            windowValue: 2,
            timeUnit: EventTimeUnit.HOURS,
          }),
        ];
        const before = Date.now();
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        const gteTime = passedWhere.createdAt.gte.getTime();
        // 2 hours = 7200000 ms
        expect(before - gteTime).toBeGreaterThanOrEqual(7199000);
        expect(before - gteTime).toBeLessThanOrEqual(7202000);
      });
    });

    // --------------------------------------------------------------------
    // Scope logic
    // --------------------------------------------------------------------

    describe('Scope logic', () => {
      it('byCurrentUserInAnyCompany — filters by bizUserId', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({ scope: EventScope.BY_CURRENT_USER_IN_ANY_COMPANY }),
        ];
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.bizUserId).toBe('biz-user-1');
      });

      it('byCurrentUserInCurrentCompany — filters by bizUserId and company', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({ scope: EventScope.BY_CURRENT_USER_IN_CURRENT_COMPANY }),
        ];
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.bizUserId).toBe('biz-user-1');
        expect(passedWhere.bizCompany).toEqual({
          externalId: 'company-1',
          environmentId: 'env-1',
        });
      });

      it('byCurrentUserInCurrentCompany — returns false without company context', async () => {
        const context = createMockContext();
        (context as any).externalCompanyId = undefined;
        const conditions = [
          makeEventCondition({ scope: EventScope.BY_CURRENT_USER_IN_CURRENT_COMPANY }),
        ];
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result[0].actived).toBe(false);
        expect(mockPrismaService.bizEvent.count).not.toHaveBeenCalled();
      });

      it('byAnyUserInCurrentCompany — filters by company only, not bizUserId', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({ scope: EventScope.BY_ANY_USER_IN_CURRENT_COMPANY }),
        ];
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.bizUserId).toBeUndefined();
        expect(passedWhere.bizCompany).toEqual({
          externalId: 'company-1',
          environmentId: 'env-1',
        });
      });

      it('byAnyUserInCurrentCompany — returns false without company context', async () => {
        const context = createMockContext();
        (context as any).externalCompanyId = undefined;
        const conditions = [
          makeEventCondition({ scope: EventScope.BY_ANY_USER_IN_CURRENT_COMPANY }),
        ];
        const result = await service.evaluateRulesConditions(conditions, context);

        expect(result[0].actived).toBe(false);
        expect(mockPrismaService.bizEvent.count).not.toHaveBeenCalled();
      });
    });

    // --------------------------------------------------------------------
    // Where conditions (event attribute filters)
    // --------------------------------------------------------------------

    describe('Where conditions (event attribute filters)', () => {
      it('should pass where condition filters to prisma query', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            whereConditions: [
              {
                id: 'where-1',
                type: 'event-attr',
                operators: 'and',
                data: {
                  attrId: 'attr-event-action',
                  logic: 'is',
                  value: 'click',
                },
              },
            ],
          }),
        ];
        await service.evaluateRulesConditions(conditions, createMockContext());

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        // createConditionsFilter should produce AND/OR filter structure
        expect(passedWhere.eventId).toBe('event-1');
        expect(mockPrismaService.bizEvent.count).toHaveBeenCalledTimes(1);
      });

      it('should handle empty where conditions', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [makeEventCondition({ whereConditions: [] })];
        await service.evaluateRulesConditions(conditions, createMockContext());

        expect(mockPrismaService.bizEvent.count).toHaveBeenCalledTimes(1);
      });

      it('should handle where conditions with unknown attribute', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            whereConditions: [
              {
                id: 'where-1',
                type: 'event-attr',
                operators: 'and',
                data: {
                  attrId: 'attr-non-existent',
                  logic: 'is',
                  value: 'click',
                },
              },
            ],
          }),
        ];
        await service.evaluateRulesConditions(conditions, createMockContext());

        // Should still call count, just the filter may be empty
        expect(mockPrismaService.bizEvent.count).toHaveBeenCalledTimes(1);
      });
    });

    // --------------------------------------------------------------------
    // Integration: combines count + time + scope
    // --------------------------------------------------------------------

    describe('Integration scenarios', () => {
      it('at least 3 times in the last 7 days by current user', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(5);
        const conditions = [
          makeEventCondition({
            countLogic: EventCountLogic.AT_LEAST,
            count: 3,
            timeLogic: EventTimeLogic.IN_THE_LAST,
            windowValue: 7,
            timeUnit: EventTimeUnit.DAYS,
            scope: EventScope.BY_CURRENT_USER_IN_ANY_COMPANY,
          }),
        ];

        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(true);

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.eventId).toBe('event-1');
        expect(passedWhere.bizUserId).toBe('biz-user-1');
        expect(passedWhere.createdAt).toBeDefined();
        expect(passedWhere.createdAt.gte).toBeInstanceOf(Date);
      });

      it('exactly 0 times — true when no events', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(0);
        const conditions = [
          makeEventCondition({
            countLogic: EventCountLogic.EXACTLY,
            count: 0,
          }),
        ];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(true);
      });

      it('at most 0 times — false when events exist', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(1);
        const conditions = [
          makeEventCondition({
            countLogic: EventCountLogic.AT_MOST,
            count: 0,
          }),
        ];
        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(false);
      });

      it('more than 30 days ago, between 5 and 10 times', async () => {
        mockPrismaService.bizEvent.count.mockResolvedValue(7);
        const conditions = [
          makeEventCondition({
            countLogic: EventCountLogic.BETWEEN,
            count: 5,
            count2: 10,
            timeLogic: EventTimeLogic.MORE_THAN,
            windowValue: 30,
            timeUnit: EventTimeUnit.DAYS,
          }),
        ];

        const result = await service.evaluateRulesConditions(conditions, createMockContext());
        expect(result[0].actived).toBe(true);

        const passedWhere = mockPrismaService.bizEvent.count.mock.calls[0][0].where;
        expect(passedWhere.createdAt.lte).toBeInstanceOf(Date);
      });
    });
  });

  // ==========================================================================
  // Segment conditions
  // ==========================================================================

  /**
   * Segment conditions were the one DB-backed family with NO unit coverage: the
   * four segment tables were listed in the Prisma mock but never given a return
   * value, and `RulesType.SEGMENT` did not appear in this file. The real-DB e2e
   * suite exercises the behaviour end to end, but it cannot see the WHERE
   * clauses — and those carry the load here. A membership lookup keyed on the
   * wrong id, or a CONDITION segment that forgets to bind the session's company,
   * returns a plausible boolean and silently targets the wrong people.
   *
   * So every case asserts twice: the verdict, and the query that produced it.
   */
  describe('Segment Condition Evaluation', () => {
    const SEG_ID = 'seg-1';
    /** The same attribute definitions the service will be handed at runtime. */
    const attrs = createMockContext().attributes;

    const segCondition = (logic?: 'is' | 'not'): RulesCondition[] => [
      {
        id: 'seg-cond-1',
        type: RulesType.SEGMENT,
        operators: 'and',
        data: { segmentId: SEG_ID, ...(logic ? { logic } : {}) },
      },
    ];

    /** The stored Segment row the service fetches before doing anything else. */
    const segmentRow = (bizType: SegmentBizType, dataType: SegmentDataType, data: any = []) => ({
      id: SEG_ID,
      bizType,
      dataType,
      data,
    });

    /** A membership row shaped like the `include: { bizCompany: true }` result. */
    const membershipRow = {
      id: 'rel-1',
      bizUserId: 'biz-user-1',
      bizCompanyId: 'biz-company-1',
      bizCompany: { id: 'biz-company-1', externalId: 'company-1', environmentId: 'env-1' },
    };

    /** A user-scoped leaf, and a COMPANY-scoped one (see the fixture attributes). */
    const userEmailIs = (value: string) => ({
      type: 'user-attr',
      operators: 'and',
      data: { attrId: 'attr-email', logic: 'is', value },
    });
    const companyNameIs = (value: string) => ({
      type: 'user-attr',
      operators: 'and',
      data: { attrId: 'attr-companyName', logic: 'is', value },
    });

    const contextWithoutCompany = (): ConditionEvaluationContext => {
      const ctx = createMockContext() as any;
      ctx.externalCompanyId = undefined;
      return ctx as ConditionEvaluationContext;
    };

    const evaluate = async (
      logic?: 'is' | 'not',
      context: ConditionEvaluationContext = createMockContext(),
    ) => (await service.evaluateRulesConditions(segCondition(logic), context))[0].actived;

    describe('lookup and routing', () => {
      it('a segment id that resolves to nothing is FALSE, and is asked for by id alone', async () => {
        mockPrismaService.segment.findFirst.mockResolvedValue(null);

        expect(await evaluate()).toBe(false);
        expect(mockPrismaService.segment.findFirst).toHaveBeenCalledWith({
          where: { id: SEG_ID },
        });
        // Nothing downstream should have been attempted.
        expect(mockPrismaService.bizUserOnSegment.findFirst).not.toHaveBeenCalled();
        expect(mockPrismaService.bizUser.findFirst).not.toHaveBeenCalled();
      });

      it('a COMPANY segment on a session with no company is FALSE without touching the DB', async () => {
        // The session is the only place a company comes from; with none, a
        // company segment cannot be decided, and asking would be meaningless.
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(SegmentBizType.COMPANY, SegmentDataType.ALL),
        );

        expect(await evaluate('is', contextWithoutCompany())).toBe(false);
        expect(mockPrismaService.bizUserOnCompany.findFirst).not.toHaveBeenCalled();
        expect(mockPrismaService.bizCompanyOnSegment.findFirst).not.toHaveBeenCalled();
      });

      it('an unrecognised dataType is FALSE rather than a guess', async () => {
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(SegmentBizType.USER, 99 as SegmentDataType),
        );
        expect(await evaluate()).toBe(false);
      });

      it('`logic` defaults to `is` when the condition omits it', async () => {
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(SegmentBizType.USER, SegmentDataType.ALL),
        );
        expect(await evaluate(undefined)).toBe(true);
      });
    });

    describe('USER segment', () => {
      it('ALL matches everyone — `is` true, `not` false, and no membership query at all', async () => {
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(SegmentBizType.USER, SegmentDataType.ALL),
        );

        expect(await evaluate('is')).toBe(true);
        expect(await evaluate('not')).toBe(false);
        // The short-circuit is the point: an "everyone" segment must not cost a query.
        expect(mockPrismaService.bizUserOnSegment.findFirst).not.toHaveBeenCalled();
        expect(mockPrismaService.bizUser.findFirst).not.toHaveBeenCalled();
      });

      it('MANUAL reads the membership row keyed on (segment, user)', async () => {
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(SegmentBizType.USER, SegmentDataType.MANUAL),
        );
        mockPrismaService.bizUserOnSegment.findFirst.mockResolvedValue({ id: 'row-1' });

        expect(await evaluate('is')).toBe(true);
        expect(mockPrismaService.bizUserOnSegment.findFirst).toHaveBeenCalledWith({
          where: { segmentId: SEG_ID, bizUserId: 'biz-user-1' },
        });
      });

      it('MANUAL with no membership row is FALSE, and `not` inverts both outcomes', async () => {
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(SegmentBizType.USER, SegmentDataType.MANUAL),
        );

        mockPrismaService.bizUserOnSegment.findFirst.mockResolvedValue(null);
        expect(await evaluate('is')).toBe(false);
        expect(await evaluate('not')).toBe(true);

        mockPrismaService.bizUserOnSegment.findFirst.mockResolvedValue({ id: 'row-1' });
        expect(await evaluate('not')).toBe(false);
      });

      it('CONDITION re-asks for THIS user, narrowed by the compiled segment filter', async () => {
        // The envelope is what this test owns — filter semantics belong to
        // common/attribute/filter.spec.ts. What must hold here: the service
        // anchors on the session's own user (environment + externalId) and
        // ANDs the compiled filter onto it, rather than querying the segment
        // population and checking membership afterwards.
        const definition = [userEmailIs('user@example.com')];
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(SegmentBizType.USER, SegmentDataType.CONDITION, definition),
        );
        mockPrismaService.bizUser.findFirst.mockResolvedValue({ id: 'biz-user-1' });

        expect(await evaluate('is')).toBe(true);

        const expectedFilter = createBizUserConditionsFilter(definition, attrs, {
          type: 'current',
          bizCompanyWhere: { externalId: 'company-1', environmentId: 'env-1' },
        });
        expect(mockPrismaService.bizUser.findFirst).toHaveBeenCalledWith({
          where: {
            environmentId: 'env-1',
            externalId: 'user-1',
            AND: [expectedFilter],
          },
        });
      });

      it('CONDITION binds company leaves to the SESSION company — and to nobody when there is none', async () => {
        // A company-scoped leaf inside a USER segment is existential over the
        // session's company. Drop the company and the same definition must
        // stop matching, not fall back to "any company" (which would leak the
        // segment to every user whose *some* company qualifies).
        const definition = [companyNameIs('Acme')];
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(SegmentBizType.USER, SegmentDataType.CONDITION, definition),
        );
        mockPrismaService.bizUser.findFirst.mockResolvedValue({ id: 'biz-user-1' });

        await evaluate('is');
        const boundWhere = mockPrismaService.bizUser.findFirst.mock.calls[0][0].where;

        mockPrismaService.bizUser.findFirst.mockClear();
        await evaluate('is', contextWithoutCompany());
        const unboundWhere = mockPrismaService.bizUser.findFirst.mock.calls[0][0].where;

        expect(boundWhere).toEqual({
          environmentId: 'env-1',
          externalId: 'user-1',
          AND: [
            createBizUserConditionsFilter(definition, attrs, {
              type: 'current',
              bizCompanyWhere: { externalId: 'company-1', environmentId: 'env-1' },
            }),
          ],
        });
        expect(unboundWhere).toEqual({
          environmentId: 'env-1',
          externalId: 'user-1',
          AND: [createBizUserConditionsFilter(definition, attrs, { type: 'none' })],
        });
        // The two must not collapse into the same query.
        expect(unboundWhere).not.toEqual(boundWhere);
        // With no company to bind, a company-only definition matches nobody.
        expect(unboundWhere.AND[0]).toEqual({ id: { in: [] } });
      });
    });

    describe('COMPANY segment', () => {
      const withMembership = (dataType: SegmentDataType, data: any = []) => {
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(SegmentBizType.COMPANY, dataType, data),
        );
        mockPrismaService.bizUserOnCompany.findFirst.mockResolvedValue(membershipRow);
      };

      it('resolves the session company through the membership row, company included', async () => {
        withMembership(SegmentDataType.ALL);

        expect(await evaluate('is')).toBe(true);
        expect(mockPrismaService.bizUserOnCompany.findFirst).toHaveBeenCalledWith({
          where: {
            bizUserId: 'biz-user-1',
            bizCompany: { externalId: 'company-1', environmentId: 'env-1' },
          },
          include: { bizCompany: true },
        });
      });

      it('a session whose user is not IN the company is FALSE', async () => {
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(SegmentBizType.COMPANY, SegmentDataType.MANUAL),
        );
        mockPrismaService.bizUserOnCompany.findFirst.mockResolvedValue(null);

        expect(await evaluate('is')).toBe(false);
        expect(mockPrismaService.bizCompanyOnSegment.findFirst).not.toHaveBeenCalled();
      });

      it('MANUAL reads the membership row keyed on (segment, COMPANY) — not the user', async () => {
        withMembership(SegmentDataType.MANUAL);
        mockPrismaService.bizCompanyOnSegment.findFirst.mockResolvedValue({ id: 'row-1' });

        expect(await evaluate('is')).toBe(true);
        expect(mockPrismaService.bizCompanyOnSegment.findFirst).toHaveBeenCalledWith({
          where: { segmentId: SEG_ID, bizCompanyId: 'biz-company-1' },
        });
        expect(mockPrismaService.bizUserOnSegment.findFirst).not.toHaveBeenCalled();
      });

      it('MANUAL with no row is FALSE, and `not` inverts', async () => {
        withMembership(SegmentDataType.MANUAL);

        mockPrismaService.bizCompanyOnSegment.findFirst.mockResolvedValue(null);
        expect(await evaluate('is')).toBe(false);
        expect(await evaluate('not')).toBe(true);
      });

      it('CONDITION re-asks for THIS company, narrowed by the compiled filter', async () => {
        const definition = [companyNameIs('Acme')];
        withMembership(SegmentDataType.CONDITION, definition);
        mockPrismaService.bizCompany.findFirst.mockResolvedValue({ id: 'biz-company-1' });

        expect(await evaluate('is')).toBe(true);
        expect(mockPrismaService.bizCompany.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'biz-company-1',
            environmentId: 'env-1',
            AND: [createBizCompanyConditionsFilter(definition, attrs)],
          },
        });
      });

      it('CONDITION that matches no company is FALSE, and `not` inverts', async () => {
        withMembership(SegmentDataType.CONDITION, [companyNameIs('Acme')]);
        mockPrismaService.bizCompany.findFirst.mockResolvedValue(null);

        expect(await evaluate('is')).toBe(false);
        expect(await evaluate('not')).toBe(true);
      });
    });

    /**
     * Which table answers which cell, stated once. A new SegmentDataType (or a
     * route that quietly starts querying something else) shows up here as a
     * changed table name rather than as a still-green boolean somewhere.
     */
    describe('the bizType × dataType routing table', () => {
      const CELLS: Array<{
        bizType: SegmentBizType;
        dataType: SegmentDataType;
        label: string;
        table: string | null;
      }> = [
        {
          bizType: SegmentBizType.USER,
          dataType: SegmentDataType.ALL,
          label: 'user/all',
          table: null,
        },
        {
          bizType: SegmentBizType.USER,
          dataType: SegmentDataType.MANUAL,
          label: 'user/manual',
          table: 'bizUserOnSegment',
        },
        {
          bizType: SegmentBizType.USER,
          dataType: SegmentDataType.CONDITION,
          label: 'user/condition',
          table: 'bizUser',
        },
        {
          bizType: SegmentBizType.COMPANY,
          dataType: SegmentDataType.ALL,
          label: 'company/all',
          table: null,
        },
        {
          bizType: SegmentBizType.COMPANY,
          dataType: SegmentDataType.MANUAL,
          label: 'company/manual',
          table: 'bizCompanyOnSegment',
        },
        {
          bizType: SegmentBizType.COMPANY,
          dataType: SegmentDataType.CONDITION,
          label: 'company/condition',
          table: 'bizCompany',
        },
      ];

      const MEMBERSHIP_TABLES = [
        'bizUserOnSegment',
        'bizUser',
        'bizCompanyOnSegment',
        'bizCompany',
      ];

      it.each(CELLS)('$label resolves through $table', async (cell) => {
        mockPrismaService.segment.findFirst.mockResolvedValue(
          segmentRow(cell.bizType, cell.dataType, [companyNameIs('Acme')]),
        );
        mockPrismaService.bizUserOnCompany.findFirst.mockResolvedValue(membershipRow);
        for (const t of MEMBERSHIP_TABLES) mockPrismaService[t].findFirst.mockResolvedValue(null);

        await evaluate('is');

        const queried = MEMBERSHIP_TABLES.filter(
          (t) => mockPrismaService[t].findFirst.mock.calls.length > 0,
        );
        expect(queried).toEqual(cell.table ? [cell.table] : []);
      });

      it('every COMPANY cell first resolves the session membership; no USER cell does', async () => {
        for (const cell of CELLS) {
          mockPrismaService.bizUserOnCompany.findFirst.mockClear();
          mockPrismaService.segment.findFirst.mockResolvedValue(
            segmentRow(cell.bizType, cell.dataType, []),
          );
          mockPrismaService.bizUserOnCompany.findFirst.mockResolvedValue(membershipRow);

          await evaluate('is');

          expect({
            cell: cell.label,
            askedMembership: mockPrismaService.bizUserOnCompany.findFirst.mock.calls.length > 0,
          }).toEqual({
            cell: cell.label,
            askedMembership: cell.bizType === SegmentBizType.COMPANY,
          });
        }
      });
    });
  });
});
