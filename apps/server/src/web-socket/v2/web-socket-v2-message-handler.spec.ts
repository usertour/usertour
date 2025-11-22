import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketV2MessageHandler } from './web-socket-v2-message-handler';
import { WebSocketV2Service } from './web-socket-v2.service';
import { DistributedLockService } from '../core/distributed-lock.service';
import { Server, Socket } from 'socket.io';
import { ClientMessageKind } from '@usertour/types';
import { SocketData } from '@/common/types';

describe('WebSocketV2MessageHandler', () => {
  let handler: WebSocketV2MessageHandler;
  let webSocketV2Service: jest.Mocked<WebSocketV2Service>;
  let distributedLockService: jest.Mocked<DistributedLockService>;

  const createMockSocket = (): Partial<Socket> =>
    ({
      id: 'socket-1',
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    }) as unknown as Socket;

  const createMockSocketData = (): SocketData => ({
    environment: {
      id: 'env-1',
      projectId: 'project-1',
      name: 'Test Environment',
      token: 'test-token',
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    externalUserId: 'user-1',
    externalCompanyId: 'company-1',
    clientContext: {
      pageUrl: 'https://example.com/test',
      viewportWidth: 1920,
      viewportHeight: 1080,
    },
    clientConditions: [],
    waitTimers: [],
  });

  const createMockServer = (): Partial<Server> =>
    ({
      in: jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([]),
      }),
    }) as unknown as Server;

  beforeEach(async () => {
    const mockWebSocketV2Service = {
      getSocketData: jest.fn(),
      upsertBizUsers: jest.fn(),
      upsertBizCompanies: jest.fn(),
      updateClientContext: jest.fn(),
      startContent: jest.fn(),
      endContent: jest.fn(),
      endAllContent: jest.fn(),
      toggleClientCondition: jest.fn(),
      fireConditionWaitTimer: jest.fn(),
      trackEvent: jest.fn(),
      goToStep: jest.fn(),
      answerQuestion: jest.fn(),
      clickChecklistTask: jest.fn(),
      hideChecklist: jest.fn(),
      showChecklist: jest.fn(),
      reportTooltipTargetMissing: jest.fn(),
      activateLauncher: jest.fn(),
      dismissLauncher: jest.fn(),
      endBatch: jest.fn(),
    };

    const mockDistributedLockService = {
      withRetryLock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketV2MessageHandler,
        {
          provide: WebSocketV2Service,
          useValue: mockWebSocketV2Service,
        },
        {
          provide: DistributedLockService,
          useValue: mockDistributedLockService,
        },
      ],
    }).compile();

    handler = module.get<WebSocketV2MessageHandler>(WebSocketV2MessageHandler);
    webSocketV2Service = module.get(WebSocketV2Service);
    distributedLockService = module.get(DistributedLockService);

    jest.clearAllMocks();

    // Setup default lock behavior - execute the callback
    distributedLockService.withRetryLock.mockImplementation(
      async (_key, callback) => await callback(),
    );
  });

  describe('handle', () => {
    let mockServer: Partial<Server>;
    let mockSocket: Partial<Socket>;
    let mockSocketData: SocketData;

    beforeEach(() => {
      mockServer = createMockServer();
      mockSocket = createMockSocket();
      mockSocketData = createMockSocketData();
      webSocketV2Service.getSocketData.mockResolvedValue(mockSocketData);
    });

    it('should handle UPSERT_USER message', async () => {
      const payload = { id: 'user-1', attributes: {} };
      webSocketV2Service.upsertBizUsers.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.UPSERT_USER,
        payload,
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.upsertBizUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
        payload,
      );
    });

    it('should handle START_CONTENT message', async () => {
      const payload = { contentType: 'FLOW', contentId: 'content-1' };
      webSocketV2Service.startContent.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.START_CONTENT,
        payload,
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.startContent).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
        payload,
      );
    });

    it('should handle END_CONTENT message', async () => {
      const payload = { sessionId: 'session-1', endReason: 'USER_DISMISSED' };
      webSocketV2Service.endContent.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.END_CONTENT,
        payload,
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.endContent).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
        payload,
      );
    });

    it('should handle END_ALL_CONTENT message', async () => {
      webSocketV2Service.endAllContent.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.END_ALL_CONTENT,
        {},
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.endAllContent).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
      );
    });

    it('should handle TOGGLE_CLIENT_CONDITION message', async () => {
      const payload = { conditionId: 'condition-1', isActive: true };
      webSocketV2Service.toggleClientCondition.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.TOGGLE_CLIENT_CONDITION,
        payload,
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.toggleClientCondition).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
        payload,
      );
    });

    it('should handle TRACK_EVENT message', async () => {
      const payload = { eventType: 'FLOW_STARTED', sessionId: 'session-1' };
      webSocketV2Service.trackEvent.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.TRACK_EVENT,
        payload,
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
        payload,
      );
    });

    it('should handle GO_TO_STEP message', async () => {
      const payload = { sessionId: 'session-1', stepId: 'step-1' };
      webSocketV2Service.goToStep.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.GO_TO_STEP,
        payload,
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.goToStep).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
        payload,
      );
    });

    it('should handle CLICK_CHECKLIST_TASK message', async () => {
      const payload = { sessionId: 'session-1', taskId: 'task-1' };
      webSocketV2Service.clickChecklistTask.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.CLICK_CHECKLIST_TASK,
        payload,
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.clickChecklistTask).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
        payload,
      );
    });

    it('should handle ACTIVATE_LAUNCHER message', async () => {
      const payload = { contentId: 'content-1' };
      webSocketV2Service.activateLauncher.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.ACTIVATE_LAUNCHER,
        payload,
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.activateLauncher).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
        payload,
      );
    });

    it('should handle DISMISS_LAUNCHER message', async () => {
      const payload = { sessionId: 'session-1' };
      webSocketV2Service.dismissLauncher.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.DISMISS_LAUNCHER,
        payload,
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.dismissLauncher).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
        payload,
      );
    });

    it('should handle BEGIN_BATCH message', async () => {
      webSocketV2Service.getSocketData.mockResolvedValue(mockSocketData);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.BEGIN_BATCH,
        {},
      );

      expect(result).toBe(true);
      // BEGIN_BATCH is a special handler that always returns true
      // Note: getSocketData is still called as part of handleMessage flow, but the handler itself doesn't use it
      expect(webSocketV2Service.getSocketData).toHaveBeenCalled();
    });

    it('should handle END_BATCH message', async () => {
      webSocketV2Service.endBatch.mockResolvedValue(true);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.END_BATCH,
        {},
      );

      expect(result).toBe(true);
      expect(webSocketV2Service.endBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: mockSocket,
          socketData: mockSocketData,
        }),
      );
    });

    it('should return false when handler is not found', async () => {
      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        'UNKNOWN_KIND' as ClientMessageKind,
        {},
      );

      expect(result).toBe(false);
      expect(webSocketV2Service.getSocketData).not.toHaveBeenCalled();
    });

    it('should return false when socket data is not found', async () => {
      webSocketV2Service.getSocketData.mockResolvedValue(null);

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.START_CONTENT,
        {},
      );

      expect(result).toBe(false);
      expect(webSocketV2Service.startContent).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      webSocketV2Service.getSocketData.mockRejectedValue(new Error('Test error'));

      const result = await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.START_CONTENT,
        {},
      );

      expect(result).toBe(false);
    });

    it('should use distributed lock for message handling', async () => {
      const payload = { contentType: 'FLOW' };
      webSocketV2Service.startContent.mockResolvedValue(true);

      await handler.handle(
        mockServer as Server,
        mockSocket as Socket,
        ClientMessageKind.START_CONTENT,
        payload,
      );

      expect(distributedLockService.withRetryLock).toHaveBeenCalledWith(
        expect.stringContaining('socket-1'),
        expect.any(Function),
        3,
        100,
        5000,
      );
    });
  });
});
