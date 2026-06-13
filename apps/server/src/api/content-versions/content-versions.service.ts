import { Injectable } from '@nestjs/common';
import { cuid } from '@usertour/helpers';
import type { RulesCondition, Step } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import {
  ContentNotFoundError,
  ParamsError,
  ThemeNotFoundError,
  ValidationError,
} from '@/common/errors/errors';
import { AttributeBizType } from '@/attributes/models/attribute.model';
import { ContentService } from '@/content/content.service';
import { ThemesService } from '@/themes/themes.service';

import { loadConditionContext } from '../content-representation/condition-context';
import { compileStep } from '../content-representation/representation.compile';
import { decompileStep } from '../content-representation/representation.decompile';
import { ContentVersion } from '../content-representation/representation.schema';
import {
  CompileResolvers,
  compileHideRules,
  compileStartRules,
} from '../content-representation/rules.compile';
import {
  DecompileResolvers,
  decompileHideRules,
  decompileStartRules,
} from '../content-representation/rules.decompile';
import {
  type UsabilityReport,
  validateVersionUsable,
} from '../content-representation/usable.validate';
import { compileVersionData } from '../content-representation/version-data.compile';
import { decompileVersionData } from '../content-representation/version-data.decompile';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapQuestions, mapVersion } from './content-versions.mapper';
import {
  GetContentVersionQuery,
  ListContentVersionsQuery,
  UpdateVersionBody,
} from './content-versions.schema';

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

type VersionNode = {
  id: string;
  sequence: number;
  themeId: string | null;
  config?: unknown;
  data?: unknown;
  content?: { type?: string | null } | null;
  updatedAt: Date;
  createdAt: Date;
};

/**
 * v2 content-versions handler. Depends on the domain {@link ContentService}; the
 * `questions` and `steps` expands both derive from the version's step rows, which
 * the service loads once. Rules (start/hide rules on the version, triggers /
 * button & answer actions on steps) reference attributes / events by stable code
 * — the service builds the id→code resolvers once per request.
 */
@Injectable()
export class ApiContentVersionsService {
  constructor(
    private readonly content: ContentService,
    private readonly prisma: PrismaService,
    private readonly themes: ThemesService,
  ) {}

