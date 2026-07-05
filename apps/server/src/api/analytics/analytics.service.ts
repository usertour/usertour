import { Injectable } from '@nestjs/common';
import { ContentDataType } from '@usertour/types';
import { fromZonedTime } from 'date-fns-tz';
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
const V2_CONTENT_TYPES = new Set<string>(Object.values(ContentDataType));

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
      range.domainStartDate,
      range.domainEndDate,
      range.timezone,
    );
    return mapContentAnalytics(raw, {
      contentId: id,
      contentType: content.type,
      environmentId: query.environmentId,
      startDate: range.startDate,
      endDate: range.endDate,
      timezone: range.timezone,
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
      range.domainStartDate,
      range.domainEndDate,
      range.timezone,
    );
    // Domain returns `false` when no version exists yet — no questions, not an error.
    return { results: Array.isArray(raw) ? mapQuestionAnalytics(raw, range.timezone) : [] };
  }

  private async requireContent(id: string, projectId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, projectId, deleted: false },
      select: { id: true, type: true },
    });
    // Legacy pre-v2 kinds (nps/survey/event) are outside the v2 surface — the
    // per-type response union has no shape for them.
    if (!content || !V2_CONTENT_TYPES.has(content.type)) {
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

/**
 * Missing dates default to the trailing 30 days; timezone to UTC.
 *
 * The domain filters `createdAt <= endDate` on the RAW value, and the dashboard
 * passes full end-of-day timestamps — a bare '2026-07-04' would mean MIDNIGHT
 * and silently exclude the whole end day (today's sessions vanish). Normalize
 * caller-supplied inclusive DATES to day-boundary timestamps in the requested
 * timezone; full timestamps pass through untouched.
 */
function resolveRange(query: AnalyticsQuery): {
  startDate: string;
  endDate: string;
  timezone: string;
  domainStartDate: string;
  domainEndDate: string;
} {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const timezone = query.timezone || 'UTC';
  const startDate = query.startDate || monthAgo.toISOString().slice(0, 10);
  const endDate = query.endDate || today.toISOString().slice(0, 10);
  return {
    startDate,
    endDate,
    timezone,
    domainStartDate: toDayBoundary(startDate, timezone, 'start'),
    domainEndDate: toDayBoundary(endDate, timezone, 'end'),
  };
}

/** '2026-07-04' -> that day's first/last instant in `timezone`; timestamps pass through. */
export function toDayBoundary(value: string, timezone: string, edge: 'start' | 'end'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value; // already a timestamp — caller controls the instant
  }
  // fromZonedTime: "this wall-clock time in that zone" -> the UTC instant.
  // Building the end edge from its own wall-clock time (not start + 24h)
  // keeps DST-transition days (23h/25h) correct.
  const wallClock = edge === 'start' ? `${value} 00:00:00.000` : `${value} 23:59:59.999`;
  return fromZonedTime(wallClock, timezone).toISOString();
}
