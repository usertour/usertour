import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentsController } from './contents.controller';
import { OpenAPIContentsService } from './contents.service';
import { Environment } from '@/environments/models/environment.model';
import { ExpandType } from './contents.dto';
import {
  InvalidCursorError,
  InvalidLimitError,
  ContentNotFoundError,
} from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';

describe('OpenAPIContentsController', () => {
  let controller: OpenAPIContentsController;
  let contentService: OpenAPIContentsService;

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
      controllers: [OpenAPIContentsController],
      providers: [
        {
          provide: OpenAPIContentsService,
          useValue: {
            getContent: jest.fn().mockResolvedValue(mockContent),
            listContents: jest.fn().mockResolvedValue(mockPaginatedResponse),
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

    controller = module.get<OpenAPIContentsController>(OpenAPIContentsController);
    contentService = module.get<OpenAPIContentsService>(OpenAPIContentsService);
  });

  describe('getContent', () => {
    it('should return content with no expand', async () => {
      const result = await controller.getContent('test-id', 'env-id');

      expect(result).toEqual(mockContent);
      expect(contentService.getContent).toHaveBeenCalledWith('test-id', 'env-id', undefined);
    });

    it('should return content with expand', async () => {
      const mockContentWithExpand = {
        ...mockContent,
        publishedVersionId: 'version-2',
        editedVersion: mockVersion,
        publishedVersion: { ...mockVersion, id: 'version-2', number: 2 },
      };

      jest.spyOn(contentService, 'getContent').mockResolvedValue(mockContentWithExpand);

      const result = await controller.getContent('test-id', 'env-id', [
        ExpandType.EDITED_VERSION,
        ExpandType.PUBLISHED_VERSION,
      ]);

      expect(result).toEqual(mockContentWithExpand);
      expect(contentService.getContent).toHaveBeenCalledWith('test-id', 'env-id', [
        ExpandType.EDITED_VERSION,
        ExpandType.PUBLISHED_VERSION,
      ]);
    });

    it('should throw error when content not found', async () => {
      jest.spyOn(contentService, 'getContent').mockRejectedValue(new ContentNotFoundError());

      await expect(controller.getContent('non-existent', 'env-id')).rejects.toThrow(
        ContentNotFoundError,
      );
    });
  });

  describe('listContents', () => {
    it('should return paginated contents', async () => {
      const result = await controller.listContents(
        'http://localhost:3000/v1/contents',
        mockEnvironment,
        10,
        undefined,
      );

      expect(contentService.listContents).toHaveBeenCalledWith(
        'http://localhost:3000/v1/contents',
        mockEnvironment,
        undefined,
        10,
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return paginated contents with expand', async () => {
      const result = await controller.listContents(
        'http://localhost:3000/v1/contents',
        mockEnvironment,
        10,
        undefined,
        [ExpandType.EDITED_VERSION, ExpandType.PUBLISHED_VERSION],
      );

      expect(contentService.listContents).toHaveBeenCalledWith(
        'http://localhost:3000/v1/contents',
        mockEnvironment,
        undefined,
        10,
        [ExpandType.EDITED_VERSION, ExpandType.PUBLISHED_VERSION],
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should throw error when limit is negative', async () => {
      jest.spyOn(contentService, 'listContents').mockRejectedValue(new InvalidLimitError());

      await expect(
        controller.listContents(
          'http://localhost:3000/v1/contents',
          mockEnvironment,
          -1,
          undefined,
        ),
      ).rejects.toThrow(InvalidLimitError);
    });
  });

  describe('getContentVersion', () => {
    it('should return content version', async () => {
      const result = await controller.getContentVersion('version-1', 'env-id');

      expect(result).toEqual(mockVersion);
      expect(contentService.getContentVersion).toHaveBeenCalledWith('version-1', 'env-id');
    });

    it('should throw error when version not found', async () => {
      jest.spyOn(contentService, 'getContentVersion').mockRejectedValue(new ContentNotFoundError());

      await expect(controller.getContentVersion('non-existent', 'env-id')).rejects.toThrow(
        ContentNotFoundError,
      );
    });
  });

  describe('listContentVersions', () => {
    it('should return paginated content versions', async () => {
      const result = await controller.listContentVersions(
        'http://localhost:3000/v1/content-versions',
        mockEnvironment,
        10,
        undefined,
      );

      expect(contentService.listContentVersions).toHaveBeenCalledWith(
        'http://localhost:3000/v1/content-versions',
        mockEnvironment,
        undefined,
        10,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should throw error when limit is negative', async () => {
      jest.spyOn(contentService, 'listContentVersions').mockRejectedValue(new InvalidLimitError());

      await expect(
        controller.listContentVersions(
          'http://localhost:3000/v1/content-versions',
          mockEnvironment,
          -1,
          undefined,
        ),
      ).rejects.toThrow(InvalidLimitError);
    });

    it('should throw error when cursor is invalid', async () => {
      jest.spyOn(contentService, 'listContentVersions').mockRejectedValue(new InvalidCursorError());

      await expect(
        controller.listContentVersions(
          'http://localhost:3000/v1/content-versions',
          mockEnvironment,
          10,
          'invalid-cursor',
        ),
      ).rejects.toThrow(InvalidCursorError);
    });
  });
});
