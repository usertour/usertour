import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIEventsController } from './events.controller';
import { OpenAPIEventsService } from './events.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { InvalidLimitError, InvalidCursorError } from '@/common/errors/errors';

describe('OpenAPIEventsController', () => {
  let controller: OpenAPIEventsController;
  let mockService: jest.Mocked<OpenAPIEventsService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    mockService = {
      listEvents: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn(),
    } as any;

    mockPrismaService = {
      $transaction: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPIEventsController],
      providers: [
        {
          provide: OpenAPIEventsService,
          useValue: mockService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<OpenAPIEventsController>(OpenAPIEventsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listEvents', () => {
    it('should return a list of events', async () => {
      const mockEvents = {
        results: [
          {
            id: 'event1',
            object: 'event',
            name: 'Test Event 1',
            displayName: 'Test Event 1',
            description: 'Test Event 1 Description',
            attributes: { name: 'Test Event 1' },
            createdAt: new Date().toISOString(),
          },
          {
            id: 'event2',
            object: 'event',
            name: 'Test Event 2',
            displayName: 'Test Event 2',
            description: 'Test Event 2 Description',
            attributes: { name: 'Test Event 2' },
            createdAt: new Date().toISOString(),
          },
        ],
        next: 'next-cursor',
        previous: 'prev-cursor',
      };

      mockService.listEvents.mockResolvedValue(mockEvents);

      const result = await controller.listEvents(
        { id: 'env1', projectId: 'project1' } as any,
        'cursor1',
        10,
      );

      expect(result).toEqual(mockEvents);
      expect(mockService.listEvents).toHaveBeenCalledWith('project1', 'cursor1', 10);
    });

    it('should throw error when limit is invalid', async () => {
      mockService.listEvents.mockRejectedValue(new InvalidLimitError());

      await expect(
        controller.listEvents({ id: 'env1', projectId: 'project1' } as any, 'cursor1', -1),
      ).rejects.toThrow(new InvalidLimitError());
    });

    it('should throw error when cursor is invalid', async () => {
      mockService.listEvents.mockRejectedValue(new InvalidCursorError());

      await expect(
        controller.listEvents({ id: 'env1', projectId: 'project1' } as any, 'invalid-cursor', 10),
      ).rejects.toThrow(new InvalidCursorError());
    });
  });
});
