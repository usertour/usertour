import { Test, TestingModule } from '@nestjs/testing';
import { AttributeService } from './attribute.service';
import { PrismaService } from 'nestjs-prisma';
import { AttributesService } from '@/attributes/attributes.service';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { HttpStatus } from '@nestjs/common';
import { AttributeDataTypeNames, AttributeBizTypeNames } from '@/attributes/models/attribute.model';

describe('AttributeService', () => {
  let service: AttributeService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockAttributesService: jest.Mocked<AttributesService>;

  beforeEach(async () => {
    mockPrismaService = {
      attribute: {
        findMany: jest.fn(() => Promise.resolve([])) as any,
        count: jest.fn(() => Promise.resolve(0)) as any,
      },
    } as any;

    mockAttributesService = {
      mapDataType: jest.fn().mockReturnValue('string' as AttributeDataTypeNames),
      mapBizType: jest.fn().mockReturnValue('user' as AttributeBizTypeNames),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AttributesService,
          useValue: mockAttributesService,
        },
      ],
    }).compile();

    service = module.get<AttributeService>(AttributeService);
  });

  describe('listAttributes', () => {
    it('should return attributes with pagination', async () => {
      const projectId = 'test-project-id';
      const mockAttributes = [
        {
          id: 'attr1',
          createdAt: new Date(),
          dataType: 1,
          description: 'Test attribute',
          displayName: 'Test Attribute',
          codeName: 'test_attribute',
          bizType: 1,
        },
      ];

      mockPrismaService.attribute.findMany = jest.fn(() => Promise.resolve(mockAttributes)) as any;
      mockPrismaService.attribute.count = jest.fn(() => Promise.resolve(1)) as any;

      const result = await service.listAttributes(projectId);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('attr1');
      expect(result.results[0].object).toBe('attribute');
      expect(result.results[0].dataType).toBe('string');
      expect(result.results[0].scope).toBe('user');
      expect(mockPrismaService.attribute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId,
            deleted: false,
          },
        }),
      );
    });

    it('should throw OpenAPIException when limit is invalid', async () => {
      const projectId = 'test-project-id';
      const invalidLimit = -1;

      await expect(service.listAttributes(projectId, undefined, invalidLimit)).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.USER.INVALID_LIMIT.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.USER.INVALID_LIMIT.code,
        ),
      );
    });

    it('should handle cursor pagination', async () => {
      const projectId = 'test-project-id';
      const cursor = 'test-cursor';
      const mockAttributes = [
        {
          id: 'attr1',
          createdAt: new Date(),
          dataType: 1,
          description: 'Test attribute',
          displayName: 'Test Attribute',
          codeName: 'test_attribute',
          bizType: 1,
        },
      ];

      mockPrismaService.attribute.findMany = jest.fn(() => Promise.resolve(mockAttributes)) as any;
      mockPrismaService.attribute.count = jest.fn(() => Promise.resolve(1)) as any;

      const result = await service.listAttributes(projectId, cursor);

      expect(mockPrismaService.attribute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId,
            deleted: false,
          },
        }),
      );
      expect(result.results).toHaveLength(1);
    });

    it('should handle empty results', async () => {
      const projectId = 'test-project-id';
      mockPrismaService.attribute.findMany = jest.fn(() => Promise.resolve([])) as any;
      mockPrismaService.attribute.count = jest.fn(() => Promise.resolve(0)) as any;

      const result = await service.listAttributes(projectId);

      expect(result.results).toHaveLength(0);
      expect(result.next).toBeNull();
      expect(result.previous).toBeNull();
    });
  });
});
