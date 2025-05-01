import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIAttributeDefinitionsController } from './attribute-definitions.controller';
import { OpenAPIAttributeDefinitionsService } from './attribute-definitions.service';
import { OpenApiObjectType } from '@/common/openapi/types';
import { Environment } from '@/environments/models/environment.model';
import { OpenAPIKeyGuard } from '@/openapi/openapi.guard';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

describe('OpenAPIAttributeDefinitionsController', () => {
  let controller: OpenAPIAttributeDefinitionsController;

  const mockAttributeDefinitionsService = {
    listAttributeDefinitions: jest.fn(),
  };

  const mockPrismaService = {
    openAPIKey: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockEnvironment: Environment = {
    id: 'test-env-id',
    projectId: 'test-project-id',
    name: 'test-env',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockRequest = (): string => {
    return '/api/v1/attribute-definitions';
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPIAttributeDefinitionsController],
      providers: [
        {
          provide: OpenAPIAttributeDefinitionsService,
          useValue: mockAttributeDefinitionsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        OpenAPIKeyGuard,
        OpenAPIExceptionFilter,
      ],
    }).compile();

    controller = module.get<OpenAPIAttributeDefinitionsController>(
      OpenAPIAttributeDefinitionsController,
    );
  });

  describe('listAttributeDefinitions', () => {
    it('should return attribute definitions with default parameters', async () => {
      const mockResponse = {
        results: [
          {
            id: 'test-id',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            codeName: 'test_code',
            displayName: 'Test Code',
            description: 'Test Description',
            dataType: 'string',
            scope: OpenApiObjectType.USER,
            createdAt: new Date().toISOString(),
          },
        ],
        next: null,
        previous: null,
      };

      mockAttributeDefinitionsService.listAttributeDefinitions.mockResolvedValue(mockResponse);

      const result = await controller.listAttributeDefinitions(
        createMockRequest(),
        mockEnvironment,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual(mockResponse);
      expect(mockAttributeDefinitionsService.listAttributeDefinitions).toHaveBeenCalledWith(
        '/api/v1/attribute-definitions',
        mockEnvironment,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should return attribute definitions with scope filter', async () => {
      const mockResponse = {
        results: [
          {
            id: 'test-id',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            codeName: 'test_code',
            displayName: 'Test Code',
            description: 'Test Description',
            dataType: 'string',
            scope: OpenApiObjectType.USER,
            createdAt: new Date().toISOString(),
          },
        ],
        next: null,
        previous: null,
      };

      mockAttributeDefinitionsService.listAttributeDefinitions.mockResolvedValue(mockResponse);

      const result = await controller.listAttributeDefinitions(
        createMockRequest(),
        mockEnvironment,
        20,
        OpenApiObjectType.USER,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual(mockResponse);
      expect(mockAttributeDefinitionsService.listAttributeDefinitions).toHaveBeenCalledWith(
        '/api/v1/attribute-definitions',
        mockEnvironment,
        20,
        OpenApiObjectType.USER,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should return attribute definitions with event name filter', async () => {
      const mockResponse = {
        results: [
          {
            id: 'test-id',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            codeName: 'test_code',
            displayName: 'Test Code',
            description: 'Test Description',
            dataType: 'string',
            scope: OpenApiObjectType.EVENT_DEFINITION,
            createdAt: new Date().toISOString(),
          },
        ],
        next: null,
        previous: null,
      };

      mockAttributeDefinitionsService.listAttributeDefinitions.mockResolvedValue(mockResponse);

      const result = await controller.listAttributeDefinitions(
        createMockRequest(),
        mockEnvironment,
        20,
        undefined,
        undefined,
        undefined,
        ['test_event'],
      );

      expect(result).toEqual(mockResponse);
      expect(mockAttributeDefinitionsService.listAttributeDefinitions).toHaveBeenCalledWith(
        '/api/v1/attribute-definitions',
        mockEnvironment,
        20,
        undefined,
        undefined,
        undefined,
        ['test_event'],
      );
    });
  });
});
