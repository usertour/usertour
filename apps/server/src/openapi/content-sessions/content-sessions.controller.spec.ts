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
      const contentId = 'test-content-id';
      const limit = 20;
      const cursor = 'test-cursor';
      const expand = [ExpandType.CONTENT, ExpandType.USER];

      const result = await controller.listContentSessions(
        'http://localhost:3000/v1/content-sessions',
        {
          id: 'test-env',
          projectId: 'test-project',
          name: 'Test Environment',
          token: 'test-token',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        contentId,
        limit,
        cursor,
        expand,
      );

      expect(service.listContentSessions).toHaveBeenCalledWith(
        'http://localhost:3000/v1/content-sessions',
        {
          id: 'test-env',
          projectId: 'test-project',
          name: 'Test Environment',
          token: 'test-token',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        contentId,
        limit,
        cursor,
        ['content', 'user'],
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle default limit and no expand', async () => {
      const contentId = 'test-content-id';

      const result = await controller.listContentSessions(
        'http://localhost:3000/v1/content-sessions',
        {
          id: 'test-env',
          projectId: 'test-project',
          name: 'Test Environment',
          token: 'test-token',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        contentId,
        20,
        undefined,
        undefined,
      );

      expect(service.listContentSessions).toHaveBeenCalledWith(
        'http://localhost:3000/v1/content-sessions',
        {
          id: 'test-env',
          projectId: 'test-project',
          name: 'Test Environment',
          token: 'test-token',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
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
      const expand = [ExpandType.CONTENT, ExpandType.USER];

      const result = await controller.getContentSession(id, 'test-env', expand);

      expect(service.getContentSession).toHaveBeenCalledWith(id, 'test-env', ['content', 'user']);
      expect(result).toEqual({ data: mockContentSession });
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
