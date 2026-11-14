import { Injectable } from '@nestjs/common';
import { ContentDataType } from '@usertour/types';
import { TZDate, tz } from '@date-fns/tz';
import { endOfDay, format, startOfDay } from 'date-fns';
import { PrismaService } from 'nestjs-prisma';

import { AnalyticsService } from '@/modules/analytics/services/analytics.service';
import {
  ContentNotFoundError,
  EnvironmentNotFoundError,
  ValidationError,
} from '@/modules/common/errors/errors';

import { mapContentAnalytics, mapQuestionAnalytics } from './analytics.mapper';
import type { QuestionRollingWindows } from './analytics.mapper';
import type { AnalyticsQuery, ContentAnalytics, QuestionAnalytics } from './analytics.schema';

/**
 * The per-question-kind rolling-window lengths the domain aggregates with —
 * `content.config.rollWindowConfig` falling back to 365 per kind, mirroring
 * AnalyticsService.queryContentQuestionAnalytics (the domain resolves this
 * internally and does NOT stamp it into its payload, so the API re-derives it
 * to echo `rollingWindowDays`; a parity drift here would mislabel the series,
 * not change it).
 */
function resolveRollingWindows(config: unknown): QuestionRollingWindows {
  const cfg = ((config as Record<string, unknown> | null)?.rollWindowConfig ?? {}) as Record<
    string,
    unknown
  >;
  const days = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 365;
  return { nps: days(cfg.nps), rate: days(cfg.rate), scale: days(cfg.scale) };
}

/**
 * v2 content-analytics handler — a thin, read-only binding over the domain
 * {@link AnalyticsService} the dashboard already uses. Range defaults to the
 * last 30 days; day bucketing defaults to UTC.
 */
export const V2_CONTENT_TYPES = new Set<string>(Object.values(ContentDataType));

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
    const content = await this.requireContent(id, projectId);
    await this.requireEnvironment(query.environmentId, projectId);
    const range = resolveRange(query);
    const raw = await this.analytics.queryContentQuestionAnalytics(
      query.environmentId,
      id,
      range.domainStartDate,
      range.domainEndDate,
      range.timezone,
    );
    // Domain returns `null` when no version exists yet — no questions, not an error.
    return {
      results: Array.isArray(raw)
        ? mapQuestionAnalytics(raw, range.timezone, resolveRollingWindows(content.config))
        : [],
    };
  }

  private async requireContent(id: string, projectId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, projectId },
      select: { id: true, type: true, deleted: true, config: true },
    });
    if (content?.deleted) {
      // Same code, archived-specific message — "no such id" and "archived" demand
      // opposite next moves (see ApiContentService.archivedContentError).
      throw new ContentNotFoundError(
        'Content exists but is ARCHIVED (soft-deleted); its analytics are not readable while ' +
          'archived. Restore it (restore_content / POST /content/{id}/restore) first.',
      );
    }
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
export function resolveRange(
  query: AnalyticsQuery,
  now: Date = new Date(),
): {
  startDate: string;
  endDate: string;
  timezone: string;
  domainStartDate: string;
  domainEndDate: string;
} {
  const timezone = query.timezone || 'UTC';
  // Default "today"/"30 days ago" must be the calendar date IN the requested
  // timezone — using the UTC date (toISOString) drops the current local day for
  // ahead-of-UTC zones during their morning (e.g. 08:00 Tokyo is still "yesterday"
  // in UTC), silently excluding today's data.
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = query.startDate || format(monthAgo, 'yyyy-MM-dd', { in: tz(timezone) });
  const endDate = query.endDate || format(now, 'yyyy-MM-dd', { in: tz(timezone) });
  const domainStartDate = toDayBoundary(startDate, timezone, 'start');
  const domainEndDate = toDayBoundary(endDate, timezone, 'end');
  // An inverted range matches no rows, and every downstream aggregation then
  // returns a STRUCTURALLY VALID all-zero report — indistinguishable from
  // "nobody used it" (read-only-credential audit: 9 real sessions inside the
  // swapped bounds read back as totalStarts 0). Refuse loudly instead.
  if (new Date(domainStartDate).getTime() > new Date(domainEndDate).getTime()) {
    throw new ValidationError(
      `startDate (${startDate}) is after endDate (${endDate}) — swap the bounds. An inverted range would silently report all-zero analytics.`,
    );
  }
  return {
    startDate,
    endDate,
    timezone,
    domainStartDate,
    domainEndDate,
  };
}

/** '2026-07-04' -> that day's first/last instant in `timezone`; timestamps pass through. */
export function toDayBoundary(value: string, timezone: string, edge: 'start' | 'end'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value; // already a timestamp — caller controls the instant
  }
  // The day's own first/last instant in `timezone`, resolved by date-fns: a
  // wall-clock "00:00" built by hand lands an hour early where a DST switch
  // removes midnight itself (America/Santiago, America/Havana), and the end
  // edge from its own instant (not start + 24h) keeps 23h/25h days correct.
  const [year, month, day] = value.split('-').map(Number);
  const inDay = new TZDate(year, month - 1, day, timezone);
  return new Date(edge === 'start' ? startOfDay(inDay) : endOfDay(inDay)).toISOString();
}
