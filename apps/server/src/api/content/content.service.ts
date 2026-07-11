import { Injectable } from '@nestjs/common';
import { toArray } from '../shared/query';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import type { RulesCondition, Step } from '@usertour/types';

import {
  ContentNotFoundError,
  ContentNotPublishableError,
  ParamsError,
  ValidationError,
} from '@/common/errors/errors';
import { ContentService, type WriteActor } from '@/content/content.service';
import { ApiThemesService } from '../themes/themes.service';

import { loadConditionContext } from '../content-representation/condition-context';
import { requiresTheme, validateVersionUsable } from '../content-representation/usable.validate';
import { defaultVersionData } from '../content-representation/version-data.defaults';
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
    private readonly themes: ApiThemesService,
  ) {}

  /** Create content (+ its initial draft version) in the project's primary environment. */
  async create(projectId: string, body: CreateContentBody): Promise<Content> {
    const environment = await this.primaryEnvironment(projectId);
    // A theme is required for every type that renders UI: without one the SDK
    // can't render the version (it starts, finds nothing renderable, and
    // completes at progress 0). Tracker has no UI, so its theme is optional.
    // The themeId seeds the initial draft version (theme is version-level).
    if (requiresTheme(body.type)) {
      if (!body.themeId) {
        throw new ValidationError(`themeId is required for content type "${body.type}".`);
      }
      await this.themes.requireTheme(body.themeId, projectId);
    } else if (body.themeId) {
      await this.themes.requireTheme(body.themeId, projectId);
    }
    const created = await this.content.createContent({
      type: body.type,
      name: body.name,
      buildUrl: body.buildUrl,
      environmentId: environment.id,
      themeId: body.themeId,
      // Seed the type's default data so a non-flow draft starts complete; a later
      // update_content_version field-merges onto it rather than a bare object.
      data: defaultVersionData(body.type),
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
   * Restore soft-deleted content. Idempotent — restoring content that isn't
   * deleted returns it unchanged (mirrors publish), so agent retries are safe.
   * deleteContent guarantees a deleted content is unpublished everywhere, so it
   * comes back as a clean unpublished draft; publishing again is a separate,
   * explicit call.
   */
  async restore(id: string, projectId: string): Promise<Content> {
    const node = await this.content.findContentWithRelations(id, projectId, this.include([]));
    if (!node) {
      throw new ContentNotFoundError();
    }
    if ((node as { deleted?: boolean }).deleted) {
      await this.content.restoreContent(id);
    }
    return this.get(id, projectId, {});
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
    actor?: WriteActor,
  ): Promise<Content> {
    const content = await this.requireContent(id, projectId);
    await this.requireEnvironment(environmentId, projectId);
    const version = await this.content.getContentVersionById(versionId);
    if (!version || version.contentId !== id) {
      throw new ContentNotFoundError();
    }
    // A version must actually be usable before it can go live. The builder relies
    // on a live preview for this; the API enforces it so agent-authored content
    // can't be published into a silent non-render. `content` is reused from the
    // requireContent fetch above (no second read just for `type`).
    const report = validateVersionUsable({
      type: (content as { type?: string }).type ?? 'flow',
      themeId: version.themeId,
      steps: version.steps as unknown as Step[],
      data: version.data,
      config: version.config as { autoStartRules?: RulesCondition[] } | null,
      conditionContext: await loadConditionContext(this.prisma, projectId),
    });
    if (!report.ok) {
      throw new ContentNotPublishableError(
        `Content is not publishable: ${report.errors
          .map((e) => `${e.path}: ${e.message}`)
          .join('; ')}`,
      );
    }
    await this.content.publishedContentVersion(versionId, environmentId, actor);
    return this.get(id, projectId, {});
  }

  /** Unpublish the content from an environment (clear its live version). */
  async unpublish(
    id: string,
    projectId: string,
    environmentId: string,
    actor?: WriteActor,
  ): Promise<Content> {
    await this.requireContent(id, projectId);
    await this.requireEnvironment(environmentId, projectId);
    await this.content.unpublishedContentVersion(id, environmentId, actor);
    return this.get(id, projectId, {});
  }

  /**
   * Duplicate content into a fresh content (copies the edited version's steps /
   * config / data). A PROJECT-level action: the copy inherits the source's legacy
   * homing column (inert — nothing user-visible reads it) and starts unpublished,
   * so no environment parameter and no env-allowlist check apply here; publish is
   * where environments (and their token scope) come into play.
   */
  async duplicate(id: string, projectId: string, body: DuplicateContentBody): Promise<Content> {
    await this.requireContent(id, projectId);
    const created = await this.content.duplicateContent(id, body.name ?? '');
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

  private async requireContent(id: string, projectId: string) {
    const node = await this.content.findContentWithRelations(id, projectId, this.include([]));
    if (!node || (node as { deleted?: boolean }).deleted) {
      throw new ContentNotFoundError();
    }
    return node;
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
    const { limit, cursor, name, type, published, createdAfter, createdBefore, deleted } = query;
    const expand = toArray<ContentExpand>(query.expand);
    const orderBy = parseOrderBy(query.orderBy, ['createdAt']);

    return paginate({
      requestUrl,
      cursor,
      limit,
      fetch: (params) =>
        this.content.listContentWithRelations(
          projectId,
          params,
          this.include(expand),
          orderBy,
          type,
          published,
          createdAfter,
          createdBefore,
          name,
          deleted,
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
