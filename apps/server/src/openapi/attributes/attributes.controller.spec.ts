import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIAttributesController } from './attributes.controller';
import { OpenAPIAttributesService } from './attributes.service';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenapiGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';
import { AttributesService } from '@/attributes/attributes.service';
import { Environment } from '@/environments/models/environment.model';

describe('OpenAPIAttributesController', () => {
  let controller: OpenAPIAttributesController;
  let attributesService: OpenAPIAttributesService;

  const mockAttributesService = {
    listAttributes: jest.fn(),
  };

  const mockPrismaService = {
    attribute: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockBizAttributesService = {
    mapDataType: jest.fn(),
    mapBizType: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPIAttributesController],
      providers: [
        {
          provide: OpenAPIAttributesService,
          useValue: mockAttributesService,
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
          useValue: mockBizAttributesService,
        },
        OpenapiGuard,
        OpenAPIExceptionFilter,
      ],
    }).compile();

    controller = module.get<OpenAPIAttributesController>(OpenAPIAttributesController);
    attributesService = module.get<OpenAPIAttributesService>(OpenAPIAttributesService);
    jest.clearAllMocks();
  });

  describe('listAttributes', () => {
    it('should return paginated attributes', async () => {
      const mockResponse = {
        results: [
          {
            id: 'attr1',
            object: 'attribute',
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

      mockAttributesService.listAttributes.mockResolvedValue(mockResponse);

      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const result = await controller.listAttributes(environment, {
        cursor: undefined,
        limit: undefined,
      });

      expect(result).toEqual(mockResponse);
      expect(attributesService.listAttributes).toHaveBeenCalledWith('project-1', {
        cursor: undefined,
        limit: undefined,
      });
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        results: [
          {
            id: 'attr1',
            object: 'attribute',
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

      mockAttributesService.listAttributes.mockResolvedValue(mockResponse);

      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const cursor = 'current_cursor';
      const limit = 10;

      const result = await controller.listAttributes(environment, { cursor, limit });

      expect(result).toEqual(mockResponse);
      expect(attributesService.listAttributes).toHaveBeenCalledWith('project-1', { cursor, limit });
    });
  });
});
