import { Injectable } from '@nestjs/common';

import { AnalyticsService } from '@/analytics/analytics.service';
import { ContentNotFoundError, ContentSessionNotFoundError } from '@/common/errors/errors';
import { ContentService } from '@/content/content.service';
import { Environment } from '@/environments/models/environment.model';

import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapContentSession, mapSessionAnswers } from './content-sessions.mapper';
import {
  ContentSession,
  ContentSessionAnswer,
  GetContentSessionQuery,
  ListContentSessionsQuery,
  SessionExpand,
} from './content-sessions.schema';

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

const SESSION_INCLUDE = { content: true, bizCompany: true, bizUser: true, version: true };

/**
 * v2 content-sessions handler (environment-scoped). Depends on the domain
 * AnalyticsService (+ ContentService for the answers expand, which needs the
 * version's steps). The session->DTO transform is a pure mapper.
 */
@Injectable()
export class ApiContentSessionsService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly content: ContentService,
  ) {}

  async get(
    id: string,
    environment: Environment,
    query: GetContentSessionQuery,
  ): Promise<ContentSession> {
    const expand = toArray<SessionExpand>(query.expand);
    const session = await this.analytics.getContentSessionWithRelations(
      id,
      environment.id,
      SESSION_INCLUDE,
    );
    if (!session) {
      throw new ContentSessionNotFoundError();
    }
    const answers = expand.includes('answers') ? await this.computeAnswers(session) : null;
    return mapContentSession(session, expand, answers);
  }

  async list(
    requestUrl: string,
    environment: Environment,
    query: ListContentSessionsQuery,
  ): Promise<{ results: ContentSession[]; next: string | null; previous: string | null }> {
    const { contentId, userId, limit, cursor } = query;
    const expand = toArray<SessionExpand>(query.expand);

    const content = await this.content.getContentById(contentId);
    if (!content) {
      throw new ContentNotFoundError();
    }

    const orderBy = parseOrderBy(
      toArray(query.orderBy).length ? toArray(query.orderBy) : ['createdAt'],
    );

    return paginate({
      requestUrl,
      cursor,
      limit,
      query: { ...(expand.length ? { expand } : {}) },
      fetch: (params) =>
        this.analytics.listContentSessionsWithRelations(
          environment.id,
          contentId,
          params,
          userId,
          SESSION_INCLUDE,
          orderBy,
        ),
      map: async (session) =>
        mapContentSession(
          session,
          expand,
          expand.includes('answers') ? await this.computeAnswers(session) : null,
        ),
    });
  }

  private async computeAnswers(session: any): Promise<ContentSessionAnswer[] | null> {
    if (!session.version) {
      return null;
    }
    const version = await this.content.getContentVersionWithRelations(
      session.versionId,
      session.content.projectId,
      { steps: true },
    );
    if (!version || version.steps.length === 0) {
      return null;
    }
    const answers = await this.analytics.getSessionAnswers(session.id);
    return mapSessionAnswers(answers, version.steps);
  }
}
