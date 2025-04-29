import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIAttributesService } from './attributes.service';
import { AttributesService } from '@/attributes/attributes.service';
import { AttributeDataTypeNames, AttributeBizTypeNames } from '@/attributes/models/attribute.model';
import { InvalidLimitError } from '@/common/errors/errors';

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
      const mockResponse = {
        data: [
          {
            id: 'attr1',
            object: 'attribute',
            createdAt: new Date().toISOString(),
            dataType: AttributeDataTypeNames.String,
            description: 'Test attribute',
            displayName: 'Test Attribute',
            name: 'test_attribute',
            scope: AttributeBizTypeNames.USER,
          },
        ],
        hasMore: false,
        nextCursor: null,
      };

      mockAttributesService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributes(projectId, {
        cursor: undefined,
        limit: undefined,
      });

      expect(result).toEqual(mockResponse);
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
      const mockResponse = {
        data: [
          {
            id: 'attr1',
            object: 'attribute',
            createdAt: new Date().toISOString(),
            dataType: AttributeDataTypeNames.String,
            description: 'Test attribute',
            displayName: 'Test Attribute',
            name: 'test_attribute',
            scope: AttributeBizTypeNames.USER,
          },
        ],
        hasMore: true,
        nextCursor: 'next-cursor',
      };

      mockAttributesService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributes(projectId, { cursor });

      expect(result).toEqual(mockResponse);
      expect(mockAttributesService.listWithPagination).toHaveBeenCalledWith(projectId, cursor, 20);
    });

    it('should handle empty results', async () => {
      const projectId = 'test-project-id';
      const mockResponse = {
        data: [],
        hasMore: false,
        nextCursor: null,
      };

      mockAttributesService.listWithPagination.mockResolvedValue(mockResponse);

      const result = await service.listAttributes(projectId, {
        cursor: undefined,
        limit: undefined,
      });

      expect(result).toEqual(mockResponse);
      expect(mockAttributesService.listWithPagination).toHaveBeenCalledWith(
        projectId,
        undefined,
        20,
      );
    });
  });
});
