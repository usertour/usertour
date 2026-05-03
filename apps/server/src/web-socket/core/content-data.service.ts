import { AttributeBizType } from '@/attributes/models/attribute.model';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Prisma } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import {
  BizUser,
  Environment,
  Theme,
  Version,
  VersionWithStepsAndContent,
  Attribute,
  BizSessionWithEvents,
  BizSessionWithContentAndVersion,
  BizEventWithEvent,
  BizSession,
} from '@/common/types/schema';
import {
  BizEvents,
  ContentConfigObject,
  ChecklistData,
  ContentDataType,
  ResourceCenterData,
  RulesCondition,
  ThemeVariation,
} from '@usertour/types';
import { buildConfig, isArray } from '@usertour/helpers';
import { getPublishedVersionId } from '@/utils/content-utils';
import { CustomContentVersion, ContentSessionCollection } from '@/common/types/content';
import {
  ConditionEvaluationService,
  ConditionEvaluationContext,
} from './condition-evaluation.service';
import { DISMISSED_EVENTS } from '@/utils/event-v2';
import { ProjectCacheService } from '@/shared/project-cache.service';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Sentinel returned by `findSessions` for contentIds the caller asked
 * about that aren't present in a pre-fetched union map. Same shape the
 * DB path would have produced for a content with zero sessions / events.
 */
const EMPTY_SESSION_COLLECTION: ContentSessionCollection = {
  totalSessions: 0,
  completedSessions: 0,
};

/**
 * Context for content queries containing essential parameters
 */
export interface ContentQueryContext {
  readonly environment: Environment;
  readonly externalUserId: string;
  readonly externalCompanyId?: string;
}

/**
 * Context for content processing containing all required data
 */
type ContentProcessingContext = {
  readonly environment: Environment;
  readonly bizUser: BizUser;
  readonly attributes: Attribute[];
  readonly externalCompanyId?: string;
};

/**
 * Parameters for processing a single version
 */
type VersionProcessingParams = {
  readonly version: VersionWithStepsAndContent;
  readonly context: ContentProcessingContext;
  readonly session: ContentSessionCollection;
};

/**
 * Version with session for processing
 */
type VersionWithSession = {
  readonly version: VersionWithStepsAndContent;
  readonly session: ContentSessionCollection;
};

/**
 * Event with bizSession and content info for latest event calculation
 */
type BizEventWithSessionAndContent = BizEventWithEvent & {
  bizSession: { contentId: string | null; content: { type: string } | null } | null;
};

/**
 * Service responsible for fetching and processing content data
 * Coordinates data retrieval, condition evaluation, and content assembly
 */
@Injectable()
export class ContentDataService {
  private readonly logger = new Logger(ContentDataService.name);

  // ============================================================================
  // Constants
  // ============================================================================

  /**
   * Event code names for completed sessions
   */
  private static readonly COMPLETED_EVENTS = [
    BizEvents.FLOW_COMPLETED,
    BizEvents.LAUNCHER_ACTIVATED,
    BizEvents.CHECKLIST_COMPLETED,
  ] as const;

