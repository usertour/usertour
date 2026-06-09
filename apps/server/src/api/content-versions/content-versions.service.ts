import { Injectable } from '@nestjs/common';

import { ContentNotFoundError } from '@/common/errors/errors';
import { ContentService } from '@/content/content.service';

import { decompileStep } from '../content/authoring.mapper';
import { ContentVersion } from '../content/content.schema';
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
  updatedAt: Date;
  createdAt: Date;
};

/**
 * v2 content-versions handler. Depends on the domain {@link ContentService}; the
 * `questions` and `steps` expands both derive from the version's step rows, which
 * the service loads once before handing the extracted/decompiled values to the
 * pure mapper.
 */
@Injectable()
export class ApiContentVersionsService {
  constructor(private readonly content: ContentService) {}

  async get(id: string, projectId: string, query: GetContentVersionQuery): Promise<ContentVersion> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      content: true,
    });
    if (!version) {
      throw new ContentNotFoundError();
    }
    return this.toVersion(version, projectId, toArray(query.expand));
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
      map: (node) => this.toVersion(node, projectId, expand),
    });
  }

  /**
   * Build the API version. `questions` and `steps` both derive from the version's
   * step rows, so load them once when either expand is requested.
   */
  private async toVersion(
    version: VersionNode,
    projectId: string,
    expand: string[],
  ): Promise<ContentVersion> {
    const wantsQuestions = expand.includes('questions');
    const wantsSteps = expand.includes('steps');
    if (!wantsQuestions && !wantsSteps) {
      return mapVersion(version, null);
    }
    const steps = await this.loadSteps(version.id, projectId);
    const questions = wantsQuestions ? mapQuestions(steps) : null;
    const decompiled = wantsSteps ? steps.map(decompileStep) : undefined;
    return mapVersion(version, questions, decompiled);
  }

  private async loadSteps(versionId: string, projectId: string) {
    const version = await this.content.getContentVersionWithRelations(versionId, projectId, {
      steps: { orderBy: { sequence: 'asc' } },
    });
    return version?.steps ?? [];
  }
}
