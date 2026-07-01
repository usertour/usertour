import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  AnnouncementData,
  AnnouncementListItem,
  BizEvents,
  ContentDataType,
  ContentEditorRoot,
  RulesCondition,
} from '@usertour/types';
import { BizUser, Environment } from '@/common/types/schema';
import { extractUserAttrCodes } from '@/utils/content-utils';
import { ContentDataService } from './content-data.service';
import {
  ConditionEvaluationService,
  type ConditionEvaluationContext,
} from './condition-evaluation.service';

// Minimal view of a version's `config` JSON needed to gate an announcement by
// its "Only show if..." targeting rules.
type AnnouncementTargetingConfig = {
  enabledAutoStartRules?: boolean;
  autoStartRules?: RulesCondition[];
};

/**
 * A published announcement that passed its "Only show if..." targeting for the
 * current user. The feed (WebSocketV2Service.listAnnouncements) and the launcher
 * badge count (SessionBuilderService) both read from here, so their visibility
 * can never diverge.
 */
export interface VisibleAnnouncement {
  contentId: string;
  content: { id: string; name: string | null };
  publishedVersion: { id: string; data: unknown; scheduledAt: Date | null };
}

/**
 * Single source of the announcement query / targeting / seen pipeline shared by
 * the feed and the launcher badge. Owning it here keeps the two read paths from
 * drifting (which would make the badge count and the feed disagree).
 */
@Injectable()
export class AnnouncementService {
  // Announcements older than the newest N are not shown; the cap bounds both the
  // feed scan and the targeting evaluation.
  static readonly SCAN_LIMIT = 50;

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
      where: {
        environmentId: environment.id,
        published: true,
        content: { type: ContentDataType.ANNOUNCEMENT, deleted: false },
        publishedVersion: {
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
        },
      },
      include: {
        content: { select: { id: true, name: true } },
        publishedVersion: { select: { id: true, data: true, config: true, scheduledAt: true } },
      },
      orderBy: { publishedVersion: { scheduledAt: 'desc' } },
      take: limit,
    });

    const context = await this.buildEvaluationContext(environment, bizUser, externalCompanyId);
    const visibility = await Promise.all(
      candidates.map((item) =>
        item.publishedVersion
          ? this.conditionEvaluationService.isVisibleByAutoStartRules(
              item.publishedVersion.config as unknown as AnnouncementTargetingConfig,
              context,
            )
          : Promise.resolve(false),
      ),
    );

    const visible: VisibleAnnouncement[] = [];
    candidates.forEach((item, index) => {
      if (visibility[index] && item.publishedVersion) {
        visible.push({
          contentId: item.contentId,
          content: item.content,
          publishedVersion: item.publishedVersion,
        });
      }
    });
    return visible;
  }

  /**
   * Seen status is derived from ANNOUNCEMENT_SEEN events — a set-membership
   * check, no separate table.
   */
  async getSeenAnnouncementIds(
    bizUserId: string,
    contentIds: string[],
    environmentId: string,
  ): Promise<Set<string>> {
    if (contentIds.length === 0) return new Set();

    const seenEvents = await this.prisma.bizEvent.findMany({
      where: {
        bizUserId,
        contentId: { in: contentIds },
        event: {
          codeName: BizEvents.ANNOUNCEMENT_SEEN,
          project: { environments: { some: { id: environmentId } } },
        },
      },
      select: { contentId: true },
      distinct: ['contentId'],
    });
    return new Set(seenEvents.filter((event) => event.contentId).map((event) => event.contentId!));
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
   * two read paths must expose identical values. `time` is the scheduledAt (the
   * "Announcement time"), which publish stamps on first publish — always set for
   * a published announcement (legacy rows are backfilled) — so there is no
   * publishedAt fallback.
   */
  buildListItem(
    content: { id: string },
    publishedVersion: { id: string; data: unknown; scheduledAt: Date | null },
    seen: boolean,
  ): AnnouncementListItem {
    const data = (publishedVersion.data ?? {}) as unknown as AnnouncementData;
    return {
      id: content.id,
      versionId: publishedVersion.id,
      title: data.title,
      content: data.introContent ?? [],
      moreEnabled: data.enableReadMore ?? false,
      moreButtonText: data.readMoreLabel ?? 'Read more',
      level: data.distribution ?? 'silent',
      seen,
      time: publishedVersion.scheduledAt?.toISOString() ?? '',
    };
  }
}
