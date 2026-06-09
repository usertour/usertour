import { Injectable } from '@nestjs/common';

import { ContentNotFoundError } from '@/common/errors/errors';
import { ContentService } from '@/content/content.service';

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

/**
 * v2 content-versions handler. Depends on the domain {@link ContentService}; the
 * `questions` expand needs a second fetch (the version's steps), which the service
 * does before handing the extracted questions to the pure mapper.
 */
@Injectable()
export class ApiContentVersionsService {
  constructor(private readonly content: ContentService) {}

  async get(id: string, projectId: string, query: GetContentVersionQuery): Promise<ContentVersion> {
    const wantsQuestions = toArray(query.expand).includes('questions');
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      content: true,
    });
    if (!version) {
      throw new ContentNotFoundError();
    }
    const questions = wantsQuestions
      ? mapQuestions(await this.loadSteps(version.id, projectId))
      : null;
    return mapVersion(version, questions);
  }

  async list(
    requestUrl: string,
    projectId: string,
    query: ListContentVersionsQuery,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    const { contentId, limit, cursor } = query;
    const wantsQuestions = toArray(query.expand).includes('questions');
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
      fetch: (params) =>
        this.content.listContentVersionsWithRelations(
          projectId,
          contentId,
          params,
          { content: true },
          orderBy,
        ),
      map: async (node) =>
        mapVersion(
          node,
          wantsQuestions ? mapQuestions(await this.loadSteps(node.id, projectId)) : null,
        ),
    });
  }

  private async loadSteps(versionId: string, projectId: string): Promise<{ data: unknown }[]> {
    const version = await this.content.getContentVersionWithRelations(versionId, projectId, {
      steps: true,
    });
    return version?.steps ?? [];
  }
}
