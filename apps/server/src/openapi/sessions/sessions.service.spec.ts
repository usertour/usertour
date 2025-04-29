import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentSessionService } from './sessions.service';
import { PrismaService } from 'nestjs-prisma';
import { AnalyticsService } from '@/analytics/analytics.service';
import { ExpandType } from './sessions.dto';
import { ConfigService } from '@nestjs/config';
import { ContentSessionNotFoundError } from '@/common/errors/errors';

describe('OpenAPIContentSessionService', () => {
  let service: OpenAPIContentSessionService;

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
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIContentSessionService,
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
      ],
    }).compile();

    service = module.get<OpenAPIContentSessionService>(OpenAPIContentSessionService);
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('http://localhost:3000');
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
        results: [mockSession],
        hasNext: false,
        endCursor: null,
      });

      const result = await service.listContentSessions('env1', 'content1', undefined, 10, [
        ExpandType.CONTENT,
        ExpandType.USER,
        ExpandType.COMPANY,
        ExpandType.VERSION,
      ]);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(mockAnalyticsService.listContentSessionsWithRelations).toHaveBeenCalledWith(
        'env1',
        'content1',
        undefined,
        10,
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
        results: [mockSession],
        hasNext: true,
        endCursor: 'nextCursor',
      });

      const result = await service.listContentSessions('env1', 'content1', 'cursor1', 10, [
        ExpandType.CONTENT,
        ExpandType.USER,
        ExpandType.COMPANY,
        ExpandType.VERSION,
      ]);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(result.next).toBe(
        'http://localhost:3000/v1/content_sessions?cursor=nextCursor&limit=10',
      );
      expect(result.previous).toBe('cursor1');
      expect(mockAnalyticsService.listContentSessionsWithRelations).toHaveBeenCalledWith(
        'env1',
        'content1',
        'cursor1',
        10,
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
      expect(mockAnalyticsService.deleteContentSessionWithRelations).toHaveBeenCalledWith(
        '1',
        'env1',
      );
    });

    it('should throw ContentSessionNotFoundError when session not found', async () => {
      mockAnalyticsService.deleteContentSessionWithRelations.mockResolvedValue(null);

      await expect(service.deleteContentSession('1', 'env1')).rejects.toThrow(
        new ContentSessionNotFoundError(),
      );
    });
  });
});
