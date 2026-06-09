import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ContentNotFoundError } from '@/common/errors/errors';
import { ContentService } from '@/content/content.service';

import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapContent } from './content.mapper';
import { Content, ContentExpand, GetContentQuery, ListContentQuery } from './content.schema';

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
      map: (node) => mapContent(node, expand),
    });
  }

  async get(id: string, projectId: string, query: GetContentQuery): Promise<Content> {
    const expand = toArray<ContentExpand>(query.expand);
    const node = await this.content.findContentWithRelations(id, projectId, this.include(expand));
    if (!node) {
      throw new ContentNotFoundError();
    }
    return mapContent(node, expand);
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
}
