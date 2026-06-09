import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ContentNotFoundError } from '@/common/errors/errors';
import { ContentService } from '@/content/content.service';

import { ApiObjectType } from '../shared/object-type';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import {
  Content,
  ContentExpand,
  ContentVersion,
  GetContentQuery,
  ListContentQuery,
} from './content.schema';

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * v2 content handler. Publishing is per-environment, so the response exposes
 * `environments[]` instead of the deprecated single publishedVersionId — the one
 * intentional shape change vs v1. Depends on the domain {@link ContentService}.
 */
@Injectable()
export class ApiContentService {
  constructor(private readonly content: ContentService) {}

  async list(
    requestUrl: string,
    projectId: string,
    query: ListContentQuery,
  ): Promise<{ results: Content[]; next: string | null; previous: string | null }> {
    const { limit, cursor, type } = query;
    const expand = toArray<ContentExpand>(query.expand);
    const orderBy = parseOrderBy(
      toArray(query.orderBy).length ? toArray(query.orderBy) : ['createdAt'],
    );

    return paginate({
      requestUrl,
      cursor,
      limit,
      query: { ...(type ? { type } : {}), ...(expand.length ? { expand } : {}) },
      fetch: (params) =>
        this.content.listContentWithRelations(
          projectId,
          params,
          this.include(expand),
          orderBy,
          type,
        ),
      map: (node) => this.map(node, expand),
    });
  }

  async get(id: string, projectId: string, query: GetContentQuery): Promise<Content> {
    const expand = toArray<ContentExpand>(query.expand);
    const node = await this.content.findContentWithRelations(id, projectId, this.include(expand));
    if (!node) {
      throw new ContentNotFoundError();
    }
    return this.map(node, expand);
  }

  // v2 include: editedVersion + the per-environment publish rows; the nested
  // published version object is only loaded when the publishedVersion expand is set.
  private include(expand: ContentExpand[]): Prisma.ContentInclude {
    return {
      editedVersion: expand.includes('editedVersion'),
      contentOnEnvironments: {
        include: { publishedVersion: expand.includes('publishedVersion') },
      },
    };
  }

  private mapVersion(version: {
    id: string;
    sequence: number;
    updatedAt: Date;
    createdAt: Date;
  }): ContentVersion {
    return {
      id: version.id,
      object: ApiObjectType.CONTENT_VERSION,
      number: version.sequence,
      questions: [],
      updatedAt: version.updatedAt.toISOString(),
      createdAt: version.createdAt.toISOString(),
    };
  }

  // The generic include erases relation types, so the node is untyped here.
  private map(node: any, expand: ContentExpand[]): Content {
    return {
      id: node.id,
      object: ApiObjectType.CONTENT,
      name: node.name,
      type: node.type,
      editedVersionId: node.editedVersionId,
      editedVersion:
        expand.includes('editedVersion') && node.editedVersion
          ? this.mapVersion(node.editedVersion)
          : undefined,
      environments: (node.contentOnEnvironments ?? []).map((coe: any) => ({
        environmentId: coe.environmentId,
        published: coe.published,
        publishedVersionId: coe.publishedVersionId,
        publishedAt: coe.publishedAt.toISOString(),
        publishedVersion:
          expand.includes('publishedVersion') && coe.publishedVersion
            ? this.mapVersion(coe.publishedVersion)
            : undefined,
      })),
      updatedAt: node.updatedAt.toISOString(),
      createdAt: node.createdAt.toISOString(),
    };
  }
}
