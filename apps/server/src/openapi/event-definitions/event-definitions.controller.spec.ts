import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIEventDefinitionsController } from './event-definitions.controller';
import { OpenAPIEventDefinitionsService } from './event-definitions.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { InvalidLimitError, InvalidCursorError } from '@/common/errors/errors';
import { Environment } from '@/environments/models/environment.model';
import { ListEventDefinitionsQueryDto, EventDefinitionOrderByType } from './event-definitions.dto';

describe('OpenAPIEventDefinitionsController', () => {
  let controller: OpenAPIEventDefinitionsController;
  let mockService: jest.Mocked<OpenAPIEventDefinitionsService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  const mockEnvironment: Environment = {
    id: 'env-1',
    projectId: 'project-1',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequestUrl = 'http://localhost:3000/v1/event-definitions';

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
    const mockQuery: ListEventDefinitionsQueryDto = {
      cursor: 'cursor1',
      limit: 10,
      orderBy: [EventDefinitionOrderByType.CREATED_AT],
    };

    const mockResponse = {
      results: [
        {
          id: 'event-1',
          object: 'eventDefinition',
          displayName: 'Test Event',
          codeName: 'test_event',
          description: 'Test Description',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      next: null,
      previous: null,
    };

    it('should return paginated event definitions', async () => {
      mockService.listEventDefinitions.mockResolvedValue(mockResponse);

      const result = await controller.listEventDefinitions(
        mockRequestUrl,
        mockEnvironment,
        mockQuery,
      );

      expect(result).toEqual(mockResponse);
      expect(mockService.listEventDefinitions).toHaveBeenCalledWith(
        mockRequestUrl,
        mockEnvironment,
        mockQuery,
      );
    });

    it('should handle default parameters', async () => {
      const defaultQuery: ListEventDefinitionsQueryDto = {};
      mockService.listEventDefinitions.mockResolvedValue({
        results: [],
        next: null,
        previous: null,
      });

      await controller.listEventDefinitions(mockRequestUrl, mockEnvironment, defaultQuery);

      expect(mockService.listEventDefinitions).toHaveBeenCalledWith(
        mockRequestUrl,
        mockEnvironment,
        defaultQuery,
      );
    });

    it('should throw error when limit is invalid', async () => {
      mockService.listEventDefinitions.mockRejectedValue(new InvalidLimitError());

      await expect(
        controller.listEventDefinitions(mockRequestUrl, mockEnvironment, {
          ...mockQuery,
          limit: -1,
        } as ListEventDefinitionsQueryDto),
      ).rejects.toThrow(new InvalidLimitError());
    });

    it('should throw error when cursor is invalid', async () => {
      mockService.listEventDefinitions.mockRejectedValue(new InvalidCursorError());

      await expect(
        controller.listEventDefinitions(mockRequestUrl, mockEnvironment, {
          ...mockQuery,
          cursor: 'invalid-cursor',
        } as ListEventDefinitionsQueryDto),
      ).rejects.toThrow(new InvalidCursorError());
    });
  });
});
