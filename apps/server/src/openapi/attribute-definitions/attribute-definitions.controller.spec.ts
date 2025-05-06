import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIAttributeDefinitionsController } from './attribute-definitions.controller';
import { OpenAPIAttributeDefinitionsService } from './attribute-definitions.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { OpenApiObjectType } from '@/common/openapi/types';
import { AttributeDefinitionOrderByType } from './attribute-definitions.dto';
describe('OpenAPIAttributeDefinitionsController', () => {
  let controller: OpenAPIAttributeDefinitionsController;
  let service: OpenAPIAttributeDefinitionsService;

  const createMockEnvironment = () => ({
    id: 'test-env',
    projectId: 'test-project',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockService: jest.Mocked<OpenAPIAttributeDefinitionsService> = {
    listAttributeDefinitions: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPIAttributeDefinitionsController],
      providers: [
        {
          provide: OpenAPIAttributeDefinitionsService,
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
          useValue: {
            apiKey: { findUnique: jest.fn() },
          },
        },
        OpenAPIKeyGuard,
        OpenAPIExceptionFilter,
      ],
    })
      .overrideGuard(OpenAPIKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideFilter(OpenAPIExceptionFilter)
      .useValue({ catch: jest.fn() })
      .compile();

    controller = module.get<OpenAPIAttributeDefinitionsController>(
      OpenAPIAttributeDefinitionsController,
    );
    service = module.get<OpenAPIAttributeDefinitionsService>(OpenAPIAttributeDefinitionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listAttributeDefinitions', () => {
    const mockPaginatedResponse = {
      results: [
        {
          id: 'attr1',
          object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
          createdAt: '2025-05-05T10:48:30.000Z',
          dataType: 'string',
          description: 'Test attribute',
          displayName: 'Test Attribute',
          codeName: 'test_attribute',
          scope: OpenApiObjectType.USER,
        },
      ],
      next: 'http://localhost:3000/v1/attribute-definitions?cursor=next-cursor',
      previous: null,
    };

    beforeEach(() => {
      mockService.listAttributeDefinitions.mockResolvedValue(mockPaginatedResponse);
    });

    it('should return paginated attribute definitions with all parameters', async () => {
      const query = {
        limit: 20,
        cursor: 'test-cursor',
        scope: OpenApiObjectType.USER,
        orderBy: [AttributeDefinitionOrderByType.CREATED_AT_DESC],
        eventName: ['test_event'],
      };

      const result = await controller.listAttributeDefinitions(
        'http://localhost:3000/v1/attribute-definitions',
        createMockEnvironment(),
        query,
      );

      expect(service.listAttributeDefinitions).toHaveBeenCalledWith(
        'http://localhost:3000/v1/attribute-definitions',
        expect.objectContaining({
          id: 'test-env',
          projectId: 'test-project',
          name: 'Test Environment',
          token: 'test-token',
        }),
        query,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle default parameters', async () => {
      const result = await controller.listAttributeDefinitions(
        'http://localhost:3000/v1/attribute-definitions',
        createMockEnvironment(),
        {},
      );

      expect(service.listAttributeDefinitions).toHaveBeenCalledWith(
        'http://localhost:3000/v1/attribute-definitions',
        expect.objectContaining({
          id: 'test-env',
          projectId: 'test-project',
          name: 'Test Environment',
          token: 'test-token',
        }),
        {},
      );
      expect(result).toEqual(mockPaginatedResponse);
    });
  });
});
