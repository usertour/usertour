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
    const session = await this.requireSession(id, environment);
    const answers = expand.includes('answers') ? await this.computeAnswers(session) : null;
    return mapContentSession(session, expand, answers);
  }

  async list(
    requestUrl: string,
    environment: Environment,
    query: ListContentSessionsQuery,
  ): Promise<{ results: ContentSession[]; next: string | null; previous: string | null }> {
    const { contentId, userId, limit, cursor, completed, createdAfter, createdBefore } = query;
    const expand = toArray<SessionExpand>(query.expand);

    // contentId is an optional filter; validate it when given so a bad id is a
    // clear 404 rather than a silently-empty list.
    if (contentId) {
      const content = await this.content.getContentById(contentId);
      if (!content) {
        throw new ContentNotFoundError();
      }
    }

    const orderBy = parseOrderBy(
      toArray(query.orderBy).length ? toArray(query.orderBy) : ['createdAt'],
    );

    return paginate({
      requestUrl,
      cursor,
      limit,
      query: {
        ...(contentId ? { contentId } : {}),
        ...(userId ? { userId } : {}),
        ...(expand.length ? { expand } : {}),
      },
      fetch: (params) =>
        this.analytics.listContentSessionsWithRelations(
          environment.id,
          contentId,
          params,
          userId,
          SESSION_INCLUDE,
          orderBy,
          completed,
          createdAfter,
          createdBefore,
        ),
      map: async (session) =>
        mapContentSession(
          session,
          expand,
          expand.includes('answers') ? await this.computeAnswers(session) : null,
        ),
    });
  }

  /** Delete a session (scoped to the environment). 404 when not found. */
  async delete(id: string, environment: Environment): Promise<void> {
    await this.requireSession(id, environment);
    const deleted = await this.analytics.deleteContentSessionWithRelations(id, environment.id);
    if (!deleted) {
      throw new ContentSessionNotFoundError();
    }
  }

  /** End an in-progress session, then return the (now-completed) session. */
  async end(id: string, environment: Environment): Promise<ContentSession> {
    await this.requireSession(id, environment);
    const success = await this.analytics.endSession(id);
    if (!success) {
      throw new ContentSessionNotFoundError();
    }
    return this.get(id, environment, {});
  }

  /** Load a session that belongs to this environment, or 404. */
  private async requireSession(id: string, environment: Environment) {
    const session = await this.analytics.getContentSessionWithRelations(
      id,
      environment.id,
      SESSION_INCLUDE,
    );
    if (!session) {
      throw new ContentSessionNotFoundError();
    }
    return session;
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
