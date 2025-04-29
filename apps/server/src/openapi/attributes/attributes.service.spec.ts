import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIAttributesService } from './attributes.service';
import { AttributesService } from '@/attributes/attributes.service';
import { AttributeDataTypeNames, AttributeBizTypeNames } from '@/attributes/models/attribute.model';
import { InvalidLimitError } from '@/common/errors/errors';
import { Connection } from '@devoxa/prisma-relay-cursor-connection';

describe('OpenAPIAttributesService', () => {
  let service: OpenAPIAttributesService;
  let mockAttributesService: jest.Mocked<AttributesService>;

  beforeEach(async () => {
    mockAttributesService = {
      listWithPagination: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIAttributesService,
        {
          provide: AttributesService,
          useValue: mockAttributesService,
        },
      ],
    }).compile();

    service = module.get<OpenAPIAttributesService>(OpenAPIAttributesService);
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

      mockAttributesService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributes(projectId, {
        cursor: undefined,
        limit: undefined,
      });

      expect(result).toEqual({
        results: [
          {
            id: 'attr1',
            object: 'attribute',
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
      expect(mockAttributesService.listWithPagination).toHaveBeenCalledWith(
        projectId,
        undefined,
        20,
      );
    });

    it('should throw error when limit is invalid', async () => {
      const projectId = 'test-project-id';
      const invalidLimit = -1;

      await expect(service.listAttributes(projectId, { limit: invalidLimit })).rejects.toThrow(
        new InvalidLimitError(),
      );
    });

    it('should handle cursor pagination', async () => {
      const projectId = 'test-project-id';
      const cursor = 'test-cursor';
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
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor1',
        },
        totalCount: 1,
      };

      mockAttributesService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributes(projectId, { cursor });

      expect(result).toEqual({
        results: [
          {
            id: 'attr1',
            object: 'attribute',
            createdAt: mockResponse.edges[0].node.createdAt.toISOString(),
            dataType: AttributeDataTypeNames.Number,
            description: 'Test attribute',
            displayName: 'Test Attribute',
            name: 'test_attribute',
            scope: AttributeBizTypeNames.USER,
          },
        ],
        next: 'cursor1',
        previous: null,
      });
      expect(mockAttributesService.listWithPagination).toHaveBeenCalledWith(projectId, cursor, 20);
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

      mockAttributesService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributes(projectId, {
        cursor: undefined,
        limit: undefined,
      });

      expect(result).toEqual({
        results: [],
        next: null,
        previous: null,
      });
      expect(mockAttributesService.listWithPagination).toHaveBeenCalledWith(
        projectId,
        undefined,
        20,
      );
    });
  });
});