  /**
   * Attribute business types used in content processing
   */
  private static readonly CONTENT_ATTRIBUTE_BIZ_TYPES = [
    AttributeBizType.USER,
    AttributeBizType.COMPANY,
    AttributeBizType.MEMBERSHIP,
    AttributeBizType.EVENT,
  ] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionEvaluationService: ConditionEvaluationService,
    private readonly cache: ProjectCacheService,
  ) {}

  /** TTL for project-level cached configuration. Long enough to absorb most
   *  reads but short enough that any missed invalidation self-heals quickly. */
  private static readonly PROJECT_CONFIG_TTL_SECONDS = 5 * 60;

  /** TTL for published Version rows (full include with steps + content).
   *  Longer than project-config because published versions are immutable —
   *  see findVersions for the invariant this depends on. */
  private static readonly PUBLISHED_VERSION_TTL_SECONDS = 30 * 60;

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Find custom content versions for a user with optimized performance
   * @param queryContext - Content query context containing environment, externalUserId, and externalCompanyId
   * @param contentTypes - Content types array to filter by
   * @param versionId - Optional specific version ID
   * @returns Array of custom content versions
   */
  async findCustomContentVersions(
    queryContext: ContentQueryContext,
    contentTypes: ContentDataType[],
    versionId?: string,
  ): Promise<CustomContentVersion[]> {
    const { environment, externalUserId, externalCompanyId } = queryContext;
    try {
      // Step 1: Find required data
      const [bizUser, versions] = await Promise.all([
        this.findBizUser(environment, externalUserId),
        this.findVersions(environment, contentTypes, versionId),
      ]);

      if (!bizUser || versions.length === 0) {
        return [];
      }

      // Step 2: Find session data and attributes in parallel
      const contentIds = versions.map((v) => v.content.id);
      const [sessions, attributes] = await Promise.all([
        this.findSessions(contentIds, bizUser.id),
        this.findAttributes(environment),
      ]);

      // Step 3: Process and assemble
      const context: ContentProcessingContext = {
        environment,
        bizUser,
        attributes,
        externalCompanyId,
      };

      return await this.processVersions(versions, context, sessions);
    } catch (error) {
      this.logger.error({
        message: `Error in findCustomContentVersions: ${error.message}`,
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Pre-fetch the union of session/event data for every contentId visible
   * to a toggleContents pass and stash it on the request memo.
   *
   * Background — `toggleContents` walks the 6 ContentDataType values in a
   * for-loop. Each iteration calls `findSessions(contentIds, bizUserId)`
   * which fans out into 4 sub-queries (1 findMany + 2 groupBy + 1 bizEvent
   * findMany). Per-type contentId sets are disjoint, so naively that's
   * 4 × 6 ≈ 24 round-trips for read-only data we could have batched.
   *
   * This method runs the same 4 sub-queries ONCE over the union of all
   * per-type contentIds, then writes the resulting Map into the request
   * memo. Per-type `findSessions` calls peek the memo and return a
   * subset view; on miss they fall through to the original full-query
   * path so this method is purely opportunistic — handlers that don't
   * call it (or scopes that aren't active) keep working unchanged.
   *
   * Sequencing constraint: `handleChecklistCompletedEvents` MUST run
   * before this method on each toggleContents pass — it tracks
   * CHECKLIST_COMPLETED events that flip session state, and pre-fetching
   * before those events fire would snapshot pre-completion sessions and
   * mask just-fired events from per-type evaluation.
   *
   * Mid-loop `createBizSession` calls do NOT need to invalidate the
   * memo: per-type contentIds are disjoint, so a session created for
   * type A's contentId is never read again by type B's findSessions.
   * `hasAvailableSession` / `hasBizEvent` deliberately bypass this memo
   * (see hasBizEvent above) for the cross-type cases where this
   * disjointness assumption breaks.
   */
  async prefetchToggleContentSessions(
    queryContext: ContentQueryContext,
    contentTypes: ContentDataType[],
  ): Promise<void> {
    const { environment, externalUserId } = queryContext;

    // Resolve bizUser + per-type version slices in parallel. findVersions
    // is already cache-backed for single-type calls, so this is mostly
    // Redis GETs.
    const [bizUser, ...versionsByType] = await Promise.all([
      this.findBizUser(environment, externalUserId),
      ...contentTypes.map((type) => this.findVersions(environment, [type])),
    ]);
    if (!bizUser) {
      return;
    }

    const unionContentIds = [
      ...new Set(versionsByType.flat().map((version) => version.content.id)),
    ];
    if (unionContentIds.length === 0) {
      return;
    }

    // Bypass the memo on this single canonical fetch — we ARE the writer.
    const fullMap = await this.findSessionsFromDB(unionContentIds, bizUser.id);
    this.cache.memoSet(this.cache.memoKeys.toggleSessions(bizUser.id), fullMap);
  }

  /**
   * Find themes for a user with optimized performance
   * @param queryContext - Content query context containing environment, externalUserId, and externalCompanyId
   * @returns Array of themes
   */
  async findThemes(queryContext: ContentQueryContext): Promise<Theme[]> {
    const { environment, externalUserId, externalCompanyId } = queryContext;
    // Step 1: Find data
    const [bizUser, themes] = await Promise.all([
      this.findBizUser(environment, externalUserId),
      this.findThemesByProject(environment),
    ]);

    if (themes.length === 0 || !bizUser) {
      return [];
    }

    // Step 2: Process themes
    const attributes = await this.findAttributes(environment);
    const context: ConditionEvaluationContext = {
      environment,
      attributes,
      bizUser,
      externalCompanyId,
    };

    return await this.processThemes(themes, context);
  }

  /**
   * Find published version ID by contentId and environmentId.
   *
   * Cached per (envId, contentId). Invalidated alongside the env's content
   * slices on publish / unpublish / delete (see content.service.ts). The
   * "no published" undefined result is intentionally not cached — its
   * frequency is low and skipping the cache write avoids a sentinel value
   * scheme.
   */
  async findPublishedVersionId(contentId: string, environmentId: string) {
    return await this.cache.get(
      this.cache.keys.publishedVersionId(environmentId, contentId),
      ContentDataService.PROJECT_CONFIG_TTL_SECONDS,
      async () => {
        const contentOnEnvironment = await this.prisma.contentOnEnvironment.findFirst({
          where: {
            environmentId,
            contentId,
            published: true,
            // Defense in depth: deleteContent already drops COE rows,
            // but a stale row from any other write path would otherwise
            // resurface a deleted content's versionId via this cache.
            content: { deleted: false },
          },
          select: {
            publishedVersionId: true,
          },
        });
        return contentOnEnvironment?.publishedVersionId;
      },
    );
  }

  /**
   * Find biz session with events
   * @param id - The biz session ID
   * @param state - The state of the session
   * @returns The biz session with events or null if not found
   */
  async findBizSessionWithEvents(id: string, state = 0): Promise<BizSessionWithEvents | null> {
    return await this.prisma.bizSession.findUnique({
      where: { id, state },
      include: {
        bizEvent: { include: { event: true } },
      },
    });
  }

  /**
   * Find biz session with content and version
   * @param id - The biz session ID
   * @param state - The state of the session
   * @returns The biz session with content and version or null if not found
   */
  async findBizSession(id: string, state = 0): Promise<BizSessionWithContentAndVersion | null> {
    return await this.prisma.bizSession.findUnique({
      where: { id, state },
      include: {
        content: true,
        version: true,
      },
    });
  }

  /**
   * Find the most recent active (state=0) session for a given content and user.
   * Used for the double-check inside the session-creation distributed lock to
   * prevent duplicate sessions when multiple sockets for the same user race.
   * @param contentId - The content ID
   * @param bizUserId - The business user ID
   * @returns The active BizSession or null if none exists
   */
  async findActiveSessionByContentId(
    contentId: string,
    bizUserId: string,
  ): Promise<BizSession | null> {
    return await this.prisma.bizSession.findFirst({
      where: { contentId, bizUserId, state: 0, deleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if the user has a biz event.
   *
   * NOT memoized: trackBizEvent fires SEEN / COMPLETED events mid-EndBatch
   * as toggleContents starts new sessions, so a memo'd pre-event answer
   * would hide just-fired events from later condition evaluation.
   */
  async hasBizEvent(
    contentId: string,
    bizUserId: string,
    eventCodeNames: string[],
  ): Promise<boolean> {
    if (!eventCodeNames || eventCodeNames.length === 0) {
      return false;
    }
    const count = await this.prisma.bizSession.count({
      where: {
        contentId,
        bizUserId,
        deleted: false,
        bizEvent: { some: { event: { codeName: { in: eventCodeNames } } } },
      },
    });
    return count > 0;
  }

  // ============================================================================
  // Data Fetching Methods
  // ============================================================================

  /**
   * Find business user by external ID. Memoized per request scope so the
   * 6-type toggleContents loop + findThemes don't all re-query the same row.
   */
  private async findBizUser(
    environment: Environment,
    externalUserId: string,
  ): Promise<BizUser | null> {
    return this.cache.memoize(
      this.cache.memoKeys.bizUser(environment.id, String(externalUserId)),
      () =>
        this.prisma.bizUser.findFirst({
          where: { externalId: String(externalUserId), environmentId: environment.id },
        }),
    );
  }

  /**
   * Find attributes for content processing.
   *
   * Cached per project: the result depends only on projectId + the fixed
   * CONTENT_ATTRIBUTE_BIZ_TYPES filter, and only changes when the admin
   * mutates Attribute rows (handled by AttributesService write path).
   * Attribute has Date columns but none of the hot-path consumers read
   * them, so caching the entity as-is is safe.
   *
   * Public so SessionBuilderService can reuse the same cache instead of
   * re-querying USER/COMPANY/MEMBERSHIP attributes per session via Prisma.
   */
  async findAttributes(environment: Environment): Promise<Attribute[]> {
    return await this.cache.get(
      this.cache.keys.attrs(environment.projectId),
      ContentDataService.PROJECT_CONFIG_TTL_SECONDS,
      () =>
        this.prisma.attribute.findMany({
          where: {
            projectId: environment.projectId,
            bizType: {
              in: [...ContentDataService.CONTENT_ATTRIBUTE_BIZ_TYPES],
            },
          },
        }),
    );
  }

  /**
   * Find themes by project ID.
   *
   * Cached per project: result depends only on projectId. Invalidated by
   * ThemesService on every create/update/delete. Theme has Date columns
   * but none are read in the EndBatch / session-builder hot path so the
   * JSON round trip is safe.
   */
  private async findThemesByProject(environment: Environment): Promise<Theme[]> {
    return await this.cache.get(
      this.cache.keys.themes(environment.projectId),
      ContentDataService.PROJECT_CONFIG_TTL_SECONDS,
      () =>
        this.prisma.theme.findMany({
          where: { projectId: environment.projectId },
        }),
    );
  }

  /**
   * Find versions for content processing.
   *
   * INVARIANT (cache assumption): a Version row that is currently published
   * is immutable, AND the Content fields we co-cache with it (`{id, type}`)
   * are structurally immutable too — `id` is the PK, `type` cannot be
   * changed by any update path. Mutable Content fields (name, buildUrl,
   * config) live in the env+type slice cache (write-invalidated) and are
   * re-attached at read time. So `versionFull` never needs invalidation
   * from any Content rename / update.
   *
   * The split is by field mutability, not by entity boundary: caching
   * immutable Content fields here is free (no invalidation cost) and lets
   * the explicit-versionId path early-return on a type-filter miss without
   * touching the DB.
   */
  private async findVersions(
    environment: Environment,
    contentTypes: ContentDataType[],
    versionId?: string,
  ): Promise<VersionWithStepsAndContent[]> {
    // Defense in depth on the cache loader: only pin Versions whose Content
    // is still alive. The `where: content.deleted: false` clause prevents a
    // stale source from materializing a deleted-content version into the
    // 30-minute TTL.
    const fetchVersionLite = (id: string) =>
      this.prisma.version.findFirst({
        where: { id, deleted: false, content: { deleted: false } },
        include: {
          content: { select: { id: true, type: true } },
          steps: { orderBy: { sequence: 'asc' } },
        },
      });

    if (versionId) {
      const version = await this.cache.get(
        this.cache.keys.versionFull(versionId),
        ContentDataService.PUBLISHED_VERSION_TTL_SECONDS,
        () => fetchVersionLite(versionId),
      );
      if (!version || !contentTypes.includes(version.content.type as ContentDataType)) {
        return [];
      }
      // Re-fetch the full Content row so callers get the latest mutable
      // fields (name, etc.), and so a delete that landed after the cache
      // populated drops the version from the result set.
      const content = await this.prisma.content.findFirst({
        where: { id: version.content.id, deleted: false },
      });
      if (!content) {
        return [];
      }
      return [{ ...version, content }];
    }

    // Find all published Contents (with their ContentOnEnvironment join rows)
    // for this env + type filter. Cached only when filtering by a single type
    // (which is what the toggleContents loop and handleChecklistCompletedEvents
    // always do); a multi-type query is rare enough to skip caching for.
    const fetchPublishedContents = () =>
      this.prisma.content.findMany({
        where: {
          deleted: false,
          contentOnEnvironments: {
            some: {
              environmentId: environment.id,
              published: true,
            },
          },
          type: {
            in: contentTypes,
          },
        },
        include: {
          contentOnEnvironments: true,
        },
      });

    const publishedContents =
      contentTypes.length === 1
        ? await this.cache.get(
            this.cache.keys.contents(environment.id, contentTypes[0]),
            ContentDataService.PROJECT_CONFIG_TTL_SECONDS,
            fetchPublishedContents,
          )
        : await fetchPublishedContents();

    // Map by id so we can re-attach the full Content row (with the latest
    // name, etc.) onto the slim cached version below.
    const contentById = new Map(publishedContents.map((content) => [content.id, content]));

    // Extract version IDs for published contents
    const versionIds = publishedContents
      .map((content) => getPublishedVersionId(content, environment.id))
      .filter(Boolean);

    if (versionIds.length === 0) {
      return [];
    }

    // Per-version cache; published Version data is immutable so a long TTL
    // is safe. MGET reads all keys in one round trip; misses are loaded with
    // a single findMany so we don't regress cold-cache cost vs the original
    // batched query.
    type CachedVersion = Awaited<ReturnType<typeof fetchVersionLite>>;
    const keyToId = new Map(versionIds.map((id) => [this.cache.keys.versionFull(id), id]));
    const cached = await this.cache.mget<NonNullable<CachedVersion>>(
      [...keyToId.keys()],
      ContentDataService.PUBLISHED_VERSION_TTL_SECONDS,
      async (missingKeys) => {
        const missingIds = missingKeys.map((cacheKey) => keyToId.get(cacheKey) as string);
        const fresh = await this.prisma.version.findMany({
          where: { id: { in: missingIds }, deleted: false, content: { deleted: false } },
          include: {
            content: { select: { id: true, type: true } },
            steps: { orderBy: { sequence: 'asc' } },
          },
        });
        return new Map(fresh.map((version) => [this.cache.keys.versionFull(version.id), version]));
      },
    );
    return versionIds
      .map((id): VersionWithStepsAndContent | null => {
        const version = cached.get(this.cache.keys.versionFull(id));
        if (!version) {
          return null;
        }
        const content = contentById.get(version.content.id);
        // Slice-miss means the Content was filtered out (deleted /
        // unpublished post-cache) — skip the version entirely.
        if (!content) {
          return null;
        }
        return { ...version, content };
      })
      .filter((version): version is VersionWithStepsAndContent => version !== null);
  }

  /**
   * Find session statistics for multiple contents.
   *
   * Reads from the request-scoped union memo when available
   * (populated by `prefetchToggleContentSessions`) to collapse the
   * per-type fan-out in toggleContents to one DB batch. Falls through
   * to the full 4-query path when no prefetched union exists — keeps
   * callers outside the toggleContents pre-fetch path working unchanged.
   */
  private async findSessions(
    contentIds: string[],
    bizUserId: string,
  ): Promise<Map<string, ContentSessionCollection>> {
    const prefetched = this.cache.peekMemo<Map<string, ContentSessionCollection>>(
      this.cache.memoKeys.toggleSessions(bizUserId),
    );
    // Only short-circuit if every requested contentId was part of the
    // pre-fetched union. The explicit-versionId path in findVersions is
    // env-agnostic and can surface contents that prefetch's published-only
    // walk skipped — falling through to the DB then is correct AND keeps
    // the prefetch optimization purely opportunistic.
    if (prefetched && contentIds.every((id) => prefetched.has(id))) {
      const subset = new Map<string, ContentSessionCollection>();
      for (const contentId of contentIds) {
        subset.set(contentId, prefetched.get(contentId) ?? EMPTY_SESSION_COLLECTION);
      }
      return subset;
    }
    return this.findSessionsFromDB(contentIds, bizUserId);
  }

  /**
   * Original 4-query session/event fan-out. Always hits the DB; used by
   * the prefetch entry point and as the fallback for `findSessions`
   * outside the toggleContents pre-fetch flow.
   */
  private async findSessionsFromDB(
    contentIds: string[],
    bizUserId: string,
  ): Promise<Map<string, ContentSessionCollection>> {
    const [activeSessions, totalCounts, completedCounts, events] = await Promise.all([
      this.findSessionsByContent(contentIds, bizUserId, 0),
      this.findSessionCounts(contentIds, bizUserId),
      this.findSessionCounts(contentIds, bizUserId, ContentDataService.COMPLETED_EVENTS),
      this.findEventsByContentIds(contentIds, bizUserId),
    ]);

    // Process latestEvents and latestDismissedEvents from the same events data
    const latestEvents = this.getLatestEventByContentType(events, contentIds);
    const latestDismissedEvents = this.getLatestDismissedEvents(events);

    const sessions = new Map<string, ContentSessionCollection>();

    for (const contentId of contentIds) {
      const activeSession = activeSessions.get(contentId) || null;
      const totalSessions = totalCounts.get(contentId) ?? 0;
      const completedSessions = completedCounts.get(contentId) ?? 0;
      const latestEvent = latestEvents.get(contentId);
      const latestDismissedEvent = latestDismissedEvents.get(contentId);

      sessions.set(contentId, {
        activeSession,
        totalSessions,
        completedSessions,
        latestEvent,
        latestDismissedEvent,
      });
    }

    return sessions;
  }

  /**
   * Find sessions for contents
   * @param contentIds - Array of content IDs
   * @param bizUserId - Business user ID
   * @param state - Optional state filter (e.g., 0 for active sessions)
   * @returns Array of sessions with events
   */
  private async findSessionsByContent(
    contentIds: string[],
    bizUserId: string,
    state?: number,
  ): Promise<Map<string, BizSessionWithEvents>> {
    const sessionMap = new Map<string, BizSessionWithEvents>();

    if (contentIds.length === 0) {
      return sessionMap;
    }

    const where: Prisma.BizSessionWhereInput = {
      contentId: { in: contentIds },
      bizUserId,
      deleted: false,
    };

    if (state !== undefined) {
      where.state = state;
    }

    const sessions = await this.prisma.bizSession.findMany({
      where,
      include: { bizEvent: { include: { event: true } } },
      orderBy: { createdAt: 'desc' },
      distinct: ['contentId'],
    });

    // Convert array to map by contentId (first occurrence is the latest due to orderBy)
    for (const session of sessions) {
      if (!sessionMap.has(session.contentId)) {
        sessionMap.set(session.contentId, session);
      }
    }

    return sessionMap;
  }

  /**
   * Find all events for content IDs
   * @param contentIds - Array of content IDs to find events for
   * @param bizUserId - Business user ID (globally unique, determines environment)
   * @returns Array of events with bizSession and content info, ordered by createdAt desc
   */
  private async findEventsByContentIds(
    contentIds: string[],
    bizUserId: string,
  ): Promise<BizEventWithSessionAndContent[]> {
    if (contentIds.length === 0) {
      return [];
    }

    return await this.prisma.bizEvent.findMany({
      where: {
        bizUserId,
        bizSession: {
          contentId: { in: contentIds },
          deleted: false,
        },
      },
      include: {
        event: true,
        bizSession: {
          select: {
            contentId: true,
            content: {
              select: {
                type: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get latest dismissed events for each content ID
   * @param events - Array of events with bizSession and content info, ordered by createdAt desc
   * @returns Map of contentId to latest dismissed event
   */
  private getLatestDismissedEvents(
    events: BizEventWithSessionAndContent[],
  ): Map<string, BizEventWithEvent> {
    const latestDismissedEvents = new Map<string, BizEventWithEvent>();

    for (const event of events) {
      const contentId = event.bizSession?.contentId;
      const eventCodeName = event.event?.codeName;
      if (
        contentId &&
        eventCodeName &&
        DISMISSED_EVENTS.includes(eventCodeName as (typeof DISMISSED_EVENTS)[number]) &&
        !latestDismissedEvents.has(contentId)
      ) {
        const { bizSession, ...eventWithEvent } = event;
        latestDismissedEvents.set(contentId, eventWithEvent as BizEventWithEvent);
      }
    }

    return latestDismissedEvents;
  }

  /**
   * Get latest event for each contentId from other contents with the same contentType
   * @param events - Array of events with bizSession and content info, ordered by createdAt desc
   * @param contentIds - Array of content IDs to find latest events for
   * @returns Map of contentId to latest event from other contents with same contentType
   */
  private getLatestEventByContentType(
    events: BizEventWithSessionAndContent[],
    contentIds: string[],
  ): Map<string, BizEventWithEvent> {
    const latestEventMap = new Map<string, BizEventWithEvent>();

    if (contentIds.length === 0 || events.length === 0) {
      return latestEventMap;
    }

    // Build contentId -> contentType map
    const contentTypeMap = new Map<string, ContentDataType>();
    for (const event of events) {
      const contentId = event.bizSession?.contentId;
      const contentType = event.bizSession?.content?.type as ContentDataType | undefined;
      if (contentId && contentType && !contentTypeMap.has(contentId)) {
        contentTypeMap.set(contentId, contentType);
      }
    }

    // For each contentId, find the first event from other contents with same contentType
    for (const contentId of contentIds) {
      const contentType = contentTypeMap.get(contentId);
      if (!contentType) {
        continue;
      }

      const latestEvent = events.find(
        (event) =>
          event.bizSession?.contentId !== contentId &&
          event.bizSession?.content?.type === contentType,
      );
      if (latestEvent) {
        const { bizSession, ...bizEventWithEvent } = latestEvent;
        latestEventMap.set(contentId, bizEventWithEvent);
      }
    }

    return latestEventMap;
  }

  /**
   * Find session counts by content ID
   */
  private async findSessionCounts(
    contentIds: string[],
    bizUserId: string,
    eventCodeNames?: readonly string[],
  ): Promise<Map<string, number>> {
    // Build base where condition
    const where: Prisma.BizSessionWhereInput = {
      contentId: { in: contentIds },
      bizUserId,
      deleted: false,
    };

    // Add event filter if eventCodeNames is provided
    if (eventCodeNames) {
      where.bizEvent = {
        some: {
          event: {
            codeName: { in: [...eventCodeNames] },
          },
        },
      };
    }

    const results = await this.prisma.bizSession.groupBy({
      by: ['contentId'],
      where,
      _count: { id: true },
    });

    return new Map(results.map((result) => [result.contentId, result._count.id]));
  }

  // ============================================================================
  // Content Processing Methods
  // ============================================================================

  // ----------------------------------------------------------------------------
  // Config Processing
  // ----------------------------------------------------------------------------

  /**
   * Process configuration and return processed config with activated rules
   * @param version - The version containing the config
   * @param context - Condition evaluation context
   * @returns Processed configuration with activated rules
   */
  private async processConfig(
    version: Version,
    context: ConditionEvaluationContext,
  ): Promise<ContentConfigObject> {
    const config = buildConfig(version.config as ContentConfigObject | undefined);

    const [autoStartRules, hideRules] = await Promise.all([
      this.evaluateConfigRules(config.enabledAutoStartRules, config.autoStartRules, context),
      this.evaluateConfigRules(config.enabledHideRules, config.hideRules, context),
    ]);

    return {
      ...config,
      autoStartRules,
      hideRules,
    };
  }

  /**
   * Evaluate config rules if enabled and rules exist
   * @param enabled - Whether the rules are enabled
   * @param rules - The rules to evaluate
   * @param context - Condition evaluation context
   * @returns Evaluated rules or empty array
   */
  private async evaluateConfigRules(
    enabled: boolean,
    rules: RulesCondition[],
    context: ConditionEvaluationContext,
  ): Promise<RulesCondition[]> {
    if (!enabled || !rules || rules.length === 0) {
      return [];
    }
    return await this.conditionEvaluationService.evaluateRulesConditions(rules, context);
  }

  // ----------------------------------------------------------------------------
  // Version Processing
  // ----------------------------------------------------------------------------

  /**
   * Process a single version
   */
  private async processVersion(
    params: VersionProcessingParams,
  ): Promise<CustomContentVersion | null> {
    const { version, context, session } = params;

    if (!version) {
      return null;
    }

    const evaluationContext: ConditionEvaluationContext = {
      environment: context.environment,
      attributes: context.attributes,
      bizUser: context.bizUser,
      externalCompanyId: context.externalCompanyId,
    };

    const [config, data, steps] = await Promise.all([
      this.processConfig(version, evaluationContext),
      this.evaluateVersionData(version, evaluationContext),
      this.conditionEvaluationService.evaluateStepTriggers(version.steps, evaluationContext),
    ]);

    return {
      ...version,
      data,
      steps,
      config,
      content: version.content,
      session,
    };
  }

  /**
   * Process multiple versions in parallel
   */
  private async processVersions(
    versions: VersionWithStepsAndContent[],
    context: ContentProcessingContext,
    sessions: Map<string, ContentSessionCollection>,
  ): Promise<CustomContentVersion[]> {
    const versionsWithSessions: VersionWithSession[] = versions
      .map((version) => {
        const session = sessions.get(version.content.id);
        return session ? { version, session } : null;
      })
      .filter((item): item is VersionWithSession => item !== null);

    const processedVersions = await Promise.all(
      versionsWithSessions.map(({ version, session }) =>
        this.processVersion({ version, context, session }),
      ),
    );

    return processedVersions.filter((v): v is CustomContentVersion => v !== null);
  }

  /**
   * Evaluate version data based on content type
   */
  private async evaluateVersionData(
    version: VersionWithStepsAndContent,
    context: ConditionEvaluationContext,
  ): Promise<JsonValue> {
    const { content } = version;
    if (content.type === ContentDataType.CHECKLIST) {
      const checklistData = await this.conditionEvaluationService.evaluateChecklistConditions(
        version.data as unknown as ChecklistData,
        context,
      );
      return checklistData as unknown as JsonValue;
    }
    if (content.type === ContentDataType.RESOURCE_CENTER) {
      const resourceCenterData =
        await this.conditionEvaluationService.evaluateResourceCenterConditions(
          version.data as unknown as ResourceCenterData,
          context,
        );
      return resourceCenterData as unknown as JsonValue;
    }
    return version.data ?? null;
  }

  // ----------------------------------------------------------------------------
  // Theme Processing
  // ----------------------------------------------------------------------------

  /**
   * Process a single theme with condition evaluation
   */
  private async processTheme(theme: Theme, context: ConditionEvaluationContext): Promise<Theme> {
    if (!isArray(theme.variations) || (theme.variations as any[]).length === 0) {
      return theme;
    }
    const variations = theme.variations as ThemeVariation[];

    const processedVariations = await Promise.all(
      variations.map(async (variation) => {
        const processedConditions = variation.conditions
          ? await this.conditionEvaluationService.evaluateRulesConditions(
              variation.conditions,
              context,
            )
          : [];

        return {
          ...variation,
          conditions: processedConditions,
        };
      }),
    );

    return {
      ...theme,
      variations: processedVariations,
    };
  }

  /**
   * Process themes with condition evaluation
   */
  private async processThemes(
    themes: Theme[],
    context: ConditionEvaluationContext,
  ): Promise<Theme[]> {
    return await Promise.all(themes.map((theme) => this.processTheme(theme, context)));
  }
}
