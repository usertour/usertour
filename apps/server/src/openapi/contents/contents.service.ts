import { Injectable, Logger } from '@nestjs/common';
import { Content, ContentVersion } from '../models/content.model';
import { ConfigService } from '@nestjs/config';
import { ExpandType } from './contents.dto';
import { Prisma } from '@prisma/client';
import { ContentsService } from '@/contents/contents.service';
import { ContentNotFoundError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/types/openapi';
import { paginate, PaginationConnection } from '@/common/openapi/pagination';

type ContentWithVersions = Prisma.ContentGetPayload<{
  include: {
    editedVersion: true;
    publishedVersion: true;
  };
}>;

type VersionWithContent = Prisma.VersionGetPayload<{
  include: {
    content: true;
  };
}>;

@Injectable()
export class OpenAPIContentsService {
  private readonly logger = new Logger(OpenAPIContentsService.name);

  constructor(
    private configService: ConfigService,
    private contentsService: ContentsService,
  ) {}

  async getContent(id: string, environmentId: string, expand?: ExpandType[]): Promise<Content> {
    const content = await this.contentsService.getContentWithRelations(id, environmentId, {
      editedVersion: expand?.includes(ExpandType.EDITED_VERSION) ?? false,
      publishedVersion: expand?.includes(ExpandType.PUBLISHED_VERSION) ?? false,
    });

    if (!content) {
      throw new ContentNotFoundError();
    }

    return this.mapPrismaContentToApiContent(content, expand);
  }

  async listContents(
    environmentId: string,
    cursor?: string,
    limit = 20,
    expand?: ExpandType[],
  ): Promise<{ results: Content[]; next: string | null; previous: string | null }> {
    const apiUrl = this.configService.get<string>('app.apiUrl');

    const include = {
      editedVersion: expand?.includes(ExpandType.EDITED_VERSION) ?? false,
      publishedVersion: expand?.includes(ExpandType.PUBLISHED_VERSION) ?? false,
    };

    return paginate(
      apiUrl,
      'contents',
      environmentId,
      cursor,
      limit,
      async (params) =>
        await this.contentsService.listContentsWithRelations(environmentId, params, include),
      (node) => this.mapPrismaContentToApiContent(node, expand),
    );
  }

  private mapPrismaContentToApiContent(
    content: ContentWithVersions,
    expand?: ExpandType[],
  ): Content {
    return {
      id: content.id,
      object: OpenApiObjectType.CONTENT,
      type: content.type,
      editedVersionId: content.editedVersionId,
      editedVersion:
        expand?.includes(ExpandType.EDITED_VERSION) && content.editedVersion
          ? {
              id: content.editedVersion.id,
              object: OpenApiObjectType.VERSION,
              number: content.editedVersion.sequence,
              questions: [],
              updatedAt: content.editedVersion.updatedAt.toISOString(),
              createdAt: content.editedVersion.createdAt.toISOString(),
            }
          : undefined,
      publishedVersionId: content.publishedVersionId,
      publishedVersion:
        expand?.includes(ExpandType.PUBLISHED_VERSION) && content.publishedVersion
          ? {
              id: content.publishedVersion.id,
              object: OpenApiObjectType.VERSION,
              number: content.publishedVersion.sequence,
              questions: [],
              updatedAt: content.publishedVersion.updatedAt.toISOString(),
              createdAt: content.publishedVersion.createdAt.toISOString(),
            }
          : undefined,
      updatedAt: content.updatedAt.toISOString(),
      createdAt: content.createdAt.toISOString(),
    } as Content;
  }

  async getContentVersion(id: string, environmentId: string): Promise<ContentVersion> {
    const version = await this.contentsService.getContentVersionWithRelations(id, environmentId, {
      content: true,
    });

    if (!version) {
      throw new ContentNotFoundError();
    }

    return this.mapPrismaVersionToApiVersion(version);
  }

  async listContentVersions(
    environmentId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    const apiUrl = this.configService.get<string>('app.apiUrl');

    return paginate(
      apiUrl,
      'content_versions',
      environmentId,
      cursor,
      limit,
      async (params) => {
        const result = await this.contentsService.listContentVersionsWithRelations(
          environmentId,
          params,
          {
            content: true,
          },
        );
        return result as unknown as PaginationConnection<VersionWithContent>;
      },
      (node) => this.mapPrismaVersionToApiVersion(node),
    );
  }

  private mapPrismaVersionToApiVersion(version: VersionWithContent): ContentVersion {
    return {
      id: version.id,
      object: OpenApiObjectType.VERSION,
      number: version.sequence,
      questions: (version.data as any[]) || [],
      updatedAt: version.updatedAt.toISOString(),
      createdAt: version.createdAt.toISOString(),
    };
  }
}
