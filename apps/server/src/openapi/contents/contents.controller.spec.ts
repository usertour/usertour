import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentsController } from './contents.controller';
import { OpenAPIContentsService } from './contents.service';
import { Content, ContentVersion } from '../models/content.model';
import { ExpandType } from './contents.dto';
import { OpenAPIException } from '@/common/exceptions/openapi.exception';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { OpenapiGuard } from '../openapi.guard';
import { ConfigService } from '@nestjs/config';
import { ContentsService } from '@/contents/contents.service';
import { PrismaService } from 'nestjs-prisma';

describe('OpenAPIContentsController', () => {
  let controller: OpenAPIContentsController;
  let contentService: OpenAPIContentsService;

  const mockContentService = {
    getContent: jest.fn(),
    listContents: jest.fn(),
    getContentVersion: jest.fn(),
    listContentVersions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPIContentsController],
      providers: [
        {
          provide: OpenAPIContentsService,
          useValue: mockContentService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3000'),
          },
        },
        {
          provide: ContentsService,
          useValue: {
            getContentWithRelations: jest.fn(),
            listContentsWithRelations: jest.fn(),
            getContentVersionWithRelations: jest.fn(),
            listContentVersionsWithRelations: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            // Add any required PrismaService methods here
          },
        },
        OpenapiGuard,
      ],
    }).compile();

    controller = module.get<OpenAPIContentsController>(OpenAPIContentsController);
    contentService = module.get<OpenAPIContentsService>(OpenAPIContentsService);
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

      const result = await controller.listContents('env-id', 10, undefined);

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

      const result = await controller.listContents('env-id', 10, undefined, 'published_version');

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

      await expect(controller.listContents('env-id', -1, undefined)).rejects.toThrow(
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
        next: null,
        previous: null,
      };

      mockContentService.listContentVersions.mockResolvedValue(mockVersions);

      const result = await controller.listContentVersions('env-id', 10, undefined);

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

      await expect(controller.listContentVersions('env-id', -1, undefined)).rejects.toThrow(
        new OpenAPIException(
          OpenAPIErrors.CONTENT.INVALID_LIMIT.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.CONTENT.INVALID_LIMIT.code,
        ),
      );
    });
  });
});
