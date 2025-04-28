import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentSessionService } from './content-session.service';
import { PrismaService } from 'nestjs-prisma';
import { AnalyticsService } from '@/analytics/analytics.service';
import { ExpandType } from './content-session.dto';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';

describe('OpenAPIContentSessionService', () => {
  let service: OpenAPIContentSessionService;

  const mockPrismaService = {
    bizSession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAnalyticsService = {
    deleteSession: jest.fn(),
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
      ],
    }).compile();

    service = module.get<OpenAPIContentSessionService>(OpenAPIContentSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getContentSession', () => {
    it('should return a content session when found', async () => {
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

      mockPrismaService.bizSession.findUnique.mockResolvedValue(mockSession);

      const result = await service.getContentSession('1', 'env1', [
        ExpandType.CONTENT,
        ExpandType.USER,
        ExpandType.COMPANY,
        ExpandType.VERSION,
      ]);

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(mockPrismaService.bizSession.findUnique).toHaveBeenCalledWith({
        where: { id: '1', content: { environmentId: 'env1' } },
        include: {
          content: true,
          bizUser: true,
          bizCompany: true,
          version: true,
        },
      });
    });

    it('should return null when session not found', async () => {
      mockPrismaService.bizSession.findUnique.mockResolvedValue(null);

      const result = await service.getContentSession('1', 'env1', []);

      expect(result).toBeNull();
    });
  });

  describe('listContentSessions', () => {
    it('should return a list of content sessions', async () => {
      const mockSessions = [
        {
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
        },
        {
          id: '2',
          contentId: 'content1',
          bizUserId: 'user2',
          bizCompanyId: 'company1',
          versionId: 'version1',
          createdAt: new Date(),
          updatedAt: new Date(),
          state: 0,
          progress: 0,
          data: {},
        },
      ];

      mockPrismaService.bizSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.listContentSessions('env1', 'content1', undefined, 10, [
        ExpandType.CONTENT,
        ExpandType.USER,
        ExpandType.COMPANY,
        ExpandType.VERSION,
      ]);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(2);
      expect(mockPrismaService.bizSession.findMany).toHaveBeenCalledWith({
        where: { contentId: 'content1', content: { environmentId: 'env1' } },
        take: 11,
        orderBy: { createdAt: 'desc' },
        include: {
          content: true,
          bizUser: true,
          bizCompany: true,
          version: true,
        },
      });
    });

    it('should handle cursor pagination', async () => {
      const mockSessions = [
        {
          id: '2',
          contentId: 'content1',
          bizUserId: 'user2',
          bizCompanyId: 'company1',
          versionId: 'version1',
          createdAt: new Date(),
          updatedAt: new Date(),
          state: 0,
          progress: 0,
          data: {},
        },
      ];

      mockPrismaService.bizSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.listContentSessions('env1', 'content1', 'cursor1', 10, [
        ExpandType.CONTENT,
        ExpandType.USER,
        ExpandType.COMPANY,
        ExpandType.VERSION,
      ]);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(mockPrismaService.bizSession.findMany).toHaveBeenCalledWith({
        where: { contentId: 'content1', content: { environmentId: 'env1' } },
        take: 11,
        cursor: { id: 'cursor1' },
        orderBy: { createdAt: 'desc' },
        include: {
          content: true,
          bizUser: true,
          bizCompany: true,
          version: true,
        },
      });
    });
  });

  describe('deleteContentSession', () => {
    it('should delete a content session', async () => {
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

      mockPrismaService.bizSession.findUnique.mockResolvedValue(mockSession);

      const result = await service.deleteContentSession('1', 'env1');

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.deleted).toBe(true);
      expect(mockAnalyticsService.deleteSession).toHaveBeenCalledWith('1');
    });

    it('should throw OpenAPIException when session not found', async () => {
      mockPrismaService.bizSession.findUnique.mockResolvedValue(null);

      await expect(service.deleteContentSession('1', 'env1')).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.CONTENT_SESSION.NOT_FOUND.message,
          404,
          OpenAPIErrors.CONTENT_SESSION.NOT_FOUND.code,
        ),
      );
    });
  });
});
