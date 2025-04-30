import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIAttributeDefinitionsService } from './attribute-definitions.service';
import { AttributesService } from '@/attributes/attributes.service';
import { AttributeDataTypeNames, AttributeBizTypeNames } from '@/attributes/models/attribute.model';
import { InvalidLimitError } from '@/common/errors/errors';
import { Connection } from '@devoxa/prisma-relay-cursor-connection';
import { ConfigService } from '@nestjs/config';
import { OpenApiObjectType } from '@/common/types/openapi';
describe('OpenAPIAttributeDefinitionsService', () => {
  let service: OpenAPIAttributeDefinitionsService;
  let mockAttributeDefinitionsService: jest.Mocked<AttributesService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockAttributeDefinitionsService = {
      listWithPagination: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIAttributeDefinitionsService,
        {
          provide: AttributesService,
          useValue: mockAttributeDefinitionsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenAPIAttributeDefinitionsService>(OpenAPIAttributeDefinitionsService);
  });

  describe('listAttributes', () => {
    it('should return attributes with pagination', async () => {
      const projectId = 'test-project-id';
      const node = {
        id: 'attr1',
        createdAt: new Date(),
        updatedAt: new Date(),
        bizType: 1,
        projectId: 'test-project-id',
        displayName: 'Test Attribute',
        codeName: 'test_attribute',
        description: 'Test attribute',
        dataType: 1,
        randomMax: 0,
        predefined: false,
        deleted: false,
      };
      const mockResponse: Connection<any> = {
        edges: [
          {
            cursor: 'cursor1',
            node,
          },
        ],
        nodes: [node],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor1',
        },
        totalCount: 1,
      };

      mockAttributeDefinitionsService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributeDefinitions(projectId, {
        cursor: undefined,
        limit: undefined,
      });

      expect(result).toEqual({
        results: [
          {
            id: 'attr1',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            createdAt: mockResponse.edges[0].node.createdAt.toISOString(),
            dataType: AttributeDataTypeNames.Number,
            description: 'Test attribute',
            displayName: 'Test Attribute',
            name: 'test_attribute',
            scope: AttributeBizTypeNames.USER,
          },
        ],
        next: null,
        previous: null,
      });
      expect(mockAttributeDefinitionsService.listWithPagination).toHaveBeenCalledWith(projectId, {
        after: undefined,
        first: 20,
      });
    });

    it('should throw error when limit is invalid', async () => {
      const projectId = 'test-project-id';
      const invalidLimit = -1;

      await expect(
        service.listAttributeDefinitions(projectId, { limit: invalidLimit }),
      ).rejects.toThrow(new InvalidLimitError());
    });

    it('should handle cursor pagination', async () => {
      const projectId = 'test-project-id';
      const cursor = 'cursor1';
      const node = {
        id: 'attr1',
        createdAt: new Date('2025-04-29T07:38:58.056Z'),
        updatedAt: new Date(),
        bizType: 1,
        projectId: 'test-project-id',
        displayName: 'Test Attribute',
        codeName: 'test_attribute',
        description: 'Test attribute',
        dataType: 1,
        randomMax: 0,
        predefined: false,
        deleted: false,
      };
      const mockResponse: Connection<any> = {
        edges: [
          {
            cursor: 'cursor1',
            node,
          },
        ],
        nodes: [node],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: 'cursor1',
          endCursor: 'cursor1',
        },
        totalCount: 1,
      };

      mockAttributeDefinitionsService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributeDefinitions(projectId, { cursor });

      expect(result).toEqual({
        results: [
          {
            id: 'attr1',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            createdAt: '2025-04-29T07:38:58.056Z',
            dataType: AttributeDataTypeNames.Number,
            description: 'Test attribute',
            displayName: 'Test Attribute',
            name: 'test_attribute',
            scope: AttributeBizTypeNames.USER,
          },
        ],
        next: 'http://localhost:3000/v1/attribute-definitions?cursor=cursor1&limit=20',
        previous: 'http://localhost:3000/v1/attribute-definitions?limit=20',
      });
      expect(mockAttributeDefinitionsService.listWithPagination).toHaveBeenCalledWith(projectId, {
        after: cursor,
        first: 20,
      });
    });

    it('should handle empty results', async () => {
      const projectId = 'test-project-id';
      const mockResponse: Connection<any> = {
        edges: [],
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
      };

      mockAttributeDefinitionsService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributeDefinitions(projectId, {});

      expect(result).toEqual({
        results: [],
        next: null,
        previous: null,
      });
      expect(mockAttributeDefinitionsService.listWithPagination).toHaveBeenCalledWith(projectId, {
        after: undefined,
        first: 20,
      });
    });
  });
});
