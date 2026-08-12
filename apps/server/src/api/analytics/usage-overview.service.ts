import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ContentDataType } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { EVENT_TYPE_MAPPING } from '@/analytics/analytics.service';
import {
  CompanyNotFoundError,
  EnvironmentNotFoundError,
  ValidationError,
} from '@/common/errors/errors';

import { resolveRange, V2_CONTENT_TYPES } from './analytics.service';

/** Types whose delivery creates BizSession rows. The rest (tracker, announcement)
 * leave only BizEvent rows, so their overview numbers come from there. */
const SESSION_KINDS = new Set<string>([
  ContentDataType.FLOW,
  ContentDataType.CHECKLIST,
  ContentDataType.LAUNCHER,
  ContentDataType.BANNER,
  ContentDataType.RESOURCE_CENTER,
]);

/**
 * What `goalUsers` counts per type — the analytics "success action" vocabulary
 * (EVENT_TYPE_MAPPING's `complete`), NAMED so a launcher's activation is never
 * read as a "completion". Absent = the type has no goal signal beyond reach
 * (tracker; announcement, whose only signal — seen — IS uniqueUsers).
 */
const GOAL_KIND: Partial<Record<string, 'completed' | 'activated' | 'dismissed' | 'clicked'>> = {
  [ContentDataType.FLOW]: 'completed',
  [ContentDataType.CHECKLIST]: 'completed',
  [ContentDataType.LAUNCHER]: 'activated',
  [ContentDataType.BANNER]: 'dismissed',
  [ContentDataType.RESOURCE_CENTER]: 'clicked',
};

/** Per-content cap on the `users` roster (company-scoped expand). */
const USERS_PER_CONTENT_CAP = 100;

export interface UsageOverviewQuery {
  environmentId: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  /** External company id — scope every number to this company's MEMBERS. */
  companyId?: string;
  contentType?: string;
  /** Include the per-content member roster; only valid with companyId. */
  expandUsers?: boolean;
}

export interface UsageUserRow {
  /** External user id. */
  id: string;
  name: string | null;
  /** Session count — or event count for tracker/announcement rows. */
  activity: number;
  /** From the user's LATEST session; null for sessionless types. */
  latestProgress: number | null;
  latestState: 'active' | 'ended' | null;
  /** GENUINE completion (flow/checklist only); null = type has no completion concept. */
  completed: boolean | null;
  lastActivityAt: string | null;
}

export interface UsageOverviewRow {
  id: string;
  name: string;
  type: string;
  /** Currently live in the queried environment. */
  published: boolean;
  activity: number;
  activityKind: 'sessions' | 'events' | 'seen';
  uniqueUsers: number;
  goalUsers: number | null;
  goalKind: 'completed' | 'activated' | 'dismissed' | 'clicked' | null;
  lastActivityAt: string | null;
  users?: UsageUserRow[];
  usersTruncated?: boolean;
}

export interface UsageOverview {
  environmentId: string;
  startDate: string;
  endDate: string;
  company?: { id: string; memberCount: number };
  items: UsageOverviewRow[];
}

/**
 * Cross-content usage overview — the read that answers "which content is
 * being used, by whom" without knowing a contentId upfront (per-content
 * analytics needs one; agents were hand-counting sessions to rank).
 *
 * Numbers reconcile with get_content_analytics: session-kind types aggregate
 * BizSession; tracker/announcement (which never create sessions) count
 * BizEvent exactly like queryTrackerContentAnalytics. `goalUsers` uses the
 * same EVENT_TYPE_MAPPING the analytics envelope reports.
 *
 * Company scope filters by MEMBERSHIP (the company's users), not by the
 * session's company column — sessions only carry a company when the SDK
 * identified with one (≈2% of a measured production dump), so the column
 * would answer "nobody" for most workspaces.
 *
 * Zero-activity rows are kept only for content currently PUBLISHED in the
 * queried environment ("live but unused" is a real signal); everything else
 * with no activity is dropped as noise.
 */
