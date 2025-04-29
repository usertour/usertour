import { Injectable, Logger } from '@nestjs/common';
import { Content, ContentVersion } from '../models/content.model';
import { ConfigService } from '@nestjs/config';
import { ExpandType } from './contents.dto';
import { Prisma } from '@prisma/client';
import { ContentsService } from '@/contents/contents.service';
import {
  ContentNotFoundError,
  InvalidLimitError,
  InvalidCursorError,
} from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/types/openapi';
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
    // Validate limit
    if (limit < 1) {
      throw new InvalidLimitError();
    }

    this.logger.debug(
      `Listing contents with environmentId: ${environmentId}, cursor: ${cursor}, limit: ${limit}`,
    );

    const apiUrl = this.configService.get<string>('app.apiUrl');

    // Get the current page
    const connection = await this.contentsService.listContentsWithRelations(
      environmentId,
      { first: limit, after: cursor },
      {
        editedVersion: expand?.includes(ExpandType.EDITED_VERSION) ?? false,
        publishedVersion: expand?.includes(ExpandType.PUBLISHED_VERSION) ?? false,
      },
    );

    // If we got no results and there was a cursor, it means the cursor was invalid
    if (!connection.edges.length && cursor) {
      throw new InvalidCursorError();
    }

    // Get the previous page's cursor if we're not on the first page
    let previousUrl = null;
    if (cursor) {
      // We're on a page after the first page, need to query the previous page
      const previousPage = await this.contentsService.listContentsWithRelations(
        environmentId,
        { last: limit, before: connection.edges[0].cursor },
        {}, // No need to include relations when just getting the cursor
      );
      if (previousPage.edges.length > 0) {
        // If previous page has less than limit records, it means it's the first page
        if (previousPage.edges.length < limit) {
          previousUrl = `${apiUrl}/v1/contents?limit=${limit}`;
        } else {
          // If previous page has exactly limit records, we need to check if it's the first page
          const firstPage = await this.contentsService.listContentsWithRelations(
            environmentId,
            { first: limit },
            {}, // No need to include relations when just getting the cursor
          );
          // If the first page's first cursor matches the previous page's first cursor,
          // it means the previous page is the first page
          if (firstPage.edges[0].cursor === previousPage.edges[0].cursor) {
            previousUrl = `${apiUrl}/v1/contents?limit=${limit}`;
          } else {
            previousUrl = `${apiUrl}/v1/contents?cursor=${previousPage.edges[0].cursor}&limit=${limit}`;
          }
        }
      }
    }

    return {
      results: connection.edges.map((edge) => this.mapPrismaContentToApiContent(edge.node, expand)),
      next: connection.pageInfo.hasNextPage
        ? `${apiUrl}/v1/contents?cursor=${connection.pageInfo.endCursor}&limit=${limit}`
        : null,
      previous: previousUrl,
    };
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
    // Validate limit
    if (limit < 1) {
      throw new InvalidLimitError();
    }

    this.logger.debug(
      `Listing content versions with environmentId: ${environmentId}, cursor: ${cursor}, limit: ${limit}`,
    );

    const apiUrl = this.configService.get<string>('app.apiUrl');

    // Get the current page
    const connection = await this.contentsService.listContentVersionsWithRelations(
      environmentId,
      { first: limit, after: cursor },
      { content: true },
    );

    // If we got no results and there was a cursor, it means the cursor was invalid
    if (!connection.edges.length && cursor) {
      throw new InvalidCursorError();
    }

    // Get the previous page's cursor if we're not on the first page
    let previousUrl = null;
    if (cursor) {
      // We're on a page after the first page, need to query the previous page
      const previousPage = await this.contentsService.listContentVersionsWithRelations(
        environmentId,
        { last: limit, before: connection.edges[0].cursor },
        {}, // No need to include relations when just getting the cursor
      );
      if (previousPage.edges.length > 0) {
        // If previous page has less than limit records, it means it's the first page
        if (previousPage.edges.length < limit) {
          previousUrl = `${apiUrl}/v1/content_versions?limit=${limit}`;
        } else {
          // If previous page has exactly limit records, we need to check if it's the first page
          const firstPage = await this.contentsService.listContentVersionsWithRelations(
            environmentId,
            { first: limit },
            {}, // No need to include relations when just getting the cursor
          );
          // If the first page's first cursor matches the previous page's first cursor,
          // it means the previous page is the first page
          if (firstPage.edges[0].cursor === previousPage.edges[0].cursor) {
            previousUrl = `${apiUrl}/v1/content_versions?limit=${limit}`;
          } else {
            previousUrl = `${apiUrl}/v1/content_versions?cursor=${previousPage.edges[0].cursor}&limit=${limit}`;
          }
        }
      }
    }

    return {
      results: connection.edges.map((edge) => this.mapPrismaVersionToApiVersion(edge.node)),
      next: connection.pageInfo.hasNextPage
        ? `${apiUrl}/v1/content_versions?cursor=${connection.pageInfo.endCursor}&limit=${limit}`
        : null,
      previous: previousUrl,
    };
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
