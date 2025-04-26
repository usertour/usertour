import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from './content.service';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { ExpandType } from './content.dto';
import * as cursorPagination from '@devoxa/prisma-relay-cursor-connection';

jest.mock('@devoxa/prisma-relay-cursor-connection');

describe('ContentService', () => {
  let service: ContentService;

  const mockPrismaService = {
    content: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    jest.clearAllMocks();
  });

  describe('getContent', () => {
    it('should return content with no expand', async () => {
      const mockContent = {
        id: 'test-id',
        type: 'flow',
        editedVersionId: 'version-1',
        publishedVersionId: null,
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.content.findFirst.mockResolvedValue(mockContent);

      const result = await service.getContent('test-id', 'env-id');

      expect(result).toEqual({
        id: mockContent.id,
        object: 'content',
        type: mockContent.type,
        editedVersionId: mockContent.editedVersionId,
        publishedVersionId: mockContent.publishedVersionId,
        updatedAt: mockContent.updatedAt.toISOString(),
        createdAt: mockContent.createdAt.toISOString(),
      });
    });

    it('should return content with edited version expand', async () => {
      const mockContent = {
        id: 'test-id',
        type: 'flow',
        editedVersionId: 'version-1',
        editedVersion: {
          id: 'version-1',
          sequence: 1,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        publishedVersionId: null,
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.content.findFirst.mockResolvedValue(mockContent);

      const result = await service.getContent('test-id', 'env-id', [ExpandType.EDITED_VERSION]);

      expect(result).toEqual({
        id: mockContent.id,
        object: 'content',
        type: mockContent.type,
        editedVersionId: mockContent.editedVersionId,
        editedVersion: {
          id: mockContent.editedVersion.id,
          object: 'contentVersion',
          number: mockContent.editedVersion.sequence,
          questions: [],
          updatedAt: mockContent.editedVersion.updatedAt.toISOString(),
          createdAt: mockContent.editedVersion.createdAt.toISOString(),
        },
        publishedVersionId: mockContent.publishedVersionId,
        updatedAt: mockContent.updatedAt.toISOString(),
        createdAt: mockContent.createdAt.toISOString(),
      });
    });

    it('should throw not found error when content does not exist', async () => {
      mockPrismaService.content.findFirst.mockResolvedValue(null);

      await expect(service.getContent('non-existent', 'env-id')).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.CONTENT.NOT_FOUND.code,
        ),
      );
    });
  });

  describe('listContents', () => {
    const mockContent = {
      id: 'test-id-1',
      type: 'flow',
      editedVersionId: 'version-1',
      publishedVersionId: null,
      updatedAt: new Date(),
      createdAt: new Date(),
      editedVersion: null,
      publishedVersion: null,
    };

    const mockConnection = {
      edges: [
        {
          node: mockContent,
          cursor: 'cursor-1',
        },
      ],
      pageInfo: {
        hasNextPage: false,
        endCursor: 'cursor-1',
      },
    };

    beforeEach(() => {
      (cursorPagination.findManyCursorConnection as jest.Mock).mockReset();
      // Set default successful behavior
      (cursorPagination.findManyCursorConnection as jest.Mock).mockResolvedValue(mockConnection);
    });

    it('should return paginated contents with no expand', async () => {
      const result = await service.listContents('env-id', undefined, 10);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        id: mockContent.id,
        object: 'content',
        type: mockContent.type,
        editedVersionId: mockContent.editedVersionId,
        publishedVersionId: mockContent.publishedVersionId,
        updatedAt: mockContent.updatedAt.toISOString(),
        createdAt: mockContent.createdAt.toISOString(),
      });
    });

    it('should throw error when limit is invalid', async () => {
      // No need to mock findManyCursorConnection as it should not be called
      const result = service.listContents('env-id', undefined, 0);

      await expect(result).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.INVALID_LIMIT.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.CONTENT.INVALID_LIMIT.code,
        ),
      );

      expect(cursorPagination.findManyCursorConnection).not.toHaveBeenCalled();
    });

    it('should throw error when cursor is invalid', async () => {
      // Mock the function to return empty edges for invalid cursor
      (cursorPagination.findManyCursorConnection as jest.Mock).mockResolvedValue({
        edges: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      });

      const result = service.listContents('env-id', 'invalid-cursor', 10);

      await expect(result).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.INVALID_CURSOR.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.CONTENT.INVALID_CURSOR.code,
        ),
      );
    });
  });
});