@Injectable()
export class ApiUsageOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(projectId: string, query: UsageOverviewQuery): Promise<UsageOverview> {
    await this.requireEnvironment(query.environmentId, projectId);
    if (query.expandUsers && !query.companyId) {
      throw new ValidationError(
        'expand "users" requires companyId — the roster is company-scoped.',
      );
    }
    if (query.contentType && !V2_CONTENT_TYPES.has(query.contentType)) {
      throw new ValidationError(`Unknown contentType "${query.contentType}".`);
    }
    const environmentId = query.environmentId;
    const range = resolveRange(query);
    const start = new Date(range.domainStartDate);
    const end = new Date(range.domainEndDate);

    // Company scope: resolve members once; every aggregate below filters on them.
    let company: { id: string; memberCount: number } | undefined;
    let memberIds: string[] | undefined;
    if (query.companyId) {
      const bizCompany = await this.prisma.bizCompany.findFirst({
        where: { externalId: query.companyId, environmentId, deleted: false },
        select: { id: true },
      });
      if (!bizCompany) {
        throw new CompanyNotFoundError();
      }
      const members = await this.prisma.bizUserOnCompany.findMany({
        where: { bizCompanyId: bizCompany.id },
        select: { bizUserId: true },
      });
      memberIds = members.map((m) => m.bizUserId);
      company = { id: query.companyId, memberCount: memberIds.length };
    }

    const contents = (
      await this.prisma.content.findMany({
        where: {
          projectId,
          deleted: false,
          ...(query.contentType ? { type: query.contentType } : {}),
        },
        select: {
          id: true,
          name: true,
          type: true,
          contentOnEnvironments: { where: { environmentId }, select: { published: true } },
        },
      })
    ).filter((c) => V2_CONTENT_TYPES.has(c.type));

    const sessionKindIds = contents.filter((c) => SESSION_KINDS.has(c.type)).map((c) => c.id);
    const eventKindIds = contents.filter((c) => !SESSION_KINDS.has(c.type)).map((c) => c.id);
    const goalKindIds = contents.filter((c) => GOAL_KIND[c.type]).map((c) => c.id);

    // Resolve the per-type goal ("success action") events for this project.
    const goalCodeNames = [
      ...new Set(
        Object.entries(EVENT_TYPE_MAPPING as Record<string, { complete: string }>)
          .filter(([type]) => GOAL_KIND[type])
          .map(([, m]) => m.complete),
      ),
    ];
    const goalEvents = await this.prisma.event.findMany({
      where: { projectId, codeName: { in: goalCodeNames } },
      select: { id: true, codeName: true },
    });
    // One codeName can map to several Event rows (imported/duplicated defs) —
    // keep every id, or events pointing at the "other" row silently vanish.
    const goalEventIdsByCodeName = new Map<string, Set<string>>();
    for (const e of goalEvents) {
      const set = goalEventIdsByCodeName.get(e.codeName) ?? new Set<string>();
      set.add(e.id);
      goalEventIdsByCodeName.set(e.codeName, set);
    }
    const goalEventIds = goalEvents.map((e) => e.id);

    // A company whose member list is empty can have no activity — skip the SQL
    // (an empty IN () is invalid anyway) and fall through to published zeros.
    const scopeIsEmpty = memberIds !== undefined && memberIds.length === 0;
    const memberFilter = (column: Prisma.Sql) =>
      memberIds ? Prisma.sql`AND ${column} IN (${Prisma.join(memberIds)})` : Prisma.empty;

    type SessionAggRow = {
      content_id: string;
      sessions: number;
      unique_users: number;
      last_at: Date;
    };
    type EventAggRow = SessionAggRow;
    type GoalRow = { content_id: string; event_id: string; user_id: string; cnt: number };
    type GoalTotalsRow = { content_id: string; event_id: string; unique_users: number };
    type LatestSessionRow = {
      content_id: string;
      user_id: string;
      progress: number;
      state: number;
      last_at: Date;
    };
    type UserCountRow = { content_id: string; user_id: string; cnt: number; last_at: Date };

