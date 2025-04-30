import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIEventDefinitionsController } from './event-definitions.controller';
import { OpenAPIEventDefinitionsService } from './event-definitions.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { InvalidLimitError, InvalidCursorError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/types/openapi';

describe('OpenAPIEventDefinitionsController', () => {
  let controller: OpenAPIEventDefinitionsController;
  let mockService: jest.Mocked<OpenAPIEventDefinitionsService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    mockService = {
      listEventDefinitions: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn(),
    } as any;

    mockPrismaService = {
      $transaction: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPIEventDefinitionsController],
      providers: [
        {
          provide: OpenAPIEventDefinitionsService,
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

    controller = module.get<OpenAPIEventDefinitionsController>(OpenAPIEventDefinitionsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listEventDefinitions', () => {
    it('should return a list of event definitions', async () => {
      const mockEventDefinitions = {
        results: [
          {
            id: 'event1',
            object: OpenApiObjectType.EVENT_DEFINITION,
            name: 'Test Event 1',
            displayName: 'Test Event 1',
            description: 'Test Event 1 Description',
            attributes: { name: 'Test Event 1' },
            createdAt: new Date().toISOString(),
          },
          {
            id: 'event2',
            object: OpenApiObjectType.EVENT_DEFINITION,
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

      mockService.listEventDefinitions.mockResolvedValue(mockEventDefinitions);

      const result = await controller.listEventDefinitions(
        { id: 'env1', projectId: 'project1' } as any,
        10,
        'cursor1',
      );

      expect(result).toEqual(mockEventDefinitions);
      expect(mockService.listEventDefinitions).toHaveBeenCalledWith('project1', 10, 'cursor1');
    });

    it('should throw error when limit is invalid', async () => {
      mockService.listEventDefinitions.mockRejectedValue(new InvalidLimitError());

      await expect(
        controller.listEventDefinitions({ id: 'env1', projectId: 'project1' } as any, -1),
      ).rejects.toThrow(new InvalidLimitError());
    });

    it('should throw error when cursor is invalid', async () => {
      mockService.listEventDefinitions.mockRejectedValue(new InvalidCursorError());

      await expect(
        controller.listEventDefinitions(
          { id: 'env1', projectId: 'project1' } as any,
          10,
          'invalid-cursor',
        ),
      ).rejects.toThrow(new InvalidCursorError());
    });
  });
});
