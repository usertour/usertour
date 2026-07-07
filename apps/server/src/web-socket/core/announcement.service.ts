import { cuid, matchTranslationByLocale, mergeLocalizedVersionData } from '@usertour/helpers';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  AnnouncementData,
  AnnouncementItemBase,
  ContentDataType,
  ContentEditorRoot,
  PopupAnnouncement,
  ThemeTypesSetting,
  UserAttributes,
} from '@usertour/types';
import {
  ANNOUNCEMENT_FEED_SCAN_LIMIT,
  DEFAULT_ANNOUNCEMENT_DATA,
  DEFAULT_POPUP_CONFIG,
} from '@usertour/constants';
import { BizUser, Environment } from '@/common/types/schema';
import { extractUserAttrCodes, getAttributeValue } from '@/utils/content-utils';
import { ContentDataService } from './content-data.service';
import {
  type AutoStartRulesConfig,
  ConditionEvaluationService,
  type ConditionEvaluationContext,
} from './condition-evaluation.service';

/**
 * A published announcement that passed its "Only show if..." targeting for the
 * current user. The feed (WebSocketV2Service.listAnnouncements) and the launcher
 * badge count (SessionBuilderService) both read from here, so their visibility
 * can never diverge.
 */
export interface VisibleAnnouncement {
  contentId: string;
  content: { id: string; name: string | null };
  publishedVersion: {
    id: string;
    data: unknown;
    scheduledAt: Date | null;
    themeId: string | null;
  };
}

/**
 * Narrow a candidate row to one whose publishedVersion is present. The candidate
 * gate filters on the publishedVersion relation so it's always set in practice,
 * but the Prisma include types it as nullable — this keeps that narrowing in one
 * place instead of repeating the type predicate at every filter site.
 */
const hasPublishedVersion = <T extends { publishedVersion: unknown }>(
  item: T,
): item is T & { publishedVersion: NonNullable<T['publishedVersion']> } =>
  item.publishedVersion != null;

/**
 * Single source of the announcement query / targeting / seen pipeline shared by
 * the feed and the launcher badge. Owning it here keeps the two read paths from
 * drifting (which would make the badge count and the feed disagree).
 */