    const none = <T>(): Promise<T[]> => Promise.resolve([]);
    // Session-kind aggregate: one pass over the environment's sessions.
    const sessionAggP: Promise<SessionAggRow[]> =
      sessionKindIds.length && !scopeIsEmpty
        ? this.prisma.$queryRaw<SessionAggRow[]>`
            SELECT "contentId" AS content_id, count(*)::int AS sessions,
                   count(DISTINCT "bizUserId")::int AS unique_users, max("createdAt") AS last_at
            FROM "BizSession"
            WHERE "environmentId" = ${environmentId} AND deleted = false
              AND "createdAt" >= ${start} AND "createdAt" <= ${end}
              AND "contentId" IN (${Prisma.join(sessionKindIds)})
              ${memberFilter(Prisma.sql`"bizUserId"`)}
            GROUP BY "contentId"`
        : none();
    // Tracker/announcement: count events, env-scoped through the user row
    // (BizEvent has no environment column) — same shape the per-content
    // tracker analytics uses.
    const eventAggP: Promise<EventAggRow[]> =
      eventKindIds.length && !scopeIsEmpty
        ? this.prisma.$queryRaw<EventAggRow[]>`
            SELECT e."contentId" AS content_id, count(*)::int AS sessions,
                   count(DISTINCT e."bizUserId")::int AS unique_users, max(e."createdAt") AS last_at
            FROM "BizEvent" e JOIN "BizUser" u ON u.id = e."bizUserId"
            WHERE u."environmentId" = ${environmentId}
              AND e."contentId" IN (${Prisma.join(eventKindIds)})
              AND e."createdAt" >= ${start} AND e."createdAt" <= ${end}
              ${memberFilter(Prisma.sql`e."bizUserId"`)}
            GROUP BY e."contentId"`
        : none();
    // Goal events resolve their content THROUGH THE SESSION (bizSessionId →
    // BizSession.contentId): production session events carry a NULL contentId
    // column — only tracker/announcement events are stamped with it — and the
    // domain's aggregationByEvent counts through this exact join.
    // Per-user variant — only when company-scoped (bounded by members ×
    // contents); feeds both goalUsers and the roster's `completed` flag.
    const goalPerUserP: Promise<GoalRow[]> =
      memberIds && !scopeIsEmpty && goalKindIds.length && goalEventIds.length
        ? this.prisma.$queryRaw<GoalRow[]>`
            SELECT s."contentId" AS content_id, e."eventId" AS event_id,
                   e."bizUserId" AS user_id, count(*)::int AS cnt
            FROM "BizEvent" e JOIN "BizSession" s ON s.id = e."bizSessionId"
            WHERE s."environmentId" = ${environmentId}
              AND s."contentId" IN (${Prisma.join(goalKindIds)})
              AND e."eventId" IN (${Prisma.join(goalEventIds)})
              AND e."createdAt" >= ${start} AND e."createdAt" <= ${end}
              AND e."bizUserId" IN (${Prisma.join(memberIds)})
            GROUP BY s."contentId", e."eventId", e."bizUserId"`
        : none();
    // Unscoped goal totals: distinct users straight from SQL (a per-user
    // grouping would be unbounded here).
    const goalTotalsP: Promise<GoalTotalsRow[]> =
      !memberIds && goalKindIds.length && goalEventIds.length
        ? this.prisma.$queryRaw<GoalTotalsRow[]>`
            SELECT s."contentId" AS content_id, e."eventId" AS event_id,
                   count(DISTINCT e."bizUserId")::int AS unique_users
            FROM "BizEvent" e JOIN "BizSession" s ON s.id = e."bizSessionId"
            WHERE s."environmentId" = ${environmentId}
              AND s."contentId" IN (${Prisma.join(goalKindIds)})
              AND e."eventId" IN (${Prisma.join(goalEventIds)})
              AND e."createdAt" >= ${start} AND e."createdAt" <= ${end}
            GROUP BY s."contentId", e."eventId"`
        : none();
    // Roster detail: each member's LATEST session per content …
    const latestSessionsP: Promise<LatestSessionRow[]> =
      query.expandUsers && !scopeIsEmpty && sessionKindIds.length && memberIds
        ? this.prisma.$queryRaw<LatestSessionRow[]>`
            SELECT DISTINCT ON ("contentId", "bizUserId")
                   "contentId" AS content_id, "bizUserId" AS user_id,
                   progress, state, "createdAt" AS last_at
            FROM "BizSession"
            WHERE "environmentId" = ${environmentId} AND deleted = false
              AND "createdAt" >= ${start} AND "createdAt" <= ${end}
              AND "contentId" IN (${Prisma.join(sessionKindIds)})
              AND "bizUserId" IN (${Prisma.join(memberIds)})
            ORDER BY "contentId", "bizUserId", "createdAt" DESC`
        : none();
    // … and their per-content session counts.
    const userCountsP: Promise<UserCountRow[]> =
      query.expandUsers && !scopeIsEmpty && sessionKindIds.length && memberIds
        ? this.prisma.$queryRaw<UserCountRow[]>`
            SELECT "contentId" AS content_id, "bizUserId" AS user_id,
                   count(*)::int AS cnt, max("createdAt") AS last_at
            FROM "BizSession"
            WHERE "environmentId" = ${environmentId} AND deleted = false
              AND "createdAt" >= ${start} AND "createdAt" <= ${end}
              AND "contentId" IN (${Prisma.join(sessionKindIds)})
              AND "bizUserId" IN (${Prisma.join(memberIds)})
            GROUP BY "contentId", "bizUserId"`
        : none();
    const [sessionAgg, eventAgg, goalPerUser, goalTotals, latestSessions, userCounts] =
      await Promise.all([
        sessionAggP,
        eventAggP,
        goalPerUserP,
        goalTotalsP,
        latestSessionsP,
        userCountsP,
      ]);

