import { Test, TestingModule } from '@nestjs/testing';
import { AttributeController } from './attribute.controller';
import { AttributeService } from './attribute.service';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenapiGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';
import { AttributesService } from '@/attributes/attributes.service';
import { Environment } from '@/environments/models/environment.model';

describe('AttributeController', () => {
  let controller: AttributeController;
  let attributeService: AttributeService;

  const mockAttributeService = {
    listAttributes: jest.fn(),
  };

  const mockPrismaService = {
    attribute: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAttributesService = {
    mapDataType: jest.fn(),
    mapBizType: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttributeController],
      providers: [
        {
          provide: AttributeService,
          useValue: mockAttributeService,
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
          useValue: mockAttributesService,
        },
        OpenapiGuard,
        OpenAPIExceptionFilter,
      ],
    }).compile();

    controller = module.get<AttributeController>(AttributeController);
    attributeService = module.get<AttributeService>(AttributeService);
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

      mockAttributeService.listAttributes.mockResolvedValue(mockResponse);

      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const result = await controller.listAttributes(environment);

      expect(result).toEqual(mockResponse);
      expect(attributeService.listAttributes).toHaveBeenCalledWith(
        'project-1',
        undefined,
        undefined,
      );
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

      mockAttributeService.listAttributes.mockResolvedValue(mockResponse);

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

      const result = await controller.listAttributes(environment, cursor, limit);

      expect(result).toEqual(mockResponse);
      expect(attributeService.listAttributes).toHaveBeenCalledWith('project-1', cursor, limit);
    });
  });
});
