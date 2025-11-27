import { Test, TestingModule } from '@nestjs/testing';
import { ContentOrchestratorService } from './content-orchestrator.service';
import { ContentDataService } from './content-data.service';
import { SessionBuilderService } from './session-builder.service';
import { EventTrackingService } from './event-tracking.service';
import { SocketOperationService } from './socket-operation.service';
import { SocketDataService } from './socket-data.service';
import { DistributedLockService } from './distributed-lock.service';
import {
  ContentDataType,
  contentStartReason,
  contentEndReason,
  CustomContentSession,
  ClientContext,
} from '@usertour/types';
import { Socket } from 'socket.io';
import {
  SocketData,
  CustomContentVersion,
  ContentStartContext,
  ContentCancelContext,
  Environment,
  BizSessionWithEvents,
} from '@/common/types';
import * as contentUtils from '@/utils/content-utils';

describe('ContentOrchestratorService', () => {
  let service: ContentOrchestratorService;
  let contentDataService: jest.Mocked<ContentDataService>;
  let sessionBuilderService: jest.Mocked<SessionBuilderService>;
  let eventTrackingService: jest.Mocked<EventTrackingService>;
  let socketOperationService: jest.Mocked<SocketOperationService>;
  let socketDataService: jest.Mocked<SocketDataService>;

  // Mock data factories
  const createMockEnvironment = (): Environment => ({
    id: 'env-1',
    projectId: 'project-1',
    name: 'Test Environment',
    token: 'test-token',
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createMockClientContext = (): ClientContext => ({
    pageUrl: 'https://example.com/test',
    viewportWidth: 1920,
    viewportHeight: 1080,
  });

  const createMockSocketData = (overrides?: Partial<SocketData>): SocketData => ({
    environment: createMockEnvironment(),
    externalUserId: 'user-1',
    externalCompanyId: 'company-1',
    clientContext: createMockClientContext(),
    clientConditions: [],
    waitTimers: [],
    ...overrides,
  });

  const createMockSocket = (): Partial<Socket> =>
    ({
      id: 'socket-1',
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    }) as unknown as Socket;

  const createMockCustomContentVersion = (
    contentType: ContentDataType,
    overrides?: Partial<CustomContentVersion>,
  ): CustomContentVersion => ({
    id: 'version-1',
    contentId: 'content-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
    deleted: false,
    sequence: 1,
    themeId: 'theme-1',
    data: {},
    config: {
      enabledAutoStartRules: false,
      enabledHideRules: false,
      autoStartRules: [],
      hideRules: [],
      autoStartRulesSetting: {
        startIfNotComplete: false,
        priority: 'medium' as any,
        wait: 0,
      },
      hideRulesSetting: {},
    },
    content: {
      id: 'content-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
      name: 'Test Content',
      buildUrl: '',
      type: contentType,
      published: true,
      deleted: false,
      environmentId: 'env-1',
      projectId: 'project-1',
      config: {},
      publishedVersionId: 'version-1',
      editedVersionId: 'version-1',
    },
    steps: [],
    session: {
      latestSession: undefined,
      totalSessions: 0,
      completedSessions: 0,
    },
    ...overrides,
  });

  const createMockContentSession = (
    contentType: ContentDataType,
    overrides?: Partial<CustomContentSession>,
  ): CustomContentSession => ({
    id: 'session-1',
    type: contentType,
    content: {
      id: 'content-1',
      name: 'Test Content',
      type: contentType,
      project: {
        id: 'project-1',
        removeBranding: false,
      },
    },
    draftMode: false,
    attributes: [],
    version: {
      id: 'version-1',
      theme: null,
    },
    ...overrides,
  });

  beforeEach(async () => {
    const mockContentDataService = {
      findCustomContentVersions: jest.fn(),
      findPublishedVersionId: jest.fn(),
    };

    const mockSessionBuilderService = {
      getBizSession: jest.fn(),
      createBizSession: jest.fn(),
      createContentSession: jest.fn(),
      syncSessionVersionIfNeeded: jest.fn(),
      updateCurrentStepId: jest.fn(),
    };

    const mockEventTrackingService = {
      trackEventByType: jest.fn().mockResolvedValue(true),
      trackEventsByType: jest.fn().mockResolvedValue(true),
      updateChecklistSession: jest.fn().mockResolvedValue(true),
    };

    const mockSocketOperationService = {
      activateFlowSession: jest.fn(),
      activateChecklistSession: jest.fn(),
      addLaunchers: jest.fn(),
      cleanupLauncherSession: jest.fn(),
      cleanupSocketSession: jest.fn(),
      trackClientConditions: jest.fn(),
      startConditionWaitTimers: jest.fn(),
      emitChecklistTasksCompleted: jest.fn(),
    };

    const mockSocketDataService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockDistributedLockService = {
      withRetryLock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentOrchestratorService,
        {
          provide: ContentDataService,
          useValue: mockContentDataService,
        },
        {
          provide: SessionBuilderService,
          useValue: mockSessionBuilderService,
        },
        {
          provide: EventTrackingService,
          useValue: mockEventTrackingService,
        },
        {
          provide: SocketOperationService,
          useValue: mockSocketOperationService,
        },
        {
          provide: SocketDataService,
          useValue: mockSocketDataService,
        },
        {
          provide: DistributedLockService,
          useValue: mockDistributedLockService,
        },
      ],
    }).compile();

    service = module.get<ContentOrchestratorService>(ContentOrchestratorService);
    contentDataService = module.get(ContentDataService);
    sessionBuilderService = module.get(SessionBuilderService);
    eventTrackingService = module.get(EventTrackingService);
    socketOperationService = module.get(SocketOperationService);
    socketDataService = module.get(SocketDataService);

    jest.clearAllMocks();
  });

  describe('startContent - FLOW', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    describe('Strategy 1: Start by specific contentId', () => {
      it('should start content successfully when contentId is provided', async () => {
        const contentId = 'content-1';
        const versionId = 'version-1';
        const mockVersion = createMockCustomContentVersion(contentType);
        const mockSession = createMockContentSession(contentType);

        contentDataService.findPublishedVersionId.mockResolvedValue(versionId);
        contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);
        sessionBuilderService.getBizSession.mockResolvedValue(null);
        sessionBuilderService.createBizSession.mockResolvedValue({
          id: 'biz-session-1',
          versionId,
          createdAt: new Date(),
          updatedAt: new Date(),
          deleted: false,
          state: 0,
          data: {},
          progress: 0,
          projectId: 'project-1',
          environmentId: 'env-1',
          bizUserId: 'biz-user-1',
          bizCompanyId: 'biz-company-1',
          contentId: 'content-1',
          currentStepId: '',
          bizEvent: [],
        } as BizSessionWithEvents);
        sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
        eventTrackingService.trackEventsByType.mockResolvedValue(true);
        socketOperationService.activateFlowSession.mockResolvedValue(true);

        const context: ContentStartContext = {
          server: {} as any,
          socket: mockSocket as Socket,
          socketData: mockSocketData,
          contentType,
          options: {
            contentId,
            startReason: contentStartReason.START_FROM_CONDITION,
          },
        };

        const result = await service.startContent(context);

        expect(result).toBe(true);
        expect(contentDataService.findPublishedVersionId).toHaveBeenCalledWith(
          contentId,
          mockSocketData.environment.id,
        );
        expect(sessionBuilderService.createContentSession).toHaveBeenCalled();
        expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
      });

      it('should return false when content is not published', async () => {
        const contentId = 'content-1';

        contentDataService.findPublishedVersionId.mockResolvedValue(undefined);

        const context: ContentStartContext = {
          server: {} as any,
          socket: mockSocket as Socket,
          socketData: mockSocketData,
          contentType,
          options: {
            contentId,
            startReason: contentStartReason.START_FROM_CONDITION,
          },
        };

        const result = await service.startContent(context);

        expect(result).toBe(false);
        expect(sessionBuilderService.createContentSession).not.toHaveBeenCalled();
      });
    });

    describe('Strategy 2: Handle existing session', () => {
      it('should reactivate existing session', async () => {
        const existingSession = createMockContentSession(contentType);
        const mockBizSession = {
          id: 'session-1',
          versionId: 'version-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deleted: false,
          state: 0,
          data: {},
          progress: 0,
          projectId: 'project-1',
          environmentId: 'env-1',
          bizUserId: 'biz-user-1',
          bizCompanyId: 'biz-company-1',
          contentId: 'content-1',
          currentStepId: '',
          bizEvent: [],
        } as BizSessionWithEvents;
        // Create version with matching version ID
        const mockVersion = createMockCustomContentVersion(contentType, {
          id: 'version-1', // Must match existingSession.version.id
          session: {
            latestSession: mockBizSession,
            totalSessions: 1,
            completedSessions: 0,
          },
        });

        mockSocketData.flowSession = existingSession;
        // Ensure the version ID matches the session's versionId
        mockVersion.id = existingSession.version.id;
        // Mock findCustomContentVersions to return the version for evaluation
        contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);
        // Mock getBizSession to return the existing biz session when queried by sessionId
        sessionBuilderService.getBizSession.mockImplementation((sessionId: string) => {
          if (sessionId === existingSession.id) {
            return Promise.resolve(mockBizSession as any);
          }
          return Promise.resolve(null);
        });
        // Create a session with different theme to trigger activation
        // This will make hasContentSessionChanges return true
        const reactivatedSession = createMockContentSession(contentType, {
          id: existingSession.id,
          version: {
            ...existingSession.version,
            id: existingSession.version.id,
            theme: {
              id: 'theme-2', // Different theme ID to trigger changes
              name: 'Different Theme',
            } as any,
          },
        });
        sessionBuilderService.createContentSession.mockResolvedValue(reactivatedSession);
        socketOperationService.activateFlowSession.mockResolvedValue(true);

        const context: ContentStartContext = {
          server: {} as any,
          socket: mockSocket as Socket,
          socketData: mockSocketData,
          contentType,
          options: {
            startReason: contentStartReason.START_FROM_CONDITION,
          },
        };

        const result = await service.startContent(context);

        expect(result).toBe(true);
        expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
      });

      it('should return false when existing session version is not found', async () => {
        const existingSession = createMockContentSession(contentType);
        mockSocketData.flowSession = existingSession;

        contentDataService.findCustomContentVersions.mockResolvedValue([]);

        const context: ContentStartContext = {
          server: {} as any,
          socket: mockSocket as Socket,
          socketData: mockSocketData,
          contentType,
          options: {
            startReason: contentStartReason.START_FROM_CONDITION,
          },
        };

        const result = await service.startContent(context);

        expect(result).toBe(false);
      });
    });

    describe('Strategy 3: Auto start content', () => {
      it('should auto start by latest activated version', async () => {
        const mockLatestSession = {
          id: 'session-1',
          versionId: 'version-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deleted: false,
          state: 0,
          data: {},
          progress: 0,
          projectId: 'project-1',
          environmentId: 'env-1',
          bizUserId: 'biz-user-1',
          bizCompanyId: 'biz-company-1',
          contentId: 'content-1',
          currentStepId: '',
          bizEvent: [],
        } as BizSessionWithEvents;
        const mockVersion = createMockCustomContentVersion(contentType, {
          session: {
            latestSession: mockLatestSession,
            totalSessions: 1,
            completedSessions: 0,
          },
        });
        const mockSession = createMockContentSession(contentType);

        contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);
        const mockBizSession = {
          id: 'biz-session-1',
          versionId: 'version-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deleted: false,
          state: 0,
          data: {},
          progress: 0,
          projectId: 'project-1',
          environmentId: 'env-1',
          bizUserId: 'biz-user-1',
          bizCompanyId: 'biz-company-1',
          contentId: 'content-1',
          currentStepId: '',
          bizEvent: [],
          version: {
            id: 'version-1',
            contentId: 'content-1',
          } as any,
          content: {
            id: 'content-1',
            type: contentType,
          } as any,
        } as BizSessionWithEvents;
        sessionBuilderService.getBizSession.mockResolvedValue(mockBizSession as any);
        sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
        socketOperationService.activateFlowSession.mockResolvedValue(true);

        const context: ContentStartContext = {
          server: {} as any,
          socket: mockSocket as Socket,
          socketData: mockSocketData,
          contentType,
          options: {
            startReason: contentStartReason.START_FROM_CONDITION,
          },
        };

        const result = await service.startContent(context);

        expect(result).toBe(true);
        expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
      });

      it('should setup wait timers when content is not ready', async () => {
        const mockVersion = createMockCustomContentVersion(contentType, {
          config: {
            enabledAutoStartRules: true,
            enabledHideRules: false,
            autoStartRules: [
              {
                id: 'condition-1',
                type: 'page',
                data: {
                  operator: 'equals',
                  value: 'test',
                },
              },
            ],
            hideRules: [],
            autoStartRulesSetting: {
              startIfNotComplete: false,
              priority: 'medium' as any,
              wait: 1000, // Must be > 0 to generate wait timers
            },
            hideRulesSetting: {},
          },
        });

        // Mock clientConditions to make the condition activated but with wait time
        // The condition needs to be activated for filterAvailableAutoStartContentVersions to return the version
        // But wait time > 0 will generate wait timers
        mockSocketData.clientConditions = [
          {
            conditionId: 'condition-1',
            isActive: true,
          } as any,
        ];
        contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);
        socketOperationService.startConditionWaitTimers.mockResolvedValue(true);

        const context: ContentStartContext = {
          server: {} as any,
          socket: mockSocket as Socket,
          socketData: mockSocketData,
          contentType,
          options: {
            startReason: contentStartReason.START_FROM_CONDITION,
          },
        };

        const result = await service.startContent(context);

        expect(result).toBe(true);
        expect(socketOperationService.startConditionWaitTimers).toHaveBeenCalled();
      });
    });
  });

  describe('startContent - CHECKLIST', () => {
    const contentType = ContentDataType.CHECKLIST;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should start checklist successfully', async () => {
      const mockBizSession = {
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
        bizEvent: [],
      } as BizSessionWithEvents;
      const mockVersion = createMockCustomContentVersion(contentType, {
        data: {
          checklist: {
            items: [
              {
                id: 'item-1',
                title: 'Test Item',
                isVisible: true,
                isCompleted: false,
              },
            ],
          },
        },
        session: {
          latestSession: mockBizSession,
          totalSessions: 1,
          completedSessions: 0,
        },
      });
      const mockSession = createMockContentSession(contentType, {
        version: {
          id: 'version-1',
          theme: null,
          checklist: {
            items: [
              {
                id: 'item-1',
                title: 'Test Item',
                isVisible: true,
                isCompleted: false,
              },
            ],
          },
        } as any,
      });

      contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(mockBizSession as any);
      sessionBuilderService.createBizSession.mockResolvedValue(mockBizSession as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventsByType.mockResolvedValue(true);
      socketOperationService.activateChecklistSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateChecklistSession).toHaveBeenCalled();
    });
  });

  describe('cancelContent', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;
    let mockServer: any;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      mockServer = {
        in: jest.fn().mockReturnValue({
          fetchSockets: jest.fn().mockResolvedValue([]),
        }),
      };
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should cancel content successfully', async () => {
      const sessionId = 'session-1';
      const mockSession = createMockContentSession(contentType);
      mockSession.id = sessionId;
      mockSession.content.id = 'content-1';

      // Set up socketData with the current session
      mockSocketData.flowSession = mockSession;

      sessionBuilderService.getBizSession.mockResolvedValue({
        id: sessionId,
        versionId: mockSession.version.id,
        content: {
          id: 'content-1',
          type: contentType,
        },
      } as any);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      socketOperationService.cleanupSocketSession.mockResolvedValue(true);
      // Mock findCustomContentVersions to return empty array for tryAutoStartContent
      contentDataService.findCustomContentVersions.mockResolvedValue([]);

      const context: ContentCancelContext = {
        server: mockServer,
        socket: mockSocket as Socket,
        sessionId,
        endReason: contentEndReason.USER_CLOSED,
      };

      const result = await service.cancelContent(context);

      expect(result).toBe(true);
      expect(eventTrackingService.trackEventByType).toHaveBeenCalled();
      expect(socketOperationService.cleanupSocketSession).toHaveBeenCalled();
    });

    it('should return false when session is not found', async () => {
      const sessionId = 'non-existent';

      sessionBuilderService.getBizSession.mockResolvedValue(null);

      const context: ContentCancelContext = {
        server: mockServer,
        socket: mockSocket as Socket,
        sessionId,
        endReason: contentEndReason.USER_CLOSED,
      };

      const result = await service.cancelContent(context);

      expect(result).toBe(false);
      expect(eventTrackingService.trackEventByType).not.toHaveBeenCalled();
    });

    it('should return false when event tracking fails', async () => {
      const sessionId = 'session-1';
      const mockSession = {
        id: sessionId,
        content: {
          id: 'content-1',
          type: contentType,
        },
      };

      sessionBuilderService.getBizSession.mockResolvedValue(mockSession as any);
      eventTrackingService.trackEventByType.mockResolvedValue(false);

      const context: ContentCancelContext = {
        server: mockServer,
        socket: mockSocket as Socket,
        sessionId,
        endReason: contentEndReason.USER_CLOSED,
      };

      const result = await service.cancelContent(context);

      expect(result).toBe(false);
    });
  });

  describe('addLaunchers', () => {
    const contentType = ContentDataType.LAUNCHER;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should add launchers successfully', async () => {
      const mockVersion = createMockCustomContentVersion(contentType);
      const mockSession = createMockContentSession(contentType);

      contentDataService.findPublishedVersionId.mockResolvedValue('version-1');
      contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      socketOperationService.addLaunchers.mockResolvedValue(true);
      socketOperationService.trackClientConditions.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          contentId: 'content-1',
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.addLaunchers(context);

      expect(result).toBe(true);
      expect(socketOperationService.addLaunchers).toHaveBeenCalled();
    });

    it('should return false when published version is not found', async () => {
      contentDataService.findPublishedVersionId.mockResolvedValue(undefined);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          contentId: 'content-1',
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.addLaunchers(context);

      expect(result).toBe(false);
      expect(socketOperationService.addLaunchers).not.toHaveBeenCalled();
    });
  });

  describe('dismissLauncher', () => {
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;
    let mockServer: any;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      mockServer = {
        in: jest.fn().mockReturnValue({
          fetchSockets: jest.fn().mockResolvedValue([]),
        }),
      };
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should dismiss launcher successfully', async () => {
      const sessionId = 'session-1';
      const contentId = 'content-1';
      const mockSession = {
        id: sessionId,
        content: {
          id: contentId,
        },
      };

      sessionBuilderService.getBizSession.mockResolvedValue(mockSession as any);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      socketOperationService.cleanupLauncherSession.mockResolvedValue(true);

      const context: ContentCancelContext = {
        server: mockServer,
        socket: mockSocket as Socket,
        sessionId,
        endReason: contentEndReason.USER_CLOSED,
      };

      const result = await service.cancelContent(context);

      expect(result).toBe(true);
      expect(eventTrackingService.trackEventByType).toHaveBeenCalled();
      expect(socketOperationService.cleanupLauncherSession).toHaveBeenCalled();
    });
  });

  describe('handleChecklistCompletedEvents', () => {
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should handle checklist completed events', async () => {
      const mockBizSession = {
        id: 'session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
        bizEvent: [],
      } as BizSessionWithEvents;
      const mockVersion = createMockCustomContentVersion(ContentDataType.CHECKLIST, {
        session: {
          latestSession: mockBizSession,
          totalSessions: 1,
          completedSessions: 0,
        },
        data: {
          items: [],
        },
      });

      contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);
      eventTrackingService.updateChecklistSession.mockResolvedValue(undefined);

      await service.handleChecklistCompletedEvents(mockSocket as Socket);

      expect(contentDataService.findCustomContentVersions).toHaveBeenCalled();
    });
  });

  describe('trackAutoStartEvent', () => {
    it('should track auto start event for FLOW', async () => {
      const sessionId = 'session-1';
      const environment = createMockEnvironment();
      const clientContext = createMockClientContext();

      eventTrackingService.trackEventsByType.mockResolvedValue(true);

      const result = await service.trackAutoStartEvent(
        sessionId,
        ContentDataType.FLOW,
        environment,
        contentStartReason.START_FROM_CONDITION,
        null,
        clientContext,
      );

      expect(result).toBe(true);
      expect(eventTrackingService.trackEventsByType).toHaveBeenCalled();
    });

    it('should track auto start event with stepId', async () => {
      const sessionId = 'session-1';
      const stepId = 'step-1';
      const environment = createMockEnvironment();
      const clientContext = createMockClientContext();

      eventTrackingService.trackEventsByType.mockResolvedValue(true);

      const result = await service.trackAutoStartEvent(
        sessionId,
        ContentDataType.FLOW,
        environment,
        contentStartReason.START_FROM_CONDITION,
        stepId,
        clientContext,
      );

      expect(result).toBe(true);
      expect(eventTrackingService.trackEventsByType).toHaveBeenCalled();
    });
  });

  describe('trackContentEndedEvent', () => {
    it('should track content ended event for FLOW', async () => {
      const sessionId = 'session-1';
      const environment = createMockEnvironment();
      const clientContext = createMockClientContext();

      eventTrackingService.trackEventByType.mockResolvedValue(true);

      const result = await service.trackContentEndedEvent(
        sessionId,
        ContentDataType.FLOW,
        environment,
        clientContext,
        contentEndReason.USER_CLOSED,
      );

      expect(result).toBe(true);
      expect(eventTrackingService.trackEventByType).toHaveBeenCalled();
    });
  });

  describe('initializeSessionById', () => {
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocketData = createMockSocketData();
    });

    it('should initialize session by ID successfully', async () => {
      const sessionId = 'session-1';
      const mockSession = createMockContentSession(ContentDataType.FLOW);
      const mockLatestSession = {
        id: sessionId,
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
        bizEvent: [],
      } as BizSessionWithEvents;
      const mockVersion = createMockCustomContentVersion(ContentDataType.FLOW, {
        session: {
          latestSession: mockLatestSession,
          totalSessions: 1,
          completedSessions: 0,
        },
      });

      const mockBizSession = {
        id: sessionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        versionId: 'version-1',
        currentStepId: '',
        content: { type: ContentDataType.FLOW } as any,
        version: { id: 'version-1' } as any,
        bizEvent: [],
      } as BizSessionWithEvents;
      sessionBuilderService.getBizSession.mockResolvedValue(mockBizSession as any);
      contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);

      const result = await service.initializeSessionById(mockSocketData, sessionId);

      expect(result).toEqual(mockSession);
    });

    it('should return null when session is not found', async () => {
      const sessionId = 'non-existent';

      sessionBuilderService.getBizSession.mockResolvedValue(null);

      const result = await service.initializeSessionById(mockSocketData, sessionId);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Comprehensive Rule Testing
  // ============================================================================

  describe('Auto-start Rules - User Attributes', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should start content when user attribute condition matches', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-1',
                logic: 'is',
                value: 'premium',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluated version with activated rule (user attribute matches)
      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventsByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });

    it('should not start content when user attribute condition does not match', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-1',
                logic: 'is',
                value: 'premium',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluated version with non-activated rule (user attribute does not match)
      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: false,
            },
          ],
        },
      };

      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(false);
      expect(socketOperationService.activateFlowSession).not.toHaveBeenCalled();
    });
  });

  describe('Auto-start Rules - Company Attributes', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData({
        externalCompanyId: 'company-1',
      });
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should start content when company attribute condition matches', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'companyAttr',
              data: {
                attrId: 'attr-1',
                logic: 'is',
                value: 'enterprise',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluated version with activated rule (company attribute matches)
      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventsByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });

    it('should not start content when company attribute condition does not match', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'companyAttr',
              data: {
                attrId: 'attr-1',
                logic: 'is',
                value: 'enterprise',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluated version with non-activated rule
      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: false,
            },
          ],
        },
      };

      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(false);
      expect(socketOperationService.activateFlowSession).not.toHaveBeenCalled();
    });
  });

  describe('Hide Rules', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should cancel session when hide rules are activated', async () => {
      const contentId = 'content-1';
      const versionId = 'version-1';
      const mockVersion = createMockCustomContentVersion(contentType, {
        id: versionId,
        contentId,
        config: {
          enabledAutoStartRules: false,
          enabledHideRules: true,
          autoStartRules: [],
          hideRules: [
            {
              id: 'hide-rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-1',
                logic: 'is',
                value: 'vip',
              },
            },
          ],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluated version with activated hide rules
      // When starting by contentId, the version is evaluated and hide rules are checked
      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          hideRules: [
            {
              ...mockVersion.config.hideRules[0],
              actived: true, // Hide rule is activated
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType, {
        version: {
          id: versionId,
          theme: null,
        },
      });
      // Set the session in socketData so cancelContentSocketSession can find it
      const socketDataWithSession: SocketData = {
        ...mockSocketData,
        ...(contentType === ContentDataType.FLOW
          ? { flowSession: mockSession }
          : contentType === ContentDataType.CHECKLIST
            ? { checklistSession: mockSession }
            : {}),
      };
      // Mock findPublishedVersionId for contentId strategy
      contentDataService.findPublishedVersionId.mockResolvedValue(versionId);
      // Mock findCustomContentVersions to return raw version (before evaluation)
      contentDataService.findCustomContentVersions.mockImplementation(
        async (_queryContext, _contentTypes, versionIdParam) => {
          // Return raw version when versionId matches
          if (versionIdParam === versionId) {
            return [mockVersion];
          }
          return [];
        },
      );
      // Mock evaluateCustomContentVersion to return evaluated version with activated hide rules
      // This is called by findEvaluatedContentVersions which is used by hasActiveHideRules
      jest
        .spyOn(contentUtils, 'evaluateCustomContentVersion')
        .mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId,
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      socketOperationService.cleanupSocketSession.mockResolvedValue(true);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      // Mock tryAutoStartContent to return no session (to avoid recursion in cancelContentSocketSession)
      jest.spyOn(service as any, 'tryAutoStartContent').mockResolvedValue({
        success: true,
        session: null,
      });
      // Mock cancelOtherSocketSessionsInRoom to avoid side effects
      jest.spyOn(service as any, 'cancelOtherSocketSessionsInRoom').mockResolvedValue(undefined);
      // Mock getSocketData to return updated socketData after cleanup (without session)
      // This is called by cancelContentSocketSession after cleanupSocketSession
      // When currentSession exists, cancelContentSocketSession will:
      // 1. Cleanup the session (cleanupSocketSession)
      // 2. Get new socketData (getSocketData)
      // 3. Call handleContentStartResult with result.session = null
      // 4. handleContentStartResult will call handleSessionActivation which returns false
      // But cancelSessionInRoom always returns true, so handleSessionCancellation returns true
      socketDataService.get.mockResolvedValue(mockSocketData);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: socketDataWithSession,
        contentType,
        options: {
          contentId,
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      // When hide rules are activated, session should be cancelled, not activated
      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).not.toHaveBeenCalled();
      expect(socketOperationService.cleanupSocketSession).toHaveBeenCalled();

      // Restore the mock
      jest.restoreAllMocks();
    });

    it('should activate session when hide rules are not activated', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: true,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'page',
              data: {
                operator: 'equals',
                value: 'https://example.com/test',
              },
            },
          ],
          hideRules: [
            {
              id: 'hide-rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-1',
                logic: 'is',
                value: 'vip',
              },
            },
          ],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluated version with activated auto-start rules but non-activated hide rules
      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
          hideRules: [
            {
              ...mockVersion.config.hideRules[0],
              actived: false, // Hide rule not activated
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventsByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);
      // Mock findCustomContentVersions to always return the evaluated version
      // This is needed for both the initial startContent call and the hasActiveHideRules check
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      // When hide rules are not activated, session should be activated normally
      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
      expect(socketOperationService.cleanupSocketSession).not.toHaveBeenCalled();
    });
  });

  describe('Auto-start Rules - Page Conditions', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData({
        clientContext: {
          pageUrl: 'https://example.com/dashboard',
          viewportWidth: 1920,
          viewportHeight: 1080,
        },
      });
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should start content when page condition matches', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'page',
              data: {
                operator: 'equals',
                value: 'https://example.com/dashboard',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluated version with activated page rule
      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventsByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });

    it('should not start content when page condition does not match', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'page',
              data: {
                operator: 'equals',
                value: 'https://example.com/other-page',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluated version with non-activated page rule
      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: false,
            },
          ],
        },
      };

      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(false);
      expect(socketOperationService.activateFlowSession).not.toHaveBeenCalled();
    });
  });

  describe('Auto-start Rules - Multiple Conditions', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should start content when all conditions match (AND logic)', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'page',
              data: {
                operator: 'equals',
                value: 'https://example.com/test',
              },
            },
            {
              id: 'rule-2',
              type: 'userAttr',
              data: {
                attrId: 'attr-1',
                logic: 'is',
                value: 'premium',
              },
              operators: 'and',
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluated version with all conditions activated
      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
            {
              ...mockVersion.config.autoStartRules[1],
              actived: true,
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventsByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Comprehensive Attribute Type Testing - String Operations
  // ============================================================================

  describe('Auto-start Rules - String Attribute Operations', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should start content when string "contains" condition matches', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-email',
                operator: 'contains',
                value: 'example.com',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });

    it('should start content when string "startsWith" condition matches', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-email',
                operator: 'startsWith',
                value: 'user',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });

    it('should not start content when string "not" condition does not match', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-email',
                operator: 'not',
                value: 'user@example.com',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: false,
            },
          ],
        },
      };

      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(false);
      expect(socketOperationService.activateFlowSession).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Comprehensive Attribute Type Testing - Number Operations
  // ============================================================================

  describe('Auto-start Rules - Number Attribute Operations', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should start content when number "isGreaterThan" condition matches', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-age',
                operator: 'isGreaterThan',
                value: 18,
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });

    it('should start content when number "between" condition matches', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-age',
                operator: 'between',
                value: 20,
                value2: 30,
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Comprehensive Attribute Type Testing - Boolean Operations
  // ============================================================================

  describe('Auto-start Rules - Boolean Attribute Operations', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should start content when boolean "true" condition matches', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-isPremium',
                operator: 'true',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Comprehensive Attribute Type Testing - List Operations
  // ============================================================================

  describe('Auto-start Rules - List Attribute Operations', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should start content when list "includesAtLeastOne" condition matches', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-roles',
                operator: 'includesAtLeastOne',
                listValues: ['admin'],
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
        },
      };

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Complex Condition Combinations - AND/OR Logic
  // ============================================================================

  describe('Auto-start Rules - Complex Condition Combinations', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should start content when all AND conditions match', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'group',
              operators: 'and',
              data: {},
              conditions: [
                {
                  id: 'rule-1-1',
                  type: 'userAttr',
                  operators: 'and',
                  data: {
                    attrId: 'attr-email',
                    operator: 'contains',
                    value: 'example.com',
                  },
                },
                {
                  id: 'rule-1-2',
                  type: 'userAttr',
                  operators: 'and',
                  data: {
                    attrId: 'attr-age',
                    operator: 'isGreaterThan',
                    value: 18,
                  },
                },
              ],
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluated version with activated rules
      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: true,
            },
          ],
        },
      };
      jest
        .spyOn(contentUtils, 'evaluateCustomContentVersion')
        .mockResolvedValue([evaluatedVersion]);
      jest
        .spyOn(contentUtils, 'filterAvailableAutoStartContentVersions')
        .mockReturnValue([evaluatedVersion]);

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });

    it('should start content when at least one OR condition matches', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'group',
              operators: 'or',
              data: {},
              conditions: [
                {
                  id: 'rule-1-1',
                  type: 'userAttr',
                  operators: 'or',
                  data: {
                    attrId: 'attr-email',
                    operator: 'is',
                    value: 'wrong@example.com',
                  },
                },
                {
                  id: 'rule-1-2',
                  type: 'userAttr',
                  operators: 'or',
                  data: {
                    attrId: 'attr-age',
                    operator: 'isGreaterThan',
                    value: 18,
                  },
                },
              ],
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      // Mock evaluateCustomContentVersion to return evaluated version with activated rules
      jest.spyOn(contentUtils, 'evaluateCustomContentVersion').mockResolvedValue([
        {
          ...mockVersion,
          config: {
            ...mockVersion.config,
            autoStartRules: [
              {
                ...mockVersion.config.autoStartRules[0],
                actived: true,
              },
            ],
          },
        },
      ]);

      const mockSession = createMockContentSession(contentType);
      contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);
      sessionBuilderService.getBizSession.mockResolvedValue(null);
      sessionBuilderService.createBizSession.mockResolvedValue({
        id: 'biz-session-1',
        versionId: 'version-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        state: 0,
        data: {},
        progress: 0,
        projectId: 'project-1',
        environmentId: 'env-1',
        bizUserId: 'biz-user-1',
        bizCompanyId: 'biz-company-1',
        contentId: 'content-1',
        currentStepId: '',
      } as any);
      sessionBuilderService.createContentSession.mockResolvedValue(mockSession);
      eventTrackingService.trackEventByType.mockResolvedValue(true);
      socketOperationService.activateFlowSession.mockResolvedValue(true);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(true);
      expect(socketOperationService.activateFlowSession).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    const contentType = ContentDataType.FLOW;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      socketDataService.get.mockResolvedValue(mockSocketData);
    });

    it('should handle missing user attributes gracefully', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [
            {
              id: 'rule-1',
              type: 'userAttr',
              data: {
                attrId: 'attr-non-existent',
                operator: 'is',
                value: 'value',
              },
            },
          ],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      const evaluatedVersion = {
        ...mockVersion,
        config: {
          ...mockVersion.config,
          autoStartRules: [
            {
              ...mockVersion.config.autoStartRules[0],
              actived: false,
            },
          ],
        },
      };

      contentDataService.findCustomContentVersions.mockResolvedValue([evaluatedVersion]);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(false);
      expect(socketOperationService.activateFlowSession).not.toHaveBeenCalled();
    });

    it('should handle empty auto-start rules array', async () => {
      const mockVersion = createMockCustomContentVersion(contentType, {
        config: {
          enabledAutoStartRules: true,
          enabledHideRules: false,
          autoStartRules: [],
          hideRules: [],
          autoStartRulesSetting: {
            startIfNotComplete: false,
            priority: 'medium' as any,
            wait: 0,
          },
          hideRulesSetting: {},
        },
      });

      contentDataService.findCustomContentVersions.mockResolvedValue([mockVersion]);

      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(false);
      expect(socketOperationService.activateFlowSession).not.toHaveBeenCalled();
    });

    it('should return false when content type is not singleton', async () => {
      const context: ContentStartContext = {
        server: {} as any,
        socket: mockSocket as Socket,
        socketData: mockSocketData,
        contentType: ContentDataType.LAUNCHER,
        options: {
          startReason: contentStartReason.START_FROM_CONDITION,
        },
      };

      const result = await service.startContent(context);

      expect(result).toBe(false);
    });
  });
});