    const sessionByContent = new Map(sessionAgg.map((r) => [r.content_id, r]));
    const eventByContent = new Map(eventAgg.map((r) => [r.content_id, r]));

    // Fold goal rows per content, honoring each content's OWN goal event so a
    // stray cross-type event id can never inflate a count.
    const goalUsersByContent = new Map<string, number>();
    const goalUserSet = new Map<string, Set<string>>(); // contentId -> users with the goal event
    const contentById = new Map(contents.map((c) => [c.id, c]));
    const goalEventIdsFor = (contentId: string): Set<string> | undefined => {
      const type = contentById.get(contentId)?.type;
      const mapping = (EVENT_TYPE_MAPPING as Record<string, { complete: string }>)[type ?? ''];
      return mapping ? goalEventIdsByCodeName.get(mapping.complete) : undefined;
    };
    for (const row of goalTotals) {
      if (goalEventIdsFor(row.content_id)?.has(row.event_id)) {
        // Sum across duplicate event rows for the same codeName (rare; a user
        // firing under both ids would double-count, acceptable for dup data).
        goalUsersByContent.set(
          row.content_id,
          (goalUsersByContent.get(row.content_id) ?? 0) + row.unique_users,
        );
      }
    }
    for (const row of goalPerUser) {
      if (!goalEventIdsFor(row.content_id)?.has(row.event_id)) {
        continue;
      }
      const set = goalUserSet.get(row.content_id) ?? new Set<string>();
      set.add(row.user_id);
      goalUserSet.set(row.content_id, set);
    }
    if (memberIds) {
      for (const [contentId, set] of goalUserSet) {
        goalUsersByContent.set(contentId, set.size);
      }
    }