@Injectable()
export class AnnouncementService {
  // Announcements older than the newest N are not shown; the cap bounds both the
  // feed scan and the targeting evaluation. Shared with the mark-seen payload
  // validator via @usertour/constants so the two can't drift.
  static readonly SCAN_LIMIT = ANNOUNCEMENT_FEED_SCAN_LIMIT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentDataService: ContentDataService,
    private readonly conditionEvaluationService: ConditionEvaluationService,
  ) {}

  async buildEvaluationContext(
    environment: Environment,
    bizUser: BizUser,
    externalCompanyId: string,
  ): Promise<ConditionEvaluationContext> {
    const attributes = await this.contentDataService.findAttributes(environment);
    return { environment, attributes, bizUser, externalCompanyId };
  }

  // The candidate gate shared by the feed scan and the by-id fetch: a published,
  // non-deleted announcement whose scheduledAt has passed (or is unset). Keeping
  // it in one place stops the feed and the direct fetch from drifting on a
  // security-sensitive visibility decision.
  private announcementCandidateWhere(environmentId: string) {
    return {
      environmentId,
      published: true,
      content: { type: ContentDataType.ANNOUNCEMENT, deleted: false },
      publishedVersion: {
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
    };
  }

  /**
   * The per-user "Only show if..." targeting decision, in one place. Both read
   * paths (feed scan, by-id fetch) filter through here so the feed, the direct
   * fetch, and the badge can never diverge on who may see an announcement.
   * Candidates with no publishedVersion are dropped; untargeted ones
   * short-circuit inside isVisibleByAutoStartRules without a DB hit.
   */
  private async filterByTargeting<T extends { publishedVersion: { config: unknown } | null }>(
    candidates: T[],
    environment: Environment,
    bizUser: BizUser,
    externalCompanyId: string,
  ): Promise<T[]> {
    if (candidates.length === 0) {
      return [];
    }
    const context = await this.buildEvaluationContext(environment, bizUser, externalCompanyId);
    const visibility = await Promise.all(
      candidates.map((item) =>
        item.publishedVersion
          ? this.conditionEvaluationService.isVisibleByAutoStartRules(
              item.publishedVersion.config as unknown as AutoStartRulesConfig,
              context,
            )
          : Promise.resolve(false),
      ),
    );
    return candidates.filter((_item, index) => visibility[index]);
  }

  /**
   * Newest N published announcements whose scheduledAt has passed (or is unset),
   * filtered to those the user may see per their targeting. Ordered by
   * scheduledAt desc — publish stamps scheduledAt on first publish, so the order
   * matches the client's date grouping. Targeting is evaluated concurrently;
   * untargeted announcements short-circuit without a DB hit.
   */
  async findVisibleAnnouncements(
    environment: Environment,
    bizUser: BizUser,
    externalCompanyId: string,
    limit: number = AnnouncementService.SCAN_LIMIT,
  ): Promise<VisibleAnnouncement[]> {
    const candidates = await this.prisma.contentOnEnvironment.findMany({
      where: this.announcementCandidateWhere(environment.id),
      include: {
        content: { select: { id: true, name: true } },
        publishedVersion: {
          select: {
            id: true,
            data: true,
            config: true,
            scheduledAt: true,
            themeId: true,
            versionOnLocalization: {
              where: { enabled: true },
              select: { localized: true, localization: { select: { code: true } } },
            },
          },
        },
      },
      orderBy: { publishedVersion: { scheduledAt: 'desc' } },
      take: limit,
    });

    const visible = await this.filterByTargeting(
      candidates,
      environment,
      bizUser,
      externalCompanyId,
    );
    return visible.filter(hasPublishedVersion).map((item) => ({
      contentId: item.contentId,
      content: item.content,
      publishedVersion: this.localizePublishedVersion(item.publishedVersion, bizUser),
    }));
  }

  /**
   * Fetch a single published announcement by id and apply the SAME targeting
   * gate the feed uses, so a direct by-id fetch can't expose an announcement the
   * feed would hide. Returns null when it doesn't exist, hasn't reached its
   * scheduledAt, or is targeted away from this user (including when there is no
   * bizUser to evaluate against).
   */
  async findVisibleAnnouncementById(
    contentId: string,
    environment: Environment,
    bizUser: BizUser | null,
    externalCompanyId: string,
  ): Promise<VisibleAnnouncement | null> {
    // Fail fast on a missing id: `contentId: undefined` in a Prisma where is
    // silently dropped, which would turn this by-id lookup into "first
    // visible announcement".
    if (!contentId) {
      return null;
    }

    const item = await this.prisma.contentOnEnvironment.findFirst({
      where: { ...this.announcementCandidateWhere(environment.id), contentId },
      include: {
        content: { select: { id: true, name: true } },
        publishedVersion: {
          select: {
            id: true,
            data: true,
            config: true,
            scheduledAt: true,
            themeId: true,
            versionOnLocalization: {
              where: { enabled: true },
              select: { localized: true, localization: { select: { code: true } } },
            },
          },
        },
      },
    });
    if (!item?.publishedVersion) {
      return null;
    }

    const config = item.publishedVersion.config as unknown as AutoStartRulesConfig;
    if (bizUser) {
      const [visible] = await this.filterByTargeting(
        [item],
        environment,
        bizUser,
        externalCompanyId,
      );
      if (!visible) {
        return null;
      }
    } else if (config?.enabledAutoStartRules && config.autoStartRules?.length) {
      // No user to evaluate against, but the announcement is targeted → deny.
      return null;
    }

    return {
      contentId: item.contentId,
      content: item.content,
      publishedVersion: this.localizePublishedVersion(item.publishedVersion, bizUser),
    };
  }

  /**
   * Substitute the user's locale translation into the announcement's version
   * data — same matching rules as the session delivery pipeline (exact locale
   * first, then primary language subtag). Every announcement read path (feed,
   * by-id detail, popup) flows through the two find methods above, so
   * localizing here covers all surfaces, including the attribute extraction
   * that runs on the returned content.
   */
  private localizePublishedVersion(
    publishedVersion: {
      id: string;
      data: unknown;
      scheduledAt: Date | null;
      themeId: string | null;
      versionOnLocalization: { localized: unknown; localization: { code: string } }[];
    },
    bizUser: BizUser | null,
  ): VisibleAnnouncement['publishedVersion'] {
    const { versionOnLocalization, ...version } = publishedVersion;
    if (versionOnLocalization.length === 0 || !bizUser || !version.data) {
      return version;
    }
    const localeCode = getAttributeValue(bizUser.data, UserAttributes.LOCALE_CODE);
    if (typeof localeCode !== 'string' || localeCode.trim() === '') {
      return version;
    }
    const matched = matchTranslationByLocale(versionOnLocalization, localeCode);
    if (!matched?.localized) {
      return version;
    }
    return {
      ...version,
      data: mergeLocalizedVersionData(
        ContentDataType.ANNOUNCEMENT,
        version.data,
        matched.localized,
      ),
    };
  }

  /**
   * Seen status reads from the BizAnnouncementSeen read-state table — one row
   * per (user, announcement). The ANNOUNCEMENT_SEEN analytics event is derived
   * from this state (fired when the row is first inserted), not the other way
   * around, so analytics retention can never un-see an announcement.
   */
  async getSeenAnnouncementIds(bizUserId: string, contentIds: string[]): Promise<Set<string>> {
    if (contentIds.length === 0) return new Set();

    const seenRows = await this.prisma.bizAnnouncementSeen.findMany({
      where: { bizUserId, contentId: { in: contentIds } },
      select: { contentId: true },
    });
    return new Set(seenRows.map((row) => row.contentId));
  }

  /**
   * Record that the user has seen the given announcements and return the ones
   * seen for the FIRST time by this call, each with its authoritative
   * published versionId.
   *
   * Gated ONLY by the shared candidate gate (a published, non-deleted,
   * schedule-reached announcement in this environment). It deliberately does NOT
   * re-evaluate "Only show if..." targeting at mark time: seen-state must be
   * permanent once the user has acted on a popup/feed item. Re-checking targeting
   * would silently drop a dismiss made after the user's attributes drifted out of
   * the rule (e.g. free→pro mid-session), and the popup would re-pop once they
   * matched again — breaking the "a dismiss is permanent" dual of the
   * popup-exists=unread invariant. A crafted client could at most mark a
   * published-but-targeted-away announcement (an inert seen row + one view); that
   * bounded risk is preferable to re-popping dismissed popups. The versionId is
   * derived from the published version here, never taken from the client, so the
   * analytics event can't be pointed at a foreign or stale version.
   *
   * Known, accepted trade-off: the candidate gate still requires published +
   * schedule-reached AT MARK TIME. If an admin unpublishes or reschedules an
   * announcement in the seconds a user has its popup on screen, that dismiss
   * isn't recorded and the popup can re-appear if it goes live again. The window
   * is seconds-wide and admin-triggered; unpublish also deletes the
   * ContentOnEnvironment row (so there's no version to attribute anyway), so we
   * keep the gate as-is rather than loosen a data-integrity path for it.
   *
   * The write is a single INSERT .. ON CONFLICT DO NOTHING RETURNING on the
   * (bizUserId, contentId) unique key: idempotent under concurrent marks (feed
   * refetch, second tab) with no locking, and the RETURNING set is exactly the
   * first-seen edge — the caller fires one ANNOUNCEMENT_SEEN analytics event
   * per returned item, so views are never double-counted.
   */
  async markAnnouncementsSeen(
    environment: Environment,
    bizUser: BizUser,
    contentIds: string[],
  ): Promise<{ contentId: string; versionId: string }[]> {
    const uniqueIds = [...new Set(contentIds)];
    if (uniqueIds.length === 0) {
      return [];
    }

    const candidates = await this.prisma.contentOnEnvironment.findMany({
      where: { ...this.announcementCandidateWhere(environment.id), contentId: { in: uniqueIds } },
      include: { publishedVersion: { select: { id: true } } },
    });
    const visible = candidates.filter(hasPublishedVersion);
    if (visible.length === 0) {
      return [];
    }

    const versionIdByContentId = new Map(
      visible.map((item) => [item.contentId, item.publishedVersion.id]),
    );
    const values = Prisma.join(
      // Raw SQL bypasses the Prisma client, so @default(cuid()) never applies —
      // supply the id here, in the same cuid style the schema declares.
      visible.map((item) => Prisma.sql`(${cuid()}, ${bizUser.id}, ${item.contentId})`),
    );
    const inserted = await this.prisma.$queryRaw<{ contentId: string }[]>`
      INSERT INTO "BizAnnouncementSeen" ("id", "bizUserId", "contentId")
      VALUES ${values}
      ON CONFLICT ("bizUserId", "contentId") DO NOTHING
      RETURNING "contentId"
    `;
    return inserted.map((row) => ({
      contentId: row.contentId,
      // Non-null: every inserted contentId came from `visible`, which is keyed here.
      versionId: versionIdByContentId.get(row.contentId) as string,
    }));
  }

  /**
   * Resolve the user-attribute values referenced across the given announcement
   * content blobs (intro / detail), returned as a codeName → value map. The
   * feed's content isn't part of the resource-center session, so its attributes
   * aren't in the session's userAttributes; the widget merges this to
   * interpolate them (otherwise every attribute renders its fallback).
   */
  async resolveContentAttributes(
    contents: unknown[],
    environment: Environment,
    externalUserId: string,
    externalCompanyId: string,
  ): Promise<Record<string, any>> {
    const attrCodes = [
      ...new Set(
        contents.flatMap((content) =>
          Array.isArray(content) ? extractUserAttrCodes(content as ContentEditorRoot[]) : [],
        ),
      ),
    ];
    if (attrCodes.length === 0) {
      return {};
    }

    const resolved = await this.contentDataService.resolveSessionAttributes(
      [],
      environment,
      externalUserId,
      externalCompanyId,
      attrCodes,
    );
    return Object.fromEntries(resolved.map((attr) => [attr.codeName, attr.value]));
  }

  /**
   * Shared field mapping for an announcement's feed row and its detail view: the
   * two read paths must expose identical values. `seen` is per-read-path, so the
   * caller adds it where the contract carries it (the feed). `time` is the
   * scheduledAt (the "Announcement time"), which publish stamps on first publish
   * — always set for a published announcement (legacy rows are backfilled) — so
   * there is no publishedAt fallback.
   */
  buildItemBase(
    content: { id: string },
    publishedVersion: { id: string; data: unknown; scheduledAt: Date | null },
  ): AnnouncementItemBase {
    const data = (publishedVersion.data ?? {}) as unknown as AnnouncementData;
    return {
      id: content.id,
      versionId: publishedVersion.id,
      title: data.title,
      content: data.introContent ?? [],
      moreEnabled: data.enableReadMore ?? false,
      moreButtonText: data.readMoreLabel ?? 'Read more',
      level: data.distribution ?? DEFAULT_ANNOUNCEMENT_DATA.distribution,
      time: publishedVersion.scheduledAt?.toISOString() ?? '',
    };
  }

  /**
   * Build the self-presenting popup payload for a visible POPUP-level
   * announcement. The popup renders outside both the RC session and the feed,
   * so what it shows — intro content, its resolved attribute values, and the
   * announcement's own theme (per version.themeId, resolved through the same
   * variation-aware pipeline flows use) — is bundled here to avoid a second
   * round trip at presentation time. Detail content is NOT bundled: Read more
   * navigates into the resource center's detail view, which fetches it on
   * demand.
   */
  async buildPopupAnnouncement(
    visible: VisibleAnnouncement,
    environment: Environment,
    externalUserId: string,
    externalCompanyId: string,
  ): Promise<PopupAnnouncement> {
    const data = (visible.publishedVersion.data ?? {}) as unknown as AnnouncementData;

    const [attributes, themes] = await Promise.all([
      this.resolveContentAttributes(
        [data.introContent],
        environment,
        externalUserId,
        externalCompanyId,
      ),
      this.contentDataService.findThemes({ environment, externalUserId, externalCompanyId }),
    ]);
    const theme = themes.find((item) => item.id === visible.publishedVersion.themeId);

    return {
      ...this.buildItemBase(visible.content, visible.publishedVersion),
      moreContent: null,
      attributes,
      popupConfig: data.popupConfig ?? DEFAULT_POPUP_CONFIG,
      themeSettings: theme ? (theme.settings as unknown as ThemeTypesSetting) : undefined,
    };
  }
}
