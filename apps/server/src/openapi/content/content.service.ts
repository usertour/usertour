import { Injectable, Logger } from '@nestjs/common';
import { Content, ContentVersion } from '../models/content.model';
import { ConfigService } from '@nestjs/config';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { ExpandType } from './content.dto';
import { PrismaService } from 'nestjs-prisma';
import { Prisma } from '@prisma/client';

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
export class OpenAPIContentService {
  private readonly logger = new Logger(OpenAPIContentService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getContent(id: string, environmentId: string, expand?: ExpandType[]): Promise<Content> {
    const content = await this.prisma.content.findFirst({
      where: {
        id,
        environmentId,
      },
      include: {
        editedVersion: expand?.includes(ExpandType.EDITED_VERSION),
        publishedVersion: expand?.includes(ExpandType.PUBLISHED_VERSION),
      },
    });

    if (!content) {
      throw new OpenAPIException(
        OpenAPIErrors.CONTENT.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.CONTENT.NOT_FOUND.code,
      );
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
    const pageSize = Number(limit);
    if (Number.isNaN(pageSize) || pageSize < 1) {
      throw new OpenAPIException(
        OpenAPIErrors.CONTENT.INVALID_LIMIT.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.CONTENT.INVALID_LIMIT.code,
      );
    }

    this.logger.debug(
      `Listing contents with environmentId: ${environmentId}, cursor: ${cursor}, limit: ${pageSize}`,
    );

    const apiUrl = this.configService.get<string>('app.apiUrl');
    const baseQuery = {
      where: { environmentId },
      include: {
        editedVersion: expand?.includes(ExpandType.EDITED_VERSION),
        publishedVersion: expand?.includes(ExpandType.PUBLISHED_VERSION),
      },
    };

    // Get the previous page's last cursor if we're not on the first page
    let previousPage = null;
    if (cursor) {
      try {
        previousPage = await findManyCursorConnection(
          (args) => this.prisma.content.findMany({ ...baseQuery, ...args }),
          () => this.prisma.content.count({ where: { environmentId } }),
          { last: pageSize, before: cursor },
        );
      } catch (error) {
        this.logger.warn(`Failed to get previous page: ${error.message}`);
        throw new OpenAPIException(
          OpenAPIErrors.CONTENT.INVALID_CURSOR_PREVIOUS.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.CONTENT.INVALID_CURSOR_PREVIOUS.code,
        );
      }
    }

    let connection: any;
    try {
      connection = await findManyCursorConnection(
        (args) => this.prisma.content.findMany({ ...baseQuery, ...args }),
        () => this.prisma.content.count({ where: { environmentId } }),
        { first: pageSize, after: cursor },
      );
    } catch (error) {
      this.logger.error(`Failed to get current page: ${error.message}`);
      throw new OpenAPIException(
        OpenAPIErrors.CONTENT.INVALID_CURSOR.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.CONTENT.INVALID_CURSOR.code,
      );
    }

    // If we got no results and there was a cursor, it means the cursor was invalid
    if (!connection.edges.length && cursor) {
      throw new OpenAPIException(
        OpenAPIErrors.CONTENT.INVALID_CURSOR.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.CONTENT.INVALID_CURSOR.code,
      );
    }

    return {
      results: connection.edges.map((edge) => this.mapPrismaContentToApiContent(edge.node, expand)),
      next: connection.pageInfo.hasNextPage
        ? `${apiUrl}/v1/contents?cursor=${connection.pageInfo.endCursor}`
        : null,
      previous:
        previousPage?.edges.length > 0
          ? `${apiUrl}/v1/contents?cursor=${previousPage.edges[previousPage.edges.length - 1].cursor}`
          : null,
    };
  }

  private mapPrismaContentToApiContent(
    content: ContentWithVersions,
    expand?: ExpandType[],
  ): Content {
    return {
      id: content.id,
      object: 'content',
      type: content.type,
      editedVersionId: content.editedVersionId,
      editedVersion:
        expand?.includes(ExpandType.EDITED_VERSION) && content.editedVersion
          ? {
              id: content.editedVersion.id,
              object: 'content_version',
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
              object: 'content_version',
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
    const version = await this.prisma.version.findFirst({
      where: {
        id,
        content: {
          environmentId,
        },
      },
      include: {
        content: true,
      },
    });

    if (!version) {
      throw new OpenAPIException(
        OpenAPIErrors.CONTENT.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.CONTENT.NOT_FOUND.code,
      );
    }

    return this.mapPrismaVersionToApiVersion(version);
  }

  async listContentVersions(
    environmentId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    // Validate limit
    const pageSize = Number(limit);
    if (Number.isNaN(pageSize) || pageSize < 1) {
      throw new OpenAPIException(
        OpenAPIErrors.CONTENT.INVALID_LIMIT.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.CONTENT.INVALID_LIMIT.code,
      );
    }

    this.logger.debug(
      `Listing content versions with environmentId: ${environmentId}, cursor: ${cursor}, limit: ${pageSize}`,
    );

    const apiUrl = this.configService.get<string>('app.apiUrl');
    const baseQuery = {
      where: {
        content: {
          environmentId,
        },
      },
      include: {
        content: true,
      },
    };

    // Get the previous page's last cursor if we're not on the first page
    let previousPage = null;
    if (cursor) {
      try {
        previousPage = await findManyCursorConnection(
          (args) => this.prisma.version.findMany({ ...baseQuery, ...args }),
          () => this.prisma.version.count({ where: baseQuery.where }),
          { last: pageSize, before: cursor },
        );
      } catch (error) {
        this.logger.warn(`Failed to get previous page: ${error.message}`);
        throw new OpenAPIException(
          OpenAPIErrors.CONTENT.INVALID_CURSOR_PREVIOUS.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.CONTENT.INVALID_CURSOR_PREVIOUS.code,
        );
      }
    }

    let connection: any;
    try {
      connection = await findManyCursorConnection(
        (args) => this.prisma.version.findMany({ ...baseQuery, ...args }),
        () => this.prisma.version.count({ where: baseQuery.where }),
        { first: pageSize, after: cursor },
      );
    } catch (error) {
      this.logger.error(`Failed to get current page: ${error.message}`);
      throw new OpenAPIException(
        OpenAPIErrors.CONTENT.INVALID_CURSOR.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.CONTENT.INVALID_CURSOR.code,
      );
    }

    // If we got no results and there was a cursor, it means the cursor was invalid
    if (!connection.edges.length && cursor) {
      throw new OpenAPIException(
        OpenAPIErrors.CONTENT.INVALID_CURSOR.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.CONTENT.INVALID_CURSOR.code,
      );
    }

    return {
      results: connection.edges.map((edge) => this.mapPrismaVersionToApiVersion(edge.node)),
      next: connection.pageInfo.hasNextPage
        ? `${apiUrl}/v1/content_versions?cursor=${connection.pageInfo.endCursor}`
        : null,
      previous:
        previousPage?.edges.length > 0
          ? `${apiUrl}/v1/content_versions?cursor=${previousPage.edges[previousPage.edges.length - 1].cursor}`
          : null,
    };
  }

  private mapPrismaVersionToApiVersion(version: VersionWithContent): ContentVersion {
    return {
      id: version.id,
      object: 'content_version',
      number: version.sequence,
      questions: (version.data as any[]) || [],
      updatedAt: version.updatedAt.toISOString(),
      createdAt: version.createdAt.toISOString(),
    };
  }
}
