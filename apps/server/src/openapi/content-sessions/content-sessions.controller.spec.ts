import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentSessionsController } from './content-sessions.controller';
import { OpenAPIContentSessionsService } from './content-sessions.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { ExpandType } from './content-sessions.dto';
import { OpenApiObjectType } from '@/common/openapi/types';
import { ContentSession } from '../models/content-session.model';

describe('OpenAPIContentSessionsController', () => {
  let controller: OpenAPIContentSessionsController;
  let service: OpenAPIContentSessionsService;

  const fixedDate = '2025-05-05T10:48:30.000Z';

  const createMockContentSession = (overrides = {}): ContentSession => ({
    id: 'test-id',
    object: OpenApiObjectType.CONTENT_SESSION,
    answers: null,
    completedAt: null,
    completed: false,
    contentId: 'test-content-id',
    createdAt: fixedDate,
    companyId: null,
    isPreview: false,
    lastActivityAt: fixedDate,
    progress: 0,
    userId: 'test-user-id',
    versionId: 'test-version-id',
    ...overrides,
  });

  const createMockEnvironment = () => ({
    id: 'test-env',
    projectId: 'test-project',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockService: jest.Mocked<OpenAPIContentSessionsService> = {
    listContentSessions: jest.fn(),
    getContentSession: jest.fn(),
    deleteContentSession: jest.fn(),
    endContentSession: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPIContentSessionsController],
      providers: [
        {
          provide: OpenAPIContentSessionsService,
          useValue: mockService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3000'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            apiKey: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    controller = module.get<OpenAPIContentSessionsController>(OpenAPIContentSessionsController);
    service = module.get<OpenAPIContentSessionsService>(OpenAPIContentSessionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listContentSessions', () => {
    const mockPaginatedResponse = {
      results: [createMockContentSession()],
      next: 'http://localhost:3000/v1/content-sessions?cursor=next-cursor',
      previous: null,
    };

    beforeEach(() => {
      mockService.listContentSessions.mockResolvedValue(mockPaginatedResponse);
    });

    it('should return paginated content sessions', async () => {
      const contentId = 'test-content-id';
      const limit = 20;
      const cursor = 'test-cursor';
      const expand = [ExpandType.CONTENT, ExpandType.USER];

      const result = await controller.listContentSessions(
        'http://localhost:3000/v1/content-sessions',
        createMockEnvironment(),
        contentId,
        limit,
        cursor,
        undefined,
        undefined,
        expand,
      );

      expect(service.listContentSessions).toHaveBeenCalledWith(
        'http://localhost:3000/v1/content-sessions',
        expect.objectContaining({
          id: 'test-env',
          projectId: 'test-project',
          name: 'Test Environment',
          token: 'test-token',
        }),
        contentId,
        limit,
        undefined,
        cursor,
        expand,
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle default limit and no expand', async () => {
      const contentId = 'test-content-id';

      const result = await controller.listContentSessions(
        'http://localhost:3000/v1/content-sessions',
        createMockEnvironment(),
        contentId,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(service.listContentSessions).toHaveBeenCalledWith(
        'http://localhost:3000/v1/content-sessions',
        expect.objectContaining({
          id: 'test-env',
          projectId: 'test-project',
          name: 'Test Environment',
          token: 'test-token',
        }),
        contentId,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('getContentSession', () => {
    beforeEach(() => {
      mockService.getContentSession.mockResolvedValue(createMockContentSession());
    });

    it('should return a content session', async () => {
      const id = 'test-id';
      const expand = [ExpandType.CONTENT, ExpandType.USER];

      const result = await controller.getContentSession(id, 'test-env', expand);

      expect(service.getContentSession).toHaveBeenCalledWith(id, 'test-env', [
        ExpandType.CONTENT,
        ExpandType.USER,
      ]);
      expect(result).toEqual(createMockContentSession());
    });

    it('should return content session with expand', async () => {
      const mockSessionWithExpand = createMockContentSession({
        id: 'session-1',
        contentId: 'content-1',
        companyId: 'company-1',
        userId: 'user-1',
        versionId: 'version-1',
        content: {
          id: 'content-1',
          object: OpenApiObjectType.CONTENT,
          name: 'Test Content',
          type: 'flow',
          editedVersionId: 'version-1',
          publishedVersionId: 'version-1',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        user: {
          id: 'user-1',
          object: OpenApiObjectType.USER,
          attributes: { name: 'Test User' },
          createdAt: new Date().toISOString(),
        },
        company: {
          id: 'company-1',
          object: OpenApiObjectType.COMPANY,
          attributes: { name: 'Test Company' },
          createdAt: new Date().toISOString(),
        },
        version: {
          id: 'version-1',
          object: OpenApiObjectType.CONTENT_VERSION,
          number: 1,
          questions: null,
        },
      });

      mockService.getContentSession.mockResolvedValue(mockSessionWithExpand);

      const result = await controller.getContentSession('session-1', 'test-env', [
        ExpandType.CONTENT,
        ExpandType.USER,
        ExpandType.COMPANY,
        ExpandType.VERSION,
      ]);

      expect(service.getContentSession).toHaveBeenCalledWith('session-1', 'test-env', [
        ExpandType.CONTENT,
        ExpandType.USER,
        ExpandType.COMPANY,
        ExpandType.VERSION,
      ]);
      expect(result).toEqual(mockSessionWithExpand);
    });
  });

  describe('deleteContentSession', () => {
    it('should delete a content session', async () => {
      const id = 'test-id';

      await controller.deleteContentSession(id, 'test-env');

      expect(service.deleteContentSession).toHaveBeenCalledWith(id, 'test-env');
    });
  });
});
