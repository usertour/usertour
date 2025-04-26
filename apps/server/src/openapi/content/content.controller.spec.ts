import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { Content } from '../models/content.model';
import { ExpandType } from './content.dto';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';

describe('ContentController', () => {
  let controller: ContentController;
  let contentService: ContentService;

  const mockContentService = {
    getContent: jest.fn(),
    listContents: jest.fn(),
  };

  const mockPrismaService = {
    content: {
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
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
        editedVersion: {
          id: 'version-1',
          object: 'contentVersion',
          number: 1,
          questions: [],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        publishedVersionId: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      mockContentService.getContent.mockResolvedValue(mockContent);

      const result = await controller.getContent('test-id', 'env-id', 'edited_version');

      expect(result).toEqual(mockContent);
      expect(contentService.getContent).toHaveBeenCalledWith('test-id', 'env-id', [
        ExpandType.EDITED_VERSION,
      ]);
    });

    it('should throw not found error when content does not exist', async () => {
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
            editedVersion: {
              id: 'version-1',
              object: 'contentVersion',
              number: 1,
              questions: [],
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            publishedVersionId: null,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        next: null,
        previous: null,
      };

      mockContentService.listContents.mockResolvedValue(mockContents);

      const result = await controller.listContents('env-id', undefined, 10, 'edited_version');

      expect(result).toEqual(mockContents);
      expect(contentService.listContents).toHaveBeenCalledWith('env-id', undefined, 10, [
        ExpandType.EDITED_VERSION,
      ]);
    });
  });
});
