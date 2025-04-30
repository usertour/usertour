import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIAttributeDefinitionsController } from './attribute-definitions.controller';
import { OpenAPIAttributeDefinitionsService } from './attribute-definitions.service';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { AttributesService } from '@/attributes/attributes.service';
import { Environment } from '@/environments/models/environment.model';
import { OpenApiObjectType } from '@/common/openapi/types';
describe('OpenAPIAttributeDefinitionsController', () => {
  let controller: OpenAPIAttributeDefinitionsController;
  let attributeDefinitionsService: OpenAPIAttributeDefinitionsService;

  const mockAttributeDefinitionsService = {
    listAttributeDefinitions: jest.fn(),
  };

  const mockPrismaService = {
    attribute: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockBizAttributeDefinitionsService = {
    mapDataType: jest.fn(),
    mapBizType: jest.fn(),
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
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'app.docUrl':
                  return 'https://docs.usertour.com';
                case 'app.apiUrl':
                  return 'http://localhost:3000';
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: AttributesService,
          useValue: mockBizAttributeDefinitionsService,
        },
        OpenAPIKeyGuard,
        OpenAPIExceptionFilter,
      ],
    }).compile();

    controller = module.get<OpenAPIAttributeDefinitionsController>(
      OpenAPIAttributeDefinitionsController,
    );
    attributeDefinitionsService = module.get<OpenAPIAttributeDefinitionsService>(
      OpenAPIAttributeDefinitionsService,
    );
    jest.clearAllMocks();
  });

  describe('listAttributeDefinitions', () => {
    it('should return paginated attribute definitions', async () => {
      const mockResponse = {
        results: [
          {
            id: 'attr1',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            createdAt: new Date().toISOString(),
            dataType: 'string',
            description: 'Test attribute',
            displayName: 'Test Attribute',
            name: 'test_attribute',
            scope: 'user',
          },
        ],
        next: null,
        previous: null,
      };

      mockAttributeDefinitionsService.listAttributeDefinitions.mockResolvedValue(mockResponse);

      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const result = await controller.listAttributeDefinitions(
        environment,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockResponse);
      expect(attributeDefinitionsService.listAttributeDefinitions).toHaveBeenCalledWith(
        'project-1',
        20,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        results: [
          {
            id: 'attr1',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            createdAt: new Date().toISOString(),
            dataType: 'string',
            description: 'Test attribute',
            displayName: 'Test Attribute',
            name: 'test_attribute',
            scope: 'user',
          },
        ],
        next: 'next_cursor',
        previous: null,
      };

      mockAttributeDefinitionsService.listAttributeDefinitions.mockResolvedValue(mockResponse);

      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const cursor = 'current_cursor';

      const result = await controller.listAttributeDefinitions(
        environment,
        20,
        undefined,
        cursor,
        undefined,
        undefined,
      );

      expect(result).toEqual(mockResponse);
      expect(attributeDefinitionsService.listAttributeDefinitions).toHaveBeenCalledWith(
        'project-1',
        20,
        undefined,
        cursor,
        undefined,
        undefined,
      );
    });
  });
});
