import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentSessionsController } from './content-sessions.controller';
import { OpenAPIContentSessionsService } from './content-sessions.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { ExpandType } from './content-sessions.dto';

describe('OpenAPIContentSessionsController', () => {
  let controller: OpenAPIContentSessionsController;
  let service: OpenAPIContentSessionsService;

  const mockContentSession = {
    id: 'test-id',
    contentId: 'test-content-id',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResponse = {
    data: [mockContentSession],
    pagination: {
      next: 'http://localhost:3000/v1/content-sessions?cursor=next-cursor',
      previous: null,
      totalCount: 1,
    },
  };

  const mockService = {
    listContentSessions: jest.fn().mockResolvedValue(mockPaginatedResponse),
    getContentSession: jest.fn().mockResolvedValue(mockContentSession),
    deleteContentSession: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrismaService = {
    apiKey: {
      findUnique: jest.fn(),
    },
  };

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
          useValue: mockPrismaService,
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
    it('should return paginated content sessions', async () => {
      const environmentId = 'test-env';
      const contentId = 'test-content-id';
      const limit = 20;
      const cursor = 'test-cursor';
      const expand = [ExpandType.CONTENT, ExpandType.USER];

      const result = await controller.listContentSessions(
        environmentId,
        contentId,
        limit,
        cursor,
        expand,
      );

      expect(service.listContentSessions).toHaveBeenCalledWith(
        environmentId,
        contentId,
        limit,
        cursor,
        ['content', 'user'],
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle default limit and no expand', async () => {
      const environmentId = 'test-env';
      const contentId = 'test-content-id';

      const result = await controller.listContentSessions(
        environmentId,
        contentId,
        20,
        undefined,
        undefined,
      );

      expect(service.listContentSessions).toHaveBeenCalledWith(
        environmentId,
        contentId,
        20,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('getContentSession', () => {
    it('should return a content session', async () => {
      const id = 'test-id';
      const environmentId = 'test-env';
      const expand = [ExpandType.CONTENT, ExpandType.USER];

      const result = await controller.getContentSession(id, environmentId, expand);

      expect(service.getContentSession).toHaveBeenCalledWith(id, environmentId, [
        'content',
        'user',
      ]);
      expect(result).toEqual({ data: mockContentSession });
    });
  });

  describe('deleteContentSession', () => {
    it('should delete a content session', async () => {
      const id = 'test-id';
      const environmentId = 'test-env';

      await controller.deleteContentSession(id, environmentId);

      expect(service.deleteContentSession).toHaveBeenCalledWith(id, environmentId);
    });
  });
});
