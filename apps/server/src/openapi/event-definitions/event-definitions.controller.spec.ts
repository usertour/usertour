import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIEventDefinitionsController } from './event-definitions.controller';
import { OpenAPIEventDefinitionsService } from './event-definitions.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { InvalidLimitError, InvalidCursorError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { Environment } from '@/environments/models/environment.model';

describe('OpenAPIEventDefinitionsController', () => {
  let controller: OpenAPIEventDefinitionsController;
  let mockService: jest.Mocked<OpenAPIEventDefinitionsService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  const mockEnvironment: Environment = {
    id: 'env1',
    projectId: 'project1',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
            id: 'event-1',
            object: OpenApiObjectType.EVENT_DEFINITION,
            name: 'Test Event',
            displayName: 'Test Event',
            description: 'Test event description',
            attributes: { name: 'Test Event' },
            codeName: 'test_event',
            createdAt: '2025-04-27T10:56:52.198Z',
          },
        ],
        next: 'http://localhost:3000/v1/event-definitions?cursor=next-cursor',
        previous: 'http://localhost:3000/v1/event-definitions?cursor=prev-cursor',
      };

      mockService.listEventDefinitions.mockResolvedValue(mockEventDefinitions);

      const result = await controller.listEventDefinitions(
        'http://localhost:3000/v1/event-definitions',
        mockEnvironment,
        10,
        'cursor1',
        undefined,
      );

      expect(result).toEqual(mockEventDefinitions);
      expect(mockService.listEventDefinitions).toHaveBeenCalledWith(
        'http://localhost:3000/v1/event-definitions',
        mockEnvironment,
        10,
        'cursor1',
        undefined,
      );
    });

    it('should throw error when limit is invalid', async () => {
      mockService.listEventDefinitions.mockRejectedValue(new InvalidLimitError());

      await expect(
        controller.listEventDefinitions(
          'http://localhost:3000/v1/event-definitions',
          mockEnvironment,
          -1,
        ),
      ).rejects.toThrow(new InvalidLimitError());
    });

    it('should throw error when cursor is invalid', async () => {
      mockService.listEventDefinitions.mockRejectedValue(new InvalidCursorError());

      await expect(
        controller.listEventDefinitions(
          'http://localhost:3000/v1/event-definitions',
          mockEnvironment,
          10,
          'invalid-cursor',
        ),
      ).rejects.toThrow(new InvalidCursorError());
    });
  });
});
