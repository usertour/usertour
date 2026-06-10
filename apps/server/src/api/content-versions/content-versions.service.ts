import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { ContentNotFoundError, ParamsError } from '@/common/errors/errors';
import { ContentService } from '@/content/content.service';

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
  ) {}

  async get(id: string, projectId: string, query: GetContentVersionQuery): Promise<ContentVersion> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      content: true,
    });
    if (!version) {
      throw new ContentNotFoundError();
    }
    const resolvers = await this.buildResolvers(projectId);
    return this.toVersion(version, projectId, toArray(query.expand), resolvers);
  }

  async list(
    requestUrl: string,
    projectId: string,
    query: ListContentVersionsQuery,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    const { contentId, limit, cursor } = query;
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
    const wantsQuestions = expand.includes('questions');
    const wantsSteps = expand.includes('steps');
    if (!wantsQuestions && !wantsSteps) {
      return mapVersion(version, null, undefined, rules);
    }
    const steps = await this.loadSteps(version.id, projectId);
    const questions = wantsQuestions ? mapQuestions(steps) : null;
    const decompiled = wantsSteps ? steps.map((s) => decompileStep(s, resolvers)) : undefined;
    return mapVersion(version, questions, decompiled, rules);
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
  async update(id: string, projectId: string, body: UpdateVersionBody): Promise<ContentVersion> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      steps: { orderBy: { sequence: 'asc' } },
    });
    if (!version) {
      throw new ContentNotFoundError();
    }
    const resolvers = await this.buildCompileResolvers(projectId);
    const content: Record<string, unknown> = {};

    if (body.steps) {
      const existingByCvid = new Map(
        ((version.steps ?? []) as { cvid: string }[]).map((s) => [s.cvid, s]),
      );
      content.steps = body.steps.map((s, i) =>
        compileStep(
          { ...s, cvid: s.cvid ?? null, sequence: s.sequence ?? i, content: s.content ?? [] },
          s.cvid ? existingByCvid.get(s.cvid) : undefined,
          resolvers,
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

    if (Object.keys(content).length > 0) {
      const result = await this.content.updateContentVersion({
        versionId: id,
        content: content as never,
      });
      if (!result) {
        throw new ParamsError('Version is not editable');
      }
    }

    return this.get(id, projectId, { expand: ['steps'] });
  }

  /** Map stable codes back to internal ids (code→id; fallback: the code itself). */
  private async buildCompileResolvers(projectId: string): Promise<CompileResolvers> {
    const [attributes, events] = await Promise.all([
      this.prisma.attribute.findMany({
        where: { projectId },
        select: { id: true, codeName: true },
      }),
      this.prisma.event.findMany({ where: { projectId }, select: { id: true, codeName: true } }),
    ]);
    const attrMap = new Map(attributes.map((a) => [a.codeName, a.id]));
    const eventMap = new Map(events.map((e) => [e.codeName, e.id]));
    return {
      attributeId: (code) => attrMap.get(code) ?? code,
      eventId: (code) => eventMap.get(code) ?? code,
    };
  }
}
