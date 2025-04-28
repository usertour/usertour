import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentsService } from './contents.service';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { ExpandType } from './contents.dto';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';

jest.mock('@devoxa/prisma-relay-cursor-connection');

describe('OpenAPIContentsService', () => {
  let service: OpenAPIContentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    content: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    version: {
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
        OpenAPIContentsService,
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

    service = module.get<OpenAPIContentsService>(OpenAPIContentsService);
    prismaService = module.get<PrismaService>(PrismaService);
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
        id: 'test-id',
        object: 'content',
        type: 'flow',
        editedVersionId: 'version-1',
        publishedVersionId: null,
        updatedAt: mockContent.updatedAt.toISOString(),
        createdAt: mockContent.createdAt.toISOString(),
      });
      expect(prismaService.content.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'test-id',
          environmentId: 'env-id',
        },
        include: {},
      });
    });

    it('should return content with expand', async () => {
      const mockContent = {
        id: 'test-id',
        type: 'flow',
        editedVersionId: 'version-1',
        publishedVersionId: 'version-2',
        editedVersion: {
          id: 'version-1',
          sequence: 1,
          data: [],
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        publishedVersion: {
          id: 'version-2',
          sequence: 2,
          data: [],
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.content.findFirst.mockResolvedValue(mockContent);

      const result = await service.getContent('test-id', 'env-id', [ExpandType.PUBLISHED_VERSION]);

      expect(result).toEqual({
        id: 'test-id',
        object: 'content',
        type: 'flow',
        editedVersionId: 'version-1',
        publishedVersionId: 'version-2',
        publishedVersion: {
          id: 'version-2',
          object: 'content_version',
          number: 2,
          questions: [],
          updatedAt: mockContent.publishedVersion.updatedAt.toISOString(),
          createdAt: mockContent.publishedVersion.createdAt.toISOString(),
        },
        updatedAt: mockContent.updatedAt.toISOString(),
        createdAt: mockContent.createdAt.toISOString(),
      });
      expect(prismaService.content.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'test-id',
          environmentId: 'env-id',
        },
        include: {
          editedVersion: false,
          publishedVersion: true,
        },
      });
    });

    it('should throw error when content not found', async () => {
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
    it('should return paginated contents with no expand', async () => {
      const mockContents = [
        {
          id: 'test-id-1',
          type: 'flow',
          editedVersionId: 'version-1',
          publishedVersionId: null,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      const mockConnection = {
        edges: mockContents.map((content) => ({
          node: content,
          cursor: content.id,
        })),
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      };

      (findManyCursorConnection as jest.Mock).mockResolvedValue(mockConnection);

      const result = await service.listContents('env-id', undefined, 10);

      expect(result).toEqual({
        results: mockContents.map((content) => ({
          id: content.id,
          object: 'content',
          type: 'flow',
          editedVersionId: 'version-1',
          publishedVersionId: null,
          updatedAt: content.updatedAt.toISOString(),
          createdAt: content.createdAt.toISOString(),
        })),
        next: null,
        previous: null,
      });
    });

    it('should throw error when invalid limit', async () => {
      await expect(service.listContents('env-id', undefined, -1)).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.INVALID_LIMIT.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.CONTENT.INVALID_LIMIT.code,
        ),
      );
    });
  });

  describe('getContentVersion', () => {
    it('should return content version', async () => {
      const mockVersion = {
        id: 'version-1',
        sequence: 1,
        data: [],
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.version.findFirst.mockResolvedValue(mockVersion);

      const result = await service.getContentVersion('version-1', 'env-id');

      expect(result).toEqual({
        id: 'version-1',
        object: 'content_version',
        number: 1,
        questions: [],
        updatedAt: mockVersion.updatedAt.toISOString(),
        createdAt: mockVersion.createdAt.toISOString(),
      });
      expect(prismaService.version.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'version-1',
          content: {
            environmentId: 'env-id',
          },
        },
        include: {
          content: true,
        },
      });
    });

    it('should throw error when version not found', async () => {
      mockPrismaService.version.findFirst.mockResolvedValue(null);

      await expect(service.getContentVersion('non-existent', 'env-id')).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.CONTENT.NOT_FOUND.code,
        ),
      );
    });
  });

  describe('listContentVersions', () => {
    it('should return paginated content versions', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          sequence: 1,
          data: [],
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      const mockConnection = {
        edges: mockVersions.map((version) => ({
          node: version,
          cursor: version.id,
        })),
        pageInfo: {
          hasNextPage: true,
          endCursor: 'version-1',
        },
      };

      (findManyCursorConnection as jest.Mock).mockResolvedValue(mockConnection);

      const result = await service.listContentVersions('env-id', undefined, 10);

      expect(result).toEqual({
        results: mockVersions.map((version) => ({
          id: version.id,
          object: 'content_version',
          number: 1,
          questions: [],
          updatedAt: version.updatedAt.toISOString(),
          createdAt: version.createdAt.toISOString(),
        })),
        next: 'http://localhost:3000/v1/content_versions?cursor=version-1',
        previous: null,
      });
    });

    it('should throw error when invalid limit', async () => {
      await expect(service.listContentVersions('env-id', undefined, -1)).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.INVALID_LIMIT.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.CONTENT.INVALID_LIMIT.code,
        ),
      );
    });
  });
});
