import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIAttributesService } from './attributes.service';
import { AttributesService } from '@/attributes/attributes.service';
import { AttributeDataTypeNames, AttributeBizTypeNames } from '@/attributes/models/attribute.model';
import { InvalidLimitError } from '@/common/errors/errors';
import { Connection } from '@devoxa/prisma-relay-cursor-connection';
import { ConfigService } from '@nestjs/config';

describe('OpenAPIAttributesService', () => {
  let service: OpenAPIAttributesService;
  let mockAttributesService: jest.Mocked<AttributesService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockAttributesService = {
      listWithPagination: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIAttributesService,
        {
          provide: AttributesService,
          useValue: mockAttributesService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
      expect(mockAttributesService.listWithPagination).toHaveBeenCalledWith(projectId, {
        after: undefined,
        first: 20,
      });
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

      mockAttributesService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributes(projectId, { cursor });

      expect(result).toEqual({
        results: [
          {
            id: 'attr1',
            object: 'attribute',
            createdAt: '2025-04-29T07:38:58.056Z',
            dataType: AttributeDataTypeNames.Number,
            description: 'Test attribute',
            displayName: 'Test Attribute',
            name: 'test_attribute',
            scope: AttributeBizTypeNames.USER,
          },
        ],
        next: 'http://localhost:3000/v1/attributes?cursor=cursor1&limit=20',
        previous: 'http://localhost:3000/v1/attributes?limit=20',
      });
      expect(mockAttributesService.listWithPagination).toHaveBeenCalledWith(projectId, {
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

      mockAttributesService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributes(projectId, {});

      expect(result).toEqual({
        results: [],
        next: null,
        previous: null,
      });
      expect(mockAttributesService.listWithPagination).toHaveBeenCalledWith(projectId, {
        after: undefined,
        first: 20,
      });
    });
  });
});
