import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentSessionsService } from './content-sessions.service';
import { PrismaService } from 'nestjs-prisma';
import { AnalyticsService } from '@/analytics/analytics.service';
import { ContentSessionExpandType } from './content-sessions.dto';
import { ConfigService } from '@nestjs/config';
import { ContentSessionNotFoundError } from '@/common/errors/errors';
import { ContentService } from '@/content/content.service';

describe('OpenAPIContentSessionsService', () => {
  let service: OpenAPIContentSessionsService;

  const mockSession = {
    id: '1',
    contentId: 'content1',
    bizUserId: 'user1',
    bizCompanyId: 'company1',
    versionId: 'version1',
    createdAt: new Date(),
    updatedAt: new Date(),
    state: 0,
    progress: 0,
    data: {},
  };

  const mockPrismaService = {
    bizSession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAnalyticsService = {
    deleteSession: jest.fn(),
    getContentSessionWithRelations: jest.fn(),
    listContentSessionsWithRelations: jest.fn(),
    deleteContentSessionWithRelations: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockContentService = {
    getContentById: jest.fn().mockResolvedValue({ id: 'content1' }),
    getContentVersionWithRelations: jest.fn().mockResolvedValue({
      id: 'version1',
      sequence: 1,
      steps: [],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIContentSessionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ContentService,
          useValue: mockContentService,
        },
      ],
    }).compile();

    service = module.get<OpenAPIContentSessionsService>(OpenAPIContentSessionsService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getContentSession', () => {
    it('should return a content session when found', async () => {
      const mockSessionWithRelations = {
        ...mockSession,
        content: {
          id: 'content1',
          name: 'Test Content',
          type: 'flow',
          editedVersionId: 'version1',
          publishedVersionId: null,
          environmentId: 'env1',
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        bizUser: {
          id: 'user1',
          externalId: 'user1',
          data: { name: 'Test User' },
          createdAt: new Date(),
        },
        bizCompany: {
          id: 'company1',
          externalId: 'company1',
          data: { name: 'Test Company' },
          createdAt: new Date(),
        },
        version: {
          id: 'version1',
          sequence: 1,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      };

      mockAnalyticsService.getContentSessionWithRelations.mockResolvedValue(
        mockSessionWithRelations,
      );

      const result = await service.getContentSession('1', 'env1', {
        expand: [
          ContentSessionExpandType.CONTENT,
          ContentSessionExpandType.USER,
          ContentSessionExpandType.COMPANY,
          ContentSessionExpandType.VERSION,
        ],
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.content).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.company).toBeDefined();
      expect(result.version).toBeDefined();
      expect(mockAnalyticsService.getContentSessionWithRelations).toHaveBeenCalledWith(
        '1',
        'env1',
        {
          content: true,
          bizCompany: true,
          bizUser: true,
          version: true,
        },
      );
    });

    it('should throw ContentSessionNotFoundError when session not found', async () => {
      mockAnalyticsService.getContentSessionWithRelations.mockResolvedValue(null);

      await expect(service.getContentSession('1', 'env1', {})).rejects.toThrow(
        new ContentSessionNotFoundError(),
      );
    });
  });

  describe('listContentSessions', () => {
    it('should return a list of content sessions', async () => {
      const mockSessionWithRelations = {
        ...mockSession,
        content: {
          id: 'content1',
          name: 'Test Content',
          type: 'flow',
          editedVersionId: 'version1',
          publishedVersionId: null,
          environmentId: 'env1',
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        bizUser: {
          id: 'user1',
          externalId: 'user1',
          data: { name: 'Test User' },
          createdAt: new Date(),
        },
        bizCompany: {
          id: 'company1',
          externalId: 'company1',
          data: { name: 'Test Company' },
          createdAt: new Date(),
        },
        version: {
          id: 'version1',
          sequence: 1,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      };

      mockAnalyticsService.listContentSessionsWithRelations.mockResolvedValue({
        edges: [
          {
            node: mockSessionWithRelations,
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor1',
        },
        totalCount: 1,
      });

      const result = await service.listContentSessions(
        'http://localhost:3000/v1/content-sessions',
        {
          id: 'env1',
          projectId: 'project1',
          name: 'Test Environment',
          token: 'test-token',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          contentId: 'content1',
          limit: 10,
          cursor: undefined,
          expand: undefined,
          orderBy: undefined,
        },
      );

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(result.next).toBeNull();
      expect(result.previous).toBeNull();
      expect(mockAnalyticsService.listContentSessionsWithRelations).toHaveBeenCalledWith(
        'env1',
        'content1',
        { first: 10, after: undefined },
        undefined,
        {
          content: true,
          bizCompany: true,
          bizUser: true,
          version: true,
        },
        [{ createdAt: 'asc' }],
      );
    });

    it('should handle sorting with orderBy parameter', async () => {
      const mockSessionWithRelations = {
        ...mockSession,
        content: {
          id: 'content1',
          name: 'Test Content',
          type: 'flow',
          editedVersionId: 'version1',
          publishedVersionId: null,
          environmentId: 'env1',
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      };

      mockAnalyticsService.listContentSessionsWithRelations.mockResolvedValue({
        edges: [
          {
            node: mockSessionWithRelations,
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor1',
        },
        totalCount: 1,
      });

      const result = await service.listContentSessions(
        'http://localhost:3000/v1/content-sessions',
        {
          id: 'env1',
          projectId: 'project1',
          name: 'Test Environment',
          token: 'test-token',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          contentId: 'content1',
          limit: 10,
          cursor: undefined,
          expand: undefined,
          orderBy: ['-createdAt' as any],
        },
      );

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(result.next).toBeNull();
      expect(result.previous).toBeNull();
      expect(mockAnalyticsService.listContentSessionsWithRelations).toHaveBeenCalledWith(
        'env1',
        'content1',
        { first: 10, after: undefined },
        undefined,
        {
          content: true,
          bizCompany: true,
          bizUser: true,
          version: true,
        },
        [{ createdAt: 'desc' }],
      );
    });
  });

  describe('deleteContentSession', () => {
    it('should delete a content session', async () => {
      mockAnalyticsService.deleteContentSessionWithRelations.mockResolvedValue(mockSession);

      const result = await service.deleteContentSession('1', 'env1');

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.deleted).toBe(true);
    });

    it('should return deleted response even when session not found', async () => {
      mockAnalyticsService.deleteContentSessionWithRelations.mockResolvedValue(null);

      const result = await service.deleteContentSession('1', 'env1');

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.deleted).toBe(true);
    });
  });
});
