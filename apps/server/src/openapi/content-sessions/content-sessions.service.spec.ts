import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentSessionsService } from './content-sessions.service';
import { PrismaService } from 'nestjs-prisma';
import { AnalyticsService } from '@/analytics/analytics.service';
import { ExpandType } from './content-sessions.dto';
import { ConfigService } from '@nestjs/config';
import { ContentSessionNotFoundError } from '@/common/errors/errors';
import { ContentsService } from '@/contents/contents.service';

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

  const mockContentsService = {
    getContentById: jest.fn().mockResolvedValue({ id: 'content1' }),
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
          provide: ContentsService,
          useValue: mockContentsService,
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
      mockAnalyticsService.getContentSessionWithRelations.mockResolvedValue(mockSession);

      const result = await service.getContentSession('1', 'env1', [
        ExpandType.CONTENT,
        ExpandType.USER,
        ExpandType.COMPANY,
        ExpandType.VERSION,
      ]);

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(mockAnalyticsService.getContentSessionWithRelations).toHaveBeenCalledWith(
        '1',
        'env1',
        {
          content: true,
          bizUser: true,
          bizCompany: true,
          version: true,
        },
      );
    });

    it('should return null when session not found', async () => {
      mockAnalyticsService.getContentSessionWithRelations.mockResolvedValue(null);

      const result = await service.getContentSession('1', 'env1', []);

      expect(result).toBeNull();
    });
  });

  describe('listContentSessions', () => {
    it('should return a list of content sessions', async () => {
      mockAnalyticsService.listContentSessionsWithRelations.mockResolvedValue({
        edges: [
          {
            node: mockSession,
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor1',
        },
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
        'content1',
        10,
        undefined,
        [ExpandType.CONTENT, ExpandType.USER, ExpandType.COMPANY, ExpandType.VERSION],
      );

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(result.next).toBeNull();
      expect(result.previous).toBeNull();
      expect(mockAnalyticsService.listContentSessionsWithRelations).toHaveBeenCalledWith(
        'env1',
        'content1',
        { first: 10, after: undefined },
        {
          content: true,
          bizUser: true,
          bizCompany: true,
          version: true,
        },
      );
    });

    it('should handle cursor pagination', async () => {
      mockAnalyticsService.listContentSessionsWithRelations.mockResolvedValue({
        edges: [
          {
            node: mockSession,
            cursor: 'cursor2',
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'cursor2',
          endCursor: 'cursor2',
        },
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
        'content1',
        10,
        undefined,
        [ExpandType.CONTENT, ExpandType.USER, ExpandType.COMPANY, ExpandType.VERSION],
      );

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(result.next).toBe(
        'http://localhost:3000/v1/content-sessions?cursor=cursor2&limit=10&expand%5B%5D=content&expand%5B%5D=user&expand%5B%5D=company&expand%5B%5D=version',
      );
      expect(result.previous).toBeNull();
      expect(mockAnalyticsService.listContentSessionsWithRelations).toHaveBeenCalledWith(
        'env1',
        'content1',
        { first: 10, after: undefined },
        {
          content: true,
          bizUser: true,
          bizCompany: true,
          version: true,
        },
      );
    });

    it('should handle cursor pagination with cursor', async () => {
      mockAnalyticsService.listContentSessionsWithRelations.mockResolvedValue({
        edges: [
          {
            node: mockSession,
            cursor: 'cursor2',
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: 'cursor2',
          endCursor: 'cursor2',
        },
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
        'content1',
        10,
        'cursor1',
        [ExpandType.CONTENT, ExpandType.USER, ExpandType.COMPANY, ExpandType.VERSION],
      );

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(result.next).toBe(
        'http://localhost:3000/v1/content-sessions?cursor=cursor2&limit=10&expand%5B%5D=content&expand%5B%5D=user&expand%5B%5D=company&expand%5B%5D=version',
      );
      expect(result.previous).toBe(
        'http://localhost:3000/v1/content-sessions?limit=10&expand%5B%5D=content&expand%5B%5D=user&expand%5B%5D=company&expand%5B%5D=version',
      );
      expect(mockAnalyticsService.listContentSessionsWithRelations).toHaveBeenCalledWith(
        'env1',
        'content1',
        { first: 10, after: 'cursor1' },
        {
          content: true,
          bizUser: true,
          bizCompany: true,
          version: true,
        },
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

    it('should throw ContentSessionNotFoundError when session not found', async () => {
      mockAnalyticsService.deleteContentSessionWithRelations.mockResolvedValue(null);

      await expect(service.deleteContentSession('1', 'env1')).rejects.toThrow(
        new ContentSessionNotFoundError(),
      );
    });
  });
});
