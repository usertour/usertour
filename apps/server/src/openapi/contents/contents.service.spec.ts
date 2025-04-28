import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentsService } from './contents.service';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { ExpandType } from './contents.dto';
import { ContentsService } from '@/contents/contents.service';

describe('OpenAPIContentsService', () => {
  let service: OpenAPIContentsService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockContentsService = {
    getContentWithRelations: jest.fn(),
    listContentsWithRelations: jest.fn(),
    getContentVersionWithRelations: jest.fn(),
    listContentVersionsWithRelations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIContentsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ContentsService,
          useValue: mockContentsService,
        },
      ],
    }).compile();

    service = module.get<OpenAPIContentsService>(OpenAPIContentsService);
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

      mockContentsService.getContentWithRelations.mockResolvedValue(mockContent);

      const result = await service.getContent('test-id', 'env-id');

      expect(result).toEqual({
        id: 'test-id',
        object: 'content',
        type: 'flow',
        editedVersionId: 'version-1',
        publishedVersionId: null,
        editedVersion: undefined,
        publishedVersion: undefined,
        updatedAt: mockContent.updatedAt.toISOString(),
        createdAt: mockContent.createdAt.toISOString(),
      });
      expect(mockContentsService.getContentWithRelations).toHaveBeenCalledWith(
        'test-id',
        'env-id',
        {
          editedVersion: false,
          publishedVersion: false,
        },
      );
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

      mockContentsService.getContentWithRelations.mockResolvedValue(mockContent);

      const result = await service.getContent('test-id', 'env-id', [ExpandType.PUBLISHED_VERSION]);

      expect(result).toEqual({
        id: 'test-id',
        object: 'content',
        type: 'flow',
        editedVersionId: 'version-1',
        publishedVersionId: 'version-2',
        editedVersion: undefined,
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
      expect(mockContentsService.getContentWithRelations).toHaveBeenCalledWith(
        'test-id',
        'env-id',
        {
          editedVersion: false,
          publishedVersion: true,
        },
      );
    });

    it('should throw error when content not found', async () => {
      mockContentsService.getContentWithRelations.mockResolvedValue(null);

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

      mockContentsService.listContentsWithRelations.mockResolvedValue(mockConnection);

      const result = await service.listContents('env-id', undefined, 10);

      expect(result).toEqual({
        results: mockContents.map((content) => ({
          id: content.id,
          object: 'content',
          type: 'flow',
          editedVersionId: 'version-1',
          publishedVersionId: null,
          editedVersion: undefined,
          publishedVersion: undefined,
          updatedAt: content.updatedAt.toISOString(),
          createdAt: content.createdAt.toISOString(),
        })),
        next: null,
        previous: null,
      });
      expect(mockContentsService.listContentsWithRelations).toHaveBeenCalledWith(
        'env-id',
        { first: 10 },
        {
          editedVersion: false,
          publishedVersion: false,
        },
      );
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
        content: {},
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      mockContentsService.getContentVersionWithRelations.mockResolvedValue(mockVersion);

      const result = await service.getContentVersion('version-1', 'env-id');

      expect(result).toEqual({
        id: 'version-1',
        object: 'content_version',
        number: 1,
        questions: [],
        updatedAt: mockVersion.updatedAt.toISOString(),
        createdAt: mockVersion.createdAt.toISOString(),
      });
      expect(mockContentsService.getContentVersionWithRelations).toHaveBeenCalledWith(
        'version-1',
        'env-id',
        {
          content: true,
        },
      );
    });

    it('should throw error when version not found', async () => {
      mockContentsService.getContentVersionWithRelations.mockResolvedValue(null);

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
          content: {},
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

      mockContentsService.listContentVersionsWithRelations.mockResolvedValue(mockConnection);

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
        next: 'http://localhost:3000/v1/content_versions?cursor=version-1&limit=10',
        previous: null,
      });
      expect(mockContentsService.listContentVersionsWithRelations).toHaveBeenCalledWith(
        'env-id',
        { first: 10 },
        { content: true },
      );
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