    // Roster assembly (company-scoped expand only).
    let usersByContent: Map<string, UsageUserRow[]> | undefined;
    if (query.expandUsers && memberIds) {
      const latestByKey = new Map(latestSessions.map((r) => [`${r.content_id}:${r.user_id}`, r]));
      const bizUsers = await this.prisma.bizUser.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, externalId: true, data: true },
      });
      const bizUserById = new Map(bizUsers.map((u) => [u.id, u]));
      usersByContent = new Map();
      for (const row of userCounts) {
        const bizUser = bizUserById.get(row.user_id);
        if (!bizUser) {
          continue;
        }
        const latest = latestByKey.get(`${row.content_id}:${row.user_id}`);
        const type = contentById.get(row.content_id)?.type;
        const hasCompletion = type === ContentDataType.FLOW || type === ContentDataType.CHECKLIST;
        const name = (bizUser.data as Record<string, unknown> | null)?.name;
        const rows = usersByContent.get(row.content_id) ?? [];
        rows.push({
          id: bizUser.externalId,
          name: typeof name === 'string' ? name : null,
          activity: row.cnt,
          latestProgress: latest ? latest.progress : null,
          latestState: latest ? (latest.state === 1 ? 'ended' : 'active') : null,
          completed: hasCompletion
            ? (goalUserSet.get(row.content_id)?.has(row.user_id) ?? false)
            : null,
          lastActivityAt: row.last_at.toISOString(),
        });
        usersByContent.set(row.content_id, rows);
      }
      // Tracker/announcement roster: event counts per member (small, bounded).
      if (eventKindIds.length && !scopeIsEmpty) {
        const eventUserRows = await this.prisma.$queryRaw<UserCountRow[]>`
          SELECT e."contentId" AS content_id, e."bizUserId" AS user_id,
                 count(*)::int AS cnt, max(e."createdAt") AS last_at
          FROM "BizEvent" e
          WHERE e."contentId" IN (${Prisma.join(eventKindIds)})
            AND e."createdAt" >= ${start} AND e."createdAt" <= ${end}
            AND e."bizUserId" IN (${Prisma.join(memberIds)})
          GROUP BY e."contentId", e."bizUserId"`;
        for (const row of eventUserRows) {
          const bizUser = bizUserById.get(row.user_id);
          if (!bizUser) {
            continue;
          }
          const name = (bizUser.data as Record<string, unknown> | null)?.name;
          const rows = usersByContent.get(row.content_id) ?? [];
          rows.push({
            id: bizUser.externalId,
            name: typeof name === 'string' ? name : null,
            activity: row.cnt,
            latestProgress: null,
            latestState: null,
            completed: null,
            lastActivityAt: row.last_at.toISOString(),
          });
          usersByContent.set(row.content_id, rows);
        }
      }
    }

    const items: UsageOverviewRow[] = [];
    for (const content of contents) {
      const isSessionKind = SESSION_KINDS.has(content.type);
      const agg = isSessionKind ? sessionByContent.get(content.id) : eventByContent.get(content.id);
      const published = content.contentOnEnvironments.some((e) => e.published);
      const activity = agg?.sessions ?? 0;
      if (activity === 0 && !published) {
        continue;
      }
      const goalKind = GOAL_KIND[content.type] ?? null;
      const row: UsageOverviewRow = {
        id: content.id,
        name: content.name ?? '',
        type: content.type,
        published,
        activity,
        activityKind: isSessionKind
          ? 'sessions'
          : content.type === ContentDataType.ANNOUNCEMENT
            ? 'seen'
            : 'events',
        uniqueUsers: agg?.unique_users ?? 0,
        goalUsers: goalKind ? (goalUsersByContent.get(content.id) ?? 0) : null,
        goalKind,
        lastActivityAt: agg?.last_at ? agg.last_at.toISOString() : null,
      };
      const roster = usersByContent?.get(content.id);
      if (roster) {
        roster.sort((a, b) => b.activity - a.activity);
        row.users = roster.slice(0, USERS_PER_CONTENT_CAP);
        if (roster.length > USERS_PER_CONTENT_CAP) {
          row.usersTruncated = true;
        }
      } else if (query.expandUsers) {
        row.users = [];
      }
      items.push(row);
    }
    // Reach is the only number comparable across types (sessions vs events are
    // different units) — rank by it, then raw activity, then name for stability.
    items.sort(
      (a, b) =>
        b.uniqueUsers - a.uniqueUsers || b.activity - a.activity || a.name.localeCompare(b.name),
    );

    return {
      environmentId,
      startDate: range.startDate,
      endDate: range.endDate,
      ...(company ? { company } : {}),
      items,
    };
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
