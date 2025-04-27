import { Test, TestingModule } from '@nestjs/testing';
import { ContentSessionController } from './content-session.controller';
import { ContentSessionService } from './content-session.service';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from '@/analytics/analytics.service';

describe('ContentSessionController', () => {
  let controller: ContentSessionController;
  let service: ContentSessionService;

  const mockAnalyticsService = {
    deleteSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentSessionController],
      providers: [
        ContentSessionService,
        PrismaService,
        ConfigService,
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<ContentSessionController>(ContentSessionController);
    service = module.get<ContentSessionService>(ContentSessionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listContentSessions', () => {
    it('should return a list of content sessions', async () => {
      const mockSessions = {
        results: [
          {
            id: 'test-id',
            object: 'content_session',
            completed: false,
            completedAt: null,
            contentId: 'test-content-id',
            companyId: 'test-company-id',
            createdAt: new Date().toISOString(),
            isPreview: false,
            lastActivityAt: new Date().toISOString(),
            progress: 1,
            userId: 'test-user-id',
            versionId: 'test-version-id',
          },
        ],
        next: 'next-cursor',
        previous: 'previous-cursor',
      };

      jest.spyOn(service, 'listContentSessions').mockResolvedValue(mockSessions);

      const result = await controller.listContentSessions(
        'env1',
        'content1',
        'cursor1',
        10,
        'content,user',
      );
      expect(result).toEqual(mockSessions);
    });
  });

  describe('getContentSession', () => {
    it('should return a content session by id', async () => {
      const mockSession = {
        id: 'test-id',
        object: 'content_session',
        completed: false,
        completedAt: null,
        contentId: 'test-content-id',
        companyId: 'test-company-id',
        createdAt: new Date().toISOString(),
        isPreview: false,
        lastActivityAt: new Date().toISOString(),
        progress: 1,
        userId: 'test-user-id',
        versionId: 'test-version-id',
      };

      jest.spyOn(service, 'getContentSession').mockResolvedValue(mockSession);

      const result = await controller.getContentSession('test-id', 'env1', 'content,user');
      expect(result).toEqual({ data: mockSession });
    });
  });

  describe('deleteContentSession', () => {
    it('should delete a content session', async () => {
      jest.spyOn(service, 'deleteContentSession').mockResolvedValue(undefined);

      await expect(controller.deleteContentSession('test-id', 'env1')).resolves.not.toThrow();
    });
  });
});
