import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { ContentNotFoundError } from '@/common/errors/errors';
import { ContentService } from '@/content/content.service';

import { decompileStep } from '../content/authoring.mapper';
import { ContentVersion } from '../content/content.schema';
import {
  DecompileResolvers,
  decompileHideRules,
  decompileStartRules,
} from '../content/rules.mapper';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapQuestions, mapVersion } from './content-versions.mapper';
import { GetContentVersionQuery, ListContentVersionsQuery } from './content-versions.schema';

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
}
