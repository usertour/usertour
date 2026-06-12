import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import { ContentNotFoundError, ParamsError, ValidationError } from '@/common/errors/errors';
import { ContentService } from '@/content/content.service';

import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapContent } from './content.mapper';
import {
  Content,
  ContentExpand,
  CreateContentBody,
  DuplicateContentBody,
  GetContentQuery,
  ListContentQuery,
  UpdateContentBody,
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
  constructor(
    private readonly content: ContentService,
    private readonly prisma: PrismaService,
  ) {}

  /** Create content (+ its initial draft version) in the project's primary environment. */
  async create(projectId: string, body: CreateContentBody): Promise<Content> {
    const environment = await this.primaryEnvironment(projectId);
    const created = await this.content.createContent({
      type: body.type,
      name: body.name,
      buildUrl: body.buildUrl,
      environmentId: environment.id,
    });
    if (!created) {
      throw new ParamsError('Failed to create content');
    }
    return this.get(created.id, projectId, {});
  }

  /** Update content metadata (name / buildUrl). */
  async update(id: string, projectId: string, body: UpdateContentBody): Promise<Content> {
    await this.requireContent(id, projectId);
    await this.content.updateContent(id, { name: body.name, buildUrl: body.buildUrl });
    return this.get(id, projectId, {});
  }

  /** Delete (archive) content. */
  async remove(id: string, projectId: string): Promise<void> {
    await this.requireContent(id, projectId);
    await this.content.deleteContent(id);
  }

  /**
   * Publish a version as the environment's live version (idempotent). Content is
   * project-level, so the target environment is a body parameter (like versionId);
   * we assert it belongs to this project, and that the version belongs to this
   * content. Returns the content with refreshed `environments[]` so the caller
   * sees the new live state in one round-trip.
   */
  async publish(
    id: string,
    projectId: string,
    environmentId: string,
    versionId: string,
  ): Promise<Content> {
    await this.requireContent(id, projectId);
    await this.requireEnvironment(environmentId, projectId);
    const version = await this.content.getContentVersionById(versionId);
    if (!version || version.contentId !== id) {
      throw new ContentNotFoundError();
    }
    await this.content.publishedContentVersion(versionId, environmentId);
    return this.get(id, projectId, {});
  }

  /** Unpublish the content from an environment (clear its live version). */
  async unpublish(id: string, projectId: string, environmentId: string): Promise<Content> {
    await this.requireContent(id, projectId);
    await this.requireEnvironment(environmentId, projectId);
    await this.content.unpublishedContentVersion(id, environmentId);
    return this.get(id, projectId, {});
  }

  /**
   * Duplicate content into a fresh content (copies the edited version's steps /
   * config / data), optionally into another environment. Binds the same domain
   * method the builder uses. Returns the new content.
   */
  async duplicate(id: string, projectId: string, body: DuplicateContentBody): Promise<Content> {
    await this.requireContent(id, projectId);
    if (body.environmentId) {
      await this.requireEnvironment(body.environmentId, projectId);
    }
    const created = await this.content.duplicateContent(id, body.name ?? '', body.environmentId);
    if (!created) {
      throw new ParamsError('Failed to duplicate content');
    }
    return this.get(created.id, projectId, {});
  }

  /** Assert an environment exists in the project (publish/unpublish target, duplicate target). */
  private async requireEnvironment(environmentId: string, projectId: string): Promise<void> {
    const env = await this.prisma.environment.findFirst({
      where: { id: environmentId, projectId, deleted: false },
    });
    if (!env) {
      throw new ValidationError('Environment not found in this project');
    }
  }

  private async requireContent(id: string, projectId: string): Promise<void> {
    const node = await this.content.findContentWithRelations(id, projectId, this.include([]));
    if (!node || (node as { deleted?: boolean }).deleted) {
      throw new ContentNotFoundError();
    }
  }

  private async primaryEnvironment(projectId: string) {
    const env =
      (await this.prisma.environment.findFirst({
        where: { projectId, deleted: false, isPrimary: true },
      })) ?? (await this.prisma.environment.findFirst({ where: { projectId, deleted: false } }));
    if (!env) {
      throw new ParamsError('No environment found for this project');
    }
    return env;
  }

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
    if (!node || (node as { deleted?: boolean }).deleted) {
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
