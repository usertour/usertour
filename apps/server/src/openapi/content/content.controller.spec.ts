import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentController } from './content.controller';
import { OpenAPIContentService } from './content.service';
import { Environment } from '@/environments/models/environment.model';
import { ContentExpandType } from './content.dto';
import {
  InvalidCursorError,
  InvalidLimitError,
  ContentNotFoundError,
} from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { ContentOrderByType } from './content.dto';

describe('OpenAPIContentController', () => {
  let controller: OpenAPIContentController;
  let contentService: OpenAPIContentService;

  const mockEnvironment: Environment = {
    id: 'env-id',
    projectId: 'project1',
    name: 'Test Environment',
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContent = {
    id: 'test-id',
    object: OpenApiObjectType.CONTENT,
    name: 'Test Content',
    type: 'flow',
    editedVersionId: 'version-1',
    publishedVersionId: null,
    editedVersion: undefined,
    publishedVersion: undefined,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const mockVersion = {
    id: 'version-1',
    object: OpenApiObjectType.CONTENT_VERSION,
    number: 1,
    questions: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const mockPaginatedResponse = {
    results: [],
    next: null,
    previous: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAPIContentController],
      providers: [
        {
          provide: OpenAPIContentService,
          useValue: {
            getContent: jest.fn().mockResolvedValue(mockContent),
            listContent: jest.fn().mockResolvedValue(mockPaginatedResponse),
            getContentVersion: jest.fn().mockResolvedValue(mockVersion),
            listContentVersions: jest.fn().mockResolvedValue(mockPaginatedResponse),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            accessToken: {
              findUnique: jest.fn().mockResolvedValue({
                isActive: true,
                environment: mockEnvironment,
              }),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://docs.usertour.com'),
          },
        },
      ],
    }).compile();

    controller = module.get<OpenAPIContentController>(OpenAPIContentController);
    contentService = module.get<OpenAPIContentService>(OpenAPIContentService);
  });

  describe('getContent', () => {
    it('should return content with no expand', async () => {
      const mockContent = {
        id: 'test-id',
        object: OpenApiObjectType.CONTENT,
        type: 'flow',
        editedVersionId: 'version-1',
        publishedVersionId: 'version-2',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      (contentService.getContent as jest.Mock).mockResolvedValue(mockContent);

      const result = await controller.getContent('test-id', 'env-id', {});

      expect(result).toEqual(mockContent);
      expect(contentService.getContent).toHaveBeenCalledWith('test-id', 'env-id', {});
    });

    it('should return content with expand', async () => {
      const mockContentWithExpand = {
        id: 'test-id',
        object: OpenApiObjectType.CONTENT,
        type: 'flow',
        editedVersionId: 'version-1',
        publishedVersionId: 'version-2',
        editedVersion: {
          id: 'version-1',
          object: OpenApiObjectType.CONTENT_VERSION,
          number: 1,
          questions: [],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        publishedVersion: {
          id: 'version-2',
          object: OpenApiObjectType.CONTENT_VERSION,
          number: 2,
          questions: [],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      (contentService.getContent as jest.Mock).mockResolvedValue(mockContentWithExpand);

      const result = await controller.getContent('test-id', 'env-id', {
        expand: [ContentExpandType.EDITED_VERSION, ContentExpandType.PUBLISHED_VERSION],
      });

      expect(result).toEqual(mockContentWithExpand);
      expect(contentService.getContent).toHaveBeenCalledWith('test-id', 'env-id', {
        expand: [ContentExpandType.EDITED_VERSION, ContentExpandType.PUBLISHED_VERSION],
      });
    });

    it('should throw error when content not found', async () => {
      jest.spyOn(contentService, 'getContent').mockRejectedValue(new ContentNotFoundError());

      await expect(
        controller.getContent('non-existent', 'env-id', {
          expand: [ContentExpandType.EDITED_VERSION, ContentExpandType.PUBLISHED_VERSION],
        }),
      ).rejects.toThrow(ContentNotFoundError);
    });
  });

  describe('listContent', () => {
    it('should return paginated content', async () => {
      const result = await controller.listContent(
        'http://localhost:3000/v1/content',
        mockEnvironment,
        {
          limit: 10,
        },
      );

      expect(contentService.listContent).toHaveBeenCalledWith(
        'http://localhost:3000/v1/content',
        mockEnvironment,
        {
          limit: 10,
        },
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return paginated content with expand', async () => {
      const result = await controller.listContent(
        'http://localhost:3000/v1/content',
        mockEnvironment,
        {
          limit: 10,
          orderBy: [ContentOrderByType.CREATED_AT],
        },
      );

      expect(contentService.listContent).toHaveBeenCalledWith(
        'http://localhost:3000/v1/content',
        mockEnvironment,
        {
          limit: 10,
          orderBy: [ContentOrderByType.CREATED_AT],
        },
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should throw error when limit is negative', async () => {
      jest.spyOn(contentService, 'listContent').mockRejectedValue(new InvalidLimitError());

      await expect(
        controller.listContent('http://localhost:3000/v1/content', mockEnvironment, {
          limit: -1,
        }),
      ).rejects.toThrow(InvalidLimitError);
    });
  });

  describe('getContentVersion', () => {
    it('should return content version', async () => {
      const result = await controller.getContentVersion('version-1', 'env-id', {});

      expect(result).toEqual(mockVersion);
      expect(contentService.getContentVersion).toHaveBeenCalledWith('version-1', 'env-id', {});
    });

    it('should throw error when version not found', async () => {
      jest.spyOn(contentService, 'getContentVersion').mockRejectedValue(new ContentNotFoundError());

      await expect(controller.getContentVersion('non-existent', 'env-id', {})).rejects.toThrow(
        ContentNotFoundError,
      );
    });
  });

  describe('listContentVersions', () => {
    it('should return paginated content versions', async () => {
      const result = await controller.listContentVersions(
        'http://localhost:3000/v1/content-versions',
        mockEnvironment,
        {
          contentId: 'content-1',
          limit: 10,
        },
      );

      expect(contentService.listContentVersions).toHaveBeenCalledWith(
        'http://localhost:3000/v1/content-versions',
        mockEnvironment,
        {
          contentId: 'content-1',
          limit: 10,
        },
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should throw error when limit is negative', async () => {
      jest.spyOn(contentService, 'listContentVersions').mockRejectedValue(new InvalidLimitError());

      await expect(
        controller.listContentVersions(
          'http://localhost:3000/v1/content-versions',
          mockEnvironment,
          {
            contentId: 'content-1',
            limit: -1,
          },
        ),
      ).rejects.toThrow(InvalidLimitError);
    });

    it('should throw error when cursor is invalid', async () => {
      jest.spyOn(contentService, 'listContentVersions').mockRejectedValue(new InvalidCursorError());

      await expect(
        controller.listContentVersions(
          'http://localhost:3000/v1/content-versions',
          mockEnvironment,
          {
            contentId: 'content-1',
            limit: 10,
            cursor: 'invalid-cursor',
          },
        ),
      ).rejects.toThrow(InvalidCursorError);
    });
  });
});