  async get(
    id: string,
    contentId: string,
    projectId: string,
    query: GetContentVersionQuery,
  ): Promise<ContentVersion> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      content: true,
    });
    if (!version || (version as { contentId?: string }).contentId !== contentId) {
      throw new ContentNotFoundError();
    }
    const resolvers = await this.buildResolvers(projectId);
    return this.toVersion(version, projectId, toArray(query.expand), resolvers);
  }

  async list(
    requestUrl: string,
    projectId: string,
    contentId: string,
    query: ListContentVersionsQuery,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    const { limit, cursor } = query;
    const expand = toArray(query.expand);
    const orderBy = parseOrderBy(
      toArray(query.orderBy).length ? toArray(query.orderBy) : ['createdAt'],
    );

    const content = await this.content.getContentById(contentId);
    if (!content) {
      throw new ContentNotFoundError();
    }
    const resolvers = await this.buildResolvers(projectId);

    return paginate({
      requestUrl,
      cursor,
      limit,
      query: expand.length ? { expand } : undefined,
      fetch: (params) =>
        this.content.listContentVersionsWithRelations(
          projectId,
          contentId,
          params,
          { content: true },
          orderBy,
        ),
      map: (node) => this.toVersion(node, projectId, expand, resolvers),
    });
  }

  /**
   * Build the API version. `questions` and `steps` derive from the version's step
   * rows (loaded once when either expand is set); start/hide rules come from the
   * version config and are always included.
   */
  private async toVersion(
    version: VersionNode,
    projectId: string,
    expand: string[],
    resolvers: DecompileResolvers,
  ): Promise<ContentVersion> {
    const rules = {
      ...(decompileStartRules(version.config, resolvers)
        ? { startRules: decompileStartRules(version.config, resolvers) }
        : {}),
      ...(decompileHideRules(version.config, resolvers)
        ? { hideRules: decompileHideRules(version.config, resolvers) }
        : {}),
    };
    // Type-specific body (checklist / launcher / banner / tracker / resource-center).
    const data =
      expand.includes('data') && version.content?.type
        ? decompileVersionData(version.content.type, version.data, resolvers)
        : undefined;

    const wantsQuestions = expand.includes('questions');
    const wantsSteps = expand.includes('steps');
    if (!wantsQuestions && !wantsSteps) {
      return mapVersion(version, null, undefined, rules, data);
    }
    const steps = await this.loadSteps(version.id, projectId);
    const questions = wantsQuestions ? mapQuestions(steps) : null;
    const decompiled = wantsSteps ? steps.map((s) => decompileStep(s, resolvers)) : undefined;
    return mapVersion(version, questions, decompiled, rules, data);
  }

  private async loadSteps(versionId: string, projectId: string) {
    const version = await this.content.getContentVersionWithRelations(versionId, projectId, {
      steps: { orderBy: { sequence: 'asc' } },
    });
    return version?.steps ?? [];
  }

  /** Map internal attribute / event ids to their stable codeName (read fallback: the id). */
  private async buildResolvers(projectId: string): Promise<DecompileResolvers> {
    const [attributes, events] = await Promise.all([
      this.prisma.attribute.findMany({
        where: { projectId },
        select: { id: true, codeName: true },
      }),
      this.prisma.event.findMany({ where: { projectId }, select: { id: true, codeName: true } }),
    ]);
    const attrMap = new Map(attributes.map((a) => [a.id, a.codeName]));
    const eventMap = new Map(events.map((e) => [e.id, e.codeName]));
    return {
      attributeCode: (id) => attrMap.get(id) ?? id,
      eventCode: (id) => eventMap.get(id) ?? id,
    };
  }

  /**
   * Write a draft version: compile the representation steps + rules and field-merge
   * them onto the existing internal version, then delegate persistence to the
   * domain `updateContentVersion` (the builder's exact path — cvid upsert in a
   * transaction). Only the provided fields are touched.
   */
  /**
   * Fork a new draft version from the content's current edited version (the
   * builder's "new version" action): the fork becomes the new editedVersion, the
   * previous draft is frozen as a historical version.
   */
  async create(projectId: string, contentId: string): Promise<ContentVersion> {
    const content = await this.content.findContentWithRelations(contentId, projectId, {});
    if (!content || (content as { deleted?: boolean }).deleted) {
      throw new ContentNotFoundError();
    }
    const editedVersionId = (content as { editedVersionId?: string | null }).editedVersionId;
    if (!editedVersionId) {
      throw new ParamsError('Content has no editable version to fork');
    }
    const created = await this.content.createContentVersion({ versionId: editedVersionId });
    if (!created) {
      throw new ParamsError('Failed to create version');
    }
    return this.get(created.id, contentId, projectId, {});
  }

  /**
   * Restore a historical version: fork it forward as the new edited (head)
   * version — config / data / theme / steps copied from version `id`. Binds the
   * same domain method the builder uses. Returns the new version.
   */
  async restore(id: string, contentId: string, projectId: string): Promise<ContentVersion> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      content: true,
    });
    if (
      !version ||
      (version as { contentId?: string }).contentId !== contentId ||
      (version.content as { deleted?: boolean } | null)?.deleted
    ) {
      throw new ContentNotFoundError();
    }
    const created = await this.content.restoreContentVersion(id);
    if (!created) {
      throw new ParamsError('Failed to restore version');
    }
    return this.get(created.id, contentId, projectId, {});
  }

  async update(
    id: string,
    contentId: string,
    projectId: string,
    body: UpdateVersionBody,
  ): Promise<ContentVersion> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      steps: { orderBy: { sequence: 'asc' } },
      content: true,
    });
    if (!version || (version as { contentId?: string }).contentId !== contentId) {
      throw new ContentNotFoundError();
    }
    const resolvers = await this.buildCompileResolvers(projectId);
    const content: Record<string, unknown> = {};

    if (body.steps) {
      // Steps merge by their server-assigned `id` (echo to update, omit to create);
      // the internal cvid is server-owned (matched step's cvid, or a fresh one).
      const existingById = new Map(
        (
          (version.steps ?? []) as {
            id: string;
            cvid?: string;
            data?: unknown;
            target?: unknown;
            setting?: unknown;
          }[]
        ).map((s) => [s.id, s]),
      );

      // Fix every step's cvid BEFORE compiling any content, so a `goto_step` can
      // reference a step by the author `key` it carries in this same write (or by
      // an existing cvid). Those references resolve to the real cvid here — no
      // read-back round-trip, and forward/cyclic links work in one pass.
      const planned = body.steps.map((s, i) => {
        const existing = s.id ? existingById.get(s.id) : undefined;
        return { input: s, existing, cvid: existing?.cvid ?? cuid(), sequence: s.sequence ?? i };
      });

      // One handle→cvid table: every step answers to its own cvid; a step with a
      // `key` also answers to that key (key wins if it ever collides with a cvid).
      const knownCvids = new Set<string>([
        ...planned.map((p) => p.cvid),
        ...((version.steps ?? []) as { cvid?: string }[])
          .map((s) => s.cvid)
          .filter((c): c is string => Boolean(c)),
      ]);
      const keyToCvid = new Map<string, string>();
      for (const p of planned) {
        const key = (p.input as { key?: string }).key;
        if (!key) continue;
        if (keyToCvid.has(key)) {
          throw new ValidationError(`Duplicate step key "${key}" in this request.`);
        }
        if (knownCvids.has(key)) {
          throw new ValidationError(`Step key "${key}" must not equal an existing step id.`);
        }
        keyToCvid.set(key, p.cvid);
      }
      const stepResolvers: CompileResolvers = {
        ...resolvers,
        stepCvid: (ref: string) => {
          const byKey = keyToCvid.get(ref);
          if (byKey) {
            return byKey;
          }
          if (knownCvids.has(ref)) {
            return ref;
          }
          throw new ValidationError(
            `"go to step" references unknown step "${ref}" — use a step \`key\` from this request or an existing step cvid.`,
          );
        },
      };

      content.steps = planned.map((p) =>
        compileStep(
          { ...p.input, cvid: p.cvid, sequence: p.sequence, content: p.input.content ?? [] },
          p.existing,
          stepResolvers,
        ),
      );
    }

    if (body.startRules !== undefined || body.hideRules !== undefined) {
      const config = { ...(((version as { config?: unknown }).config as object) ?? {}) };
      if (body.startRules !== undefined) {
        Object.assign(config, compileStartRules(body.startRules ?? undefined, resolvers));
      }
      if (body.hideRules !== undefined) {
        Object.assign(config, compileHideRules(body.hideRules, resolvers));
      }
      content.config = config;
    }

    if (body.themeId !== undefined) {
      await this.requireTheme(body.themeId, projectId);
      content.themeId = body.themeId;
    }

    if (body.data !== undefined) {
      const contentType = (version as { content?: { type?: string | null } | null }).content?.type;
      if (!contentType) {
        throw new ParamsError('Cannot resolve content type for this version');
      }
      content.data = compileVersionData(
        contentType,
        body.data,
        (version as { data?: unknown }).data,
        resolvers,
      );
    }

    if (Object.keys(content).length > 0) {
      const result = await this.content.updateContentVersion({
        versionId: id,
        content: content as never,
      });
      if (!result) {
        throw new ParamsError('Version is not editable');
      }
    }

    return this.get(id, contentId, projectId, { expand: ['steps'] });
  }

  /**
   * Dry-run usability check — the same validation `publish` enforces, but
   * non-mutating, so an agent can confirm a draft is renderable before shipping
   * (the machine equivalent of the builder's live preview).
   */
  async validate(id: string, contentId: string, projectId: string): Promise<UsabilityReport> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      steps: { orderBy: { sequence: 'asc' } },
      content: true,
    });
    if (!version || (version as { contentId?: string }).contentId !== contentId) {
      throw new ContentNotFoundError();
    }
    const v = version as {
      themeId: string | null;
      steps?: unknown;
      data?: unknown;
      config?: unknown;
      content?: { type?: string };
    };
    return validateVersionUsable({
      type: v.content?.type ?? 'flow',
      themeId: v.themeId,
      steps: v.steps as Step[],
      data: v.data,
      config: v.config as { autoStartRules?: RulesCondition[] } | null,
      conditionContext: await loadConditionContext(this.prisma, projectId),
    });
  }

  /** Assert a theme exists in the project (and is live) before writing it as themeId. */
  private async requireTheme(themeId: string, projectId: string): Promise<void> {
    const theme = await this.themes.getTheme(themeId);
    if (!theme || theme.projectId !== projectId || (theme as { deleted?: boolean }).deleted) {
      throw new ThemeNotFoundError();
    }
  }

  /** Map stable codes back to internal ids (code→id; fallback: the code itself). */
  private async buildCompileResolvers(projectId: string): Promise<CompileResolvers> {
    const [attributes, events] = await Promise.all([
      this.prisma.attribute.findMany({
        where: { projectId },
        select: { id: true, codeName: true, bizType: true },
      }),
      this.prisma.event.findMany({ where: { projectId }, select: { id: true, codeName: true } }),
    ]);
    const attrMap = new Map(attributes.map((a) => [a.codeName, a.id]));
    // Event attributes live in their own bizType namespace (a codeName can collide
    // with a user attribute), so event_attribute conditions resolve via this map.
    const eventAttrMap = new Map(
      attributes.filter((a) => a.bizType === AttributeBizType.EVENT).map((a) => [a.codeName, a.id]),
    );
    const eventMap = new Map(events.map((e) => [e.codeName, e.id]));
    return {
      attributeId: (code) => attrMap.get(code) ?? code,
      eventId: (code) => eventMap.get(code) ?? code,
      eventAttributeId: (code) => eventAttrMap.get(code) ?? code,
    };
  }
}
