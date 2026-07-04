import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { AnalyticsService } from '@/analytics/analytics.service';
import { ContentNotFoundError, EnvironmentNotFoundError } from '@/common/errors/errors';

import { mapContentAnalytics, mapQuestionAnalytics } from './analytics.mapper';
import type { AnalyticsQuery, ContentAnalytics, QuestionAnalytics } from './analytics.schema';

/**
 * v2 content-analytics handler — a thin, read-only binding over the domain
 * {@link AnalyticsService} the dashboard already uses. Range defaults to the
 * last 30 days; day bucketing defaults to UTC.
 */
@Injectable()
export class ApiAnalyticsService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  async contentAnalytics(
    id: string,
    projectId: string,
    query: AnalyticsQuery,
  ): Promise<ContentAnalytics> {
    const content = await this.requireContent(id, projectId);
    await this.requireEnvironment(query.environmentId, projectId);
    const range = resolveRange(query);
    const raw = await this.analytics.queryContentAnalytics(
      query.environmentId,
      id,
      range.startDate,
      range.endDate,
      range.timezone,
    );
    return mapContentAnalytics(raw, {
      contentId: id,
      contentType: content.type,
      environmentId: query.environmentId,
      ...range,
    });
  }

  async questionAnalytics(
    id: string,
    projectId: string,
    query: AnalyticsQuery,
  ): Promise<{ results: QuestionAnalytics[] }> {
    await this.requireContent(id, projectId);
    await this.requireEnvironment(query.environmentId, projectId);
    const range = resolveRange(query);
    const raw = await this.analytics.queryContentQuestionAnalytics(
      query.environmentId,
      id,
      range.startDate,
      range.endDate,
      range.timezone,
    );
    // Domain returns `false` when no version exists yet — no questions, not an error.
    return { results: Array.isArray(raw) ? mapQuestionAnalytics(raw) : [] };
  }

  private async requireContent(id: string, projectId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, projectId, deleted: false },
      select: { id: true, type: true },
    });
    if (!content) {
      throw new ContentNotFoundError();
    }
    return content;
  }

  private async requireEnvironment(environmentId: string, projectId: string): Promise<void> {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId, projectId, deleted: false },
      select: { id: true },
    });
    if (!environment) {
      throw new EnvironmentNotFoundError();
    }
  }
}

/** Missing dates default to the trailing 30 days; timezone to UTC. */
function resolveRange(query: AnalyticsQuery): {
  startDate: string;
  endDate: string;
  timezone: string;
} {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    startDate: query.startDate || monthAgo.toISOString().slice(0, 10),
    endDate: query.endDate || today.toISOString().slice(0, 10),
    timezone: query.timezone || 'UTC',
  };
}
