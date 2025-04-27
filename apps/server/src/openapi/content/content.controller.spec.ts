import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { Content, ContentVersion } from '../models/content.model';
import { ExpandType } from './content.dto';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { OpenapiGuard } from '../openapi.guard';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';

describe('ContentController', () => {
  let controller: ContentController;
  let contentService: ContentService;

  const mockContentService = {
    getContent: jest.fn(),
    listContents: jest.fn(),
    getContentVersion: jest.fn(),
    listContentVersions: jest.fn(),
  };

  const mockPrismaService = {
    bizUser: {
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: ContentService,
          useValue: mockContentService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        OpenapiGuard,
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    contentService = module.get<ContentService>(ContentService);
  });

  describe('getContent', () => {
    it('should return content with no expand', async () => {
      const mockContent: Content = {
        id: 'test-id',
        object: 'content',
        type: 'flow',
        editedVersionId: 'version-1',
        publishedVersionId: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      mockContentService.getContent.mockResolvedValue(mockContent);

      const result = await controller.getContent('test-id', 'env-id');

      expect(result).toEqual(mockContent);
      expect(contentService.getContent).toHaveBeenCalledWith('test-id', 'env-id', undefined);
    });

    it('should return content with expand', async () => {
      const mockContent: Content = {
        id: 'test-id',
        object: 'content',
        type: 'flow',
        editedVersionId: 'version-1',
        publishedVersionId: 'version-2',
        editedVersion: {
          id: 'version-1',
          object: 'content_version',
          number: 1,
          questions: [],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        publishedVersion: {
          id: 'version-2',
          object: 'content_version',
          number: 2,
          questions: [],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      mockContentService.getContent.mockResolvedValue(mockContent);

      const result = await controller.getContent('test-id', 'env-id', 'published_version');

      expect(result).toEqual(mockContent);
      expect(contentService.getContent).toHaveBeenCalledWith('test-id', 'env-id', [
        ExpandType.PUBLISHED_VERSION,
      ]);
    });

    it('should throw error when content not found', async () => {
      mockContentService.getContent.mockRejectedValue(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.CONTENT.NOT_FOUND.code,
        ),
      );

      await expect(controller.getContent('non-existent', 'env-id')).rejects.toThrow(
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
      const mockContents = {
        results: [
          {
            id: 'test-id-1',
            object: 'content',
            type: 'flow',
            editedVersionId: 'version-1',
            publishedVersionId: null,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        next: null,
        previous: null,
      };

      mockContentService.listContents.mockResolvedValue(mockContents);

      const result = await controller.listContents('env-id', undefined, 10);

      expect(result).toEqual(mockContents);
      expect(contentService.listContents).toHaveBeenCalledWith('env-id', undefined, 10, undefined);
    });

    it('should return paginated contents with expand', async () => {
      const mockContents = {
        results: [
          {
            id: 'test-id-1',
            object: 'content',
            type: 'flow',
            editedVersionId: 'version-1',
            publishedVersionId: 'version-2',
            editedVersion: {
              id: 'version-1',
              object: 'content_version',
              number: 1,
              questions: [],
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            publishedVersion: {
              id: 'version-2',
              object: 'content_version',
              number: 2,
              questions: [],
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        next: null,
        previous: null,
      };

      mockContentService.listContents.mockResolvedValue(mockContents);

      const result = await controller.listContents('env-id', undefined, 10, 'published_version');

      expect(result).toEqual(mockContents);
      expect(contentService.listContents).toHaveBeenCalledWith('env-id', undefined, 10, [
        ExpandType.PUBLISHED_VERSION,
      ]);
    });

    it('should throw error when invalid limit', async () => {
      mockContentService.listContents.mockRejectedValue(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.INVALID_LIMIT.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.CONTENT.INVALID_LIMIT.code,
        ),
      );

      await expect(controller.listContents('env-id', undefined, -1)).rejects.toThrow(
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
      const mockVersion: ContentVersion = {
        id: 'version-1',
        object: 'content_version',
        number: 1,
        questions: [],
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      mockContentService.getContentVersion.mockResolvedValue(mockVersion);

      const result = await controller.getContentVersion('version-1', 'env-id');

      expect(result).toEqual(mockVersion);
      expect(contentService.getContentVersion).toHaveBeenCalledWith('version-1', 'env-id');
    });

    it('should throw error when version not found', async () => {
      mockContentService.getContentVersion.mockRejectedValue(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.CONTENT.NOT_FOUND.code,
        ),
      );

      await expect(controller.getContentVersion('non-existent', 'env-id')).rejects.toThrow(
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
      const mockVersions = {
        results: [
          {
            id: 'version-1',
            object: 'content_version',
            number: 1,
            questions: [],
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        next: 'http://localhost:3000/v1/content_versions?cursor=version-1',
        previous: null,
      };

      mockContentService.listContentVersions.mockResolvedValue(mockVersions);

      const result = await controller.listContentVersions('env-id', undefined, 10);

      expect(result).toEqual(mockVersions);
      expect(contentService.listContentVersions).toHaveBeenCalledWith('env-id', undefined, 10);
    });

    it('should throw error when invalid limit', async () => {
      mockContentService.listContentVersions.mockRejectedValue(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.INVALID_LIMIT.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.CONTENT.INVALID_LIMIT.code,
        ),
      );

      await expect(controller.listContentVersions('env-id', undefined, -1)).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.INVALID_LIMIT.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.CONTENT.INVALID_LIMIT.code,
        ),
      );
    });
  });
});
