import { Test, TestingModule } from '@nestjs/testing';
import { OpenAPIContentsService } from './contents.service';
import { ConfigService } from '@nestjs/config';
import { ExpandType } from './contents.dto';
import { ContentsService } from '@/contents/contents.service';
import { ContentNotFoundError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { Environment } from '@/environments/models/environment.model';
import { InvalidCursorError, InvalidLimitError } from '@/common/errors/errors';

describe('OpenAPIContentsService', () => {
  let service: OpenAPIContentsService;
  let contentsService: ContentsService;

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
    type: 'flow',
    editedVersionId: 'version-1',
    publishedVersionId: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  const mockVersion = {
    id: 'version-1',
    sequence: 1,
    data: [],
    content: {},
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  const mockContentConnection = {
    edges: [
      {
        node: mockContent,
        cursor: 'cursor1',
      },
    ],
    nodes: [mockContent],
    totalCount: 1,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: 'cursor1',
      endCursor: 'cursor1',
    },
  };

  const mockVersionConnection = {
    edges: [
      {
        node: mockVersion,
        cursor: 'cursor1',
      },
    ],
    nodes: [mockVersion],
    totalCount: 1,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: 'cursor1',
      endCursor: 'cursor1',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAPIContentsService,
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
            listContentsWithRelations: jest.fn().mockResolvedValue(mockContentConnection),
            getContentVersionWithRelations: jest.fn(),
            listContentVersionsWithRelations: jest.fn().mockResolvedValue(mockVersionConnection),
          },
        },
      ],
    }).compile();

    service = module.get<OpenAPIContentsService>(OpenAPIContentsService);
    contentsService = module.get<ContentsService>(ContentsService);
  });

  describe('getContent', () => {
    it('should return content with no expand', async () => {
      (contentsService.getContentWithRelations as jest.Mock).mockResolvedValue(mockContent);

      const result = await service.getContent('test-id', 'env-id');

      expect(result).toEqual({
        id: mockContent.id,
        object: OpenApiObjectType.CONTENT,
        type: mockContent.type,
        editedVersionId: mockContent.editedVersionId,
        publishedVersionId: mockContent.publishedVersionId,
        editedVersion: undefined,
        publishedVersion: undefined,
        updatedAt: mockContent.updatedAt.toISOString(),
        createdAt: mockContent.createdAt.toISOString(),
      });
      expect(contentsService.getContentWithRelations).toHaveBeenCalledWith('test-id', 'env-id', {
        editedVersion: false,
        publishedVersion: false,
      });
    });

    it('should return content with expand', async () => {
      const mockContentWithExpand = {
        ...mockContent,
        publishedVersionId: 'version-2',
        editedVersion: mockVersion,
        publishedVersion: { ...mockVersion, id: 'version-2', sequence: 2 },
      };

      (contentsService.getContentWithRelations as jest.Mock).mockResolvedValue(
        mockContentWithExpand,
      );

      const result = await service.getContent('test-id', 'env-id', [ExpandType.PUBLISHED_VERSION]);

      expect(result).toEqual({
        id: mockContent.id,
        object: OpenApiObjectType.CONTENT,
        type: mockContent.type,
        editedVersionId: mockContent.editedVersionId,
        publishedVersionId: 'version-2',
        editedVersion: undefined,
        publishedVersion: {
          id: 'version-2',
          object: OpenApiObjectType.CONTENT_VERSION,
          number: 2,
          questions: mockVersion.data,
          updatedAt: mockVersion.updatedAt.toISOString(),
          createdAt: mockVersion.createdAt.toISOString(),
        },
        updatedAt: mockContent.updatedAt.toISOString(),
        createdAt: mockContent.createdAt.toISOString(),
      });
      expect(contentsService.getContentWithRelations).toHaveBeenCalledWith('test-id', 'env-id', {
        editedVersion: false,
        publishedVersion: true,
      });
    });

    it('should throw error when content not found', async () => {
      (contentsService.getContentWithRelations as jest.Mock).mockResolvedValue(null);

      await expect(service.getContent('non-existent', 'env-id')).rejects.toThrow(
        ContentNotFoundError,
      );
    });
  });

  describe('listContents', () => {
    it('should return paginated contents', async () => {
      const result = await service.listContents(
        'http://localhost:3000/v1/contents',
        mockEnvironment,
      );

      expect(contentsService.listContentsWithRelations).toHaveBeenCalledWith(
        mockEnvironment.id,
        { first: 20, after: undefined },
        {
          editedVersion: false,
          publishedVersion: false,
        },
      );
      expect(result).toEqual({
        results: [
          {
            id: mockContent.id,
            object: OpenApiObjectType.CONTENT,
            type: mockContent.type,
            editedVersionId: mockContent.editedVersionId,
            publishedVersionId: mockContent.publishedVersionId,
            editedVersion: undefined,
            publishedVersion: undefined,
            updatedAt: mockContent.updatedAt.toISOString(),
            createdAt: mockContent.createdAt.toISOString(),
          },
        ],
        next: null,
        previous: null,
      });
    });

    it('should throw error when limit is negative', async () => {
      await expect(
        service.listContents('http://localhost:3000/v1/contents', mockEnvironment, undefined, -1),
      ).rejects.toThrow(InvalidLimitError);
    });
  });

  describe('getContentVersion', () => {
    it('should return content version', async () => {
      (contentsService.getContentVersionWithRelations as jest.Mock).mockResolvedValue(mockVersion);

      const result = await service.getContentVersion('version-1', 'env-id');

      expect(result).toEqual({
        id: mockVersion.id,
        object: OpenApiObjectType.CONTENT_VERSION,
        number: mockVersion.sequence,
        questions: mockVersion.data,
        updatedAt: mockVersion.updatedAt.toISOString(),
        createdAt: mockVersion.createdAt.toISOString(),
      });
      expect(contentsService.getContentVersionWithRelations).toHaveBeenCalledWith(
        'version-1',
        'env-id',
        {
          content: true,
        },
      );
    });

    it('should throw error when version not found', async () => {
      (contentsService.getContentVersionWithRelations as jest.Mock).mockResolvedValue(null);

      await expect(service.getContentVersion('non-existent', 'env-id')).rejects.toThrow(
        ContentNotFoundError,
      );
    });
  });

  describe('listContentVersions', () => {
    it('should return paginated content versions', async () => {
      const result = await service.listContentVersions(
        'http://localhost:3000/v1/content-versions',
        mockEnvironment,
      );

      expect(contentsService.listContentVersionsWithRelations).toHaveBeenCalledWith(
        mockEnvironment.id,
        { first: 20, after: undefined },
        {
          content: true,
        },
      );
      expect(result).toEqual({
        results: [
          {
            id: mockVersion.id,
            object: OpenApiObjectType.CONTENT_VERSION,
            number: mockVersion.sequence,
            questions: mockVersion.data,
            updatedAt: mockVersion.updatedAt.toISOString(),
            createdAt: mockVersion.createdAt.toISOString(),
          },
        ],
        next: null,
        previous: null,
      });
    });

    it('should throw error when limit is negative', async () => {
      await expect(
        service.listContentVersions(
          'http://localhost:3000/v1/content-versions',
          mockEnvironment,
          undefined,
          -1,
        ),
      ).rejects.toThrow(InvalidLimitError);
    });

    it('should throw error when cursor is invalid', async () => {
      jest.spyOn(contentsService, 'listContentVersionsWithRelations').mockResolvedValue({
        edges: [],
        nodes: [],
        totalCount: 0,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      });

      await expect(
        service.listContentVersions(
          'http://localhost:3000/v1/content-versions',
          mockEnvironment,
          'invalid-cursor',
        ),
      ).rejects.toThrow(InvalidCursorError);
    });
  });
});
