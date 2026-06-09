import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIAttributeDefinitionsService } from './attribute-definitions.service';
import { AttributesService } from '@/attributes/attributes.service';
import { AttributeDataTypeNames, AttributeBizTypeNames } from '@/attributes/models/attribute.model';
import { InvalidLimitError, InvalidScopeError } from '@/common/errors/errors';
import { Connection } from '@devoxa/prisma-relay-cursor-connection';
import { ConfigService } from '@nestjs/config';
import { OpenApiObjectType } from '@/common/openapi/types';
import { Environment } from '@/environments/models/environment.model';
import { ListAttributeDefinitionsQueryDto } from './attribute-definitions.dto';

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
      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'test-project-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const node = {
        id: 'attr1',
        createdAt: new Date(),
        updatedAt: new Date(),
        bizType: AttributeBizTypeNames.USER,
        projectId: 'test-project-id',
        displayName: 'Test Attribute',
        codeName: 'test_attribute',
        description: 'Test attribute',
        dataType: AttributeDataTypeNames.String,
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

      const query: ListAttributeDefinitionsQueryDto = {
        limit: 20,
      };

      const result = await service.listAttributeDefinitions(
        '/v1/attribute-definitions',
        environment,
        query,
      );

      expect(result).toEqual({
        results: [
          {
            id: 'attr1',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            createdAt: mockResponse.edges[0].node.createdAt.toISOString(),
            dataType: AttributeDataTypeNames.String,
            description: 'Test attribute',
            displayName: 'Test Attribute',
            codeName: 'test_attribute',
            scope: AttributeBizTypeNames.USER,
          },
        ],
        next: null,
        previous: null,
      });
      expect(mockAttributeDefinitionsService.listWithPagination).toHaveBeenCalledWith(
        'test-project-id',
        {
          after: undefined,
          first: 20,
        },
        undefined,
        undefined,
        [{ displayName: 'asc' }],
      );
    });

    it('should throw error when limit is invalid', async () => {
      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'test-project-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const query: ListAttributeDefinitionsQueryDto = {
        limit: -1,
      };

      await expect(
        service.listAttributeDefinitions('/v1/attribute-definitions', environment, query),
      ).rejects.toThrow(new InvalidLimitError());
    });

    it('should handle cursor pagination', async () => {
      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'test-project-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const cursor = 'cursor1';
      const node = {
        id: 'attr1',
        createdAt: new Date('2025-04-29T07:38:58.056Z'),
        updatedAt: new Date(),
        bizType: AttributeBizTypeNames.USER,
        projectId: 'test-project-id',
        displayName: 'Test Attribute',
        codeName: 'test_attribute',
        description: 'Test attribute',
        dataType: AttributeDataTypeNames.String,
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

      const query: ListAttributeDefinitionsQueryDto = {
        limit: 20,
        cursor,
      };

      const result = await service.listAttributeDefinitions(
        '/v1/attribute-definitions',
        environment,
        query,
      );

      expect(result).toEqual({
        results: [
          {
            id: 'attr1',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            createdAt: '2025-04-29T07:38:58.056Z',
            dataType: AttributeDataTypeNames.String,
            description: 'Test attribute',
            displayName: 'Test Attribute',
            codeName: 'test_attribute',
            scope: 'user',
          },
        ],
        next: '/v1/attribute-definitions?cursor=cursor1&limit=20',
        previous: '/v1/attribute-definitions?limit=20',
      });
      expect(mockAttributeDefinitionsService.listWithPagination).toHaveBeenCalledWith(
        'test-project-id',
        {
          after: cursor,
          first: 20,
        },
        undefined,
        undefined,
        [{ displayName: 'asc' }],
      );
    });

    it('should handle sorting with orderBy parameter', async () => {
      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'test-project-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const node = {
        id: 'attr1',
        createdAt: new Date('2025-04-29T07:38:58.056Z'),
        updatedAt: new Date(),
        bizType: AttributeBizTypeNames.USER,
        projectId: 'test-project-id',
        displayName: 'Test Attribute',
        codeName: 'test_attribute',
        description: 'Test attribute',
        dataType: AttributeDataTypeNames.String,
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

      const query: ListAttributeDefinitionsQueryDto = {
        limit: 20,
        orderBy: ['-codeName'] as any,
      };

      const result = await service.listAttributeDefinitions(
        '/v1/attribute-definitions',
        environment,
        query,
      );

      expect(result).toEqual({
        results: [
          {
            id: 'attr1',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            createdAt: '2025-04-29T07:38:58.056Z',
            dataType: AttributeDataTypeNames.String,
            description: 'Test attribute',
            displayName: 'Test Attribute',
            codeName: 'test_attribute',
            scope: 'user',
          },
        ],
        next: null,
        previous: null,
      });
      expect(mockAttributeDefinitionsService.listWithPagination).toHaveBeenCalledWith(
        'test-project-id',
        {
          after: undefined,
          first: 20,
        },
        undefined,
        undefined,
        [{ codeName: 'desc' }],
      );
    });

    it('should handle event name filter', async () => {
      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'test-project-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const node = {
        id: 'attr1',
        createdAt: new Date('2025-04-29T07:38:58.056Z'),
        updatedAt: new Date(),
        bizType: AttributeBizTypeNames.USER,
        projectId: 'test-project-id',
        displayName: 'Test Attribute',
        codeName: 'test_attribute',
        description: 'Test attribute',
        dataType: AttributeDataTypeNames.String,
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

      const query: ListAttributeDefinitionsQueryDto = {
        limit: 20,
        eventName: ['test_event'],
      };

      const result = await service.listAttributeDefinitions(
        '/v1/attribute-definitions',
        environment,
        query,
      );

      expect(result).toEqual({
        results: [
          {
            id: 'attr1',
            object: OpenApiObjectType.ATTRIBUTE_DEFINITION,
            createdAt: '2025-04-29T07:38:58.056Z',
            dataType: AttributeDataTypeNames.String,
            description: 'Test attribute',
            displayName: 'Test Attribute',
            codeName: 'test_attribute',
            scope: 'user',
          },
        ],
        next: null,
        previous: null,
      });
      expect(mockAttributeDefinitionsService.listWithPagination).toHaveBeenCalledWith(
        'test-project-id',
        {
          after: undefined,
          first: 20,
        },
        undefined,
        ['test_event'],
        [{ displayName: 'asc' }],
      );
    });

    it('should handle empty results', async () => {
      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'test-project-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

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

      const query: ListAttributeDefinitionsQueryDto = {
        limit: 20,
      };

      const result = await service.listAttributeDefinitions(
        '/v1/attribute-definitions',
        environment,
        query,
      );

      expect(result).toEqual({
        results: [],
        next: null,
        previous: null,
      });
      expect(mockAttributeDefinitionsService.listWithPagination).toHaveBeenCalledWith(
        'test-project-id',
        {
          after: undefined,
          first: 20,
        },
        undefined,
        undefined,
        [{ displayName: 'asc' }],
      );
    });

    it('should throw error when scope is invalid', async () => {
      const environment = {
        id: 'env-1',
        name: 'Test Environment',
        token: 'test-token',
        projectId: 'test-project-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Environment;

      const invalidScope = 'invalid_scope';

      const query: ListAttributeDefinitionsQueryDto = {
        limit: 20,
        scope: invalidScope as OpenApiObjectType,
      };

      await expect(
        service.listAttributeDefinitions('/v1/attribute-definitions', environment, query),
      ).rejects.toThrow(new InvalidScopeError(invalidScope));
    });
  });
});
