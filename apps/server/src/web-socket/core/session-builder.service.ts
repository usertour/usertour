import { AttributeBizType, Attribute } from '@/attributes/models/attribute.model';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  BannerData,
  BizEvents,
  ChecklistData,
  ContentDataType,
  LauncherData,
  ResourceCenterBlockType,
  ResourceCenterData,
  RulesCondition,
  ThemeTypesSetting,
  ThemeVariation,
} from '@usertour/types';
import type { ResourceCenterAnnouncementBlock } from '@usertour/types';
import {
  extractStepTriggerAttributeIds,
  extractStepContentAttrCodes,
  extractThemeVariationsAttributeIds,
  getAttributeValue,
  evaluateChecklistItemsWithContext,
  evaluateResourceCenterBlocksWithContext,
  extractLauncherAttrCodes,
  isExpandPending,
  extractChecklistAttrCodes,
  extractBannerAttrCodes,
  extractButtonConditionAttributeIds,
  extractAttributeIdsFromConditions,
  extractResourceCenterAttrCodes,
} from '@/utils/content-utils';
import { CustomContentSession, SessionTheme, SessionStep, SessionAttribute } from '@usertour/types';
import {
  CustomContentVersion,
  SocketData,
  Environment,
  Step,
  Theme,
  BizSession,
} from '@/common/types';
import { ContentDataService } from './content-data.service';
import {
  ConditionEvaluationService,
  type ConditionEvaluationContext,
} from './condition-evaluation.service';
import { ProjectsService } from '@/projects/projects.service';
import { DistributedLockService } from './distributed-lock.service';
import { buildSessionCreateLockKey } from '@/utils/websocket-utils';
import { ProjectCacheService } from '@/shared/project-cache.service';

// Cap on how many of the newest announcements the badge count scans + evaluates
// per session build. Keep aligned with WebSocketV2Service.ANNOUNCEMENT_LIMIT so
// the badge never counts more than the feed can show.
const ANNOUNCEMENT_BADGE_SCAN_LIMIT = 50;

@Injectable()
export class SessionBuilderService {
  private readonly logger = new Logger(SessionBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentDataService: ContentDataService,
    private readonly conditionEvaluationService: ConditionEvaluationService,
    private readonly projectsService: ProjectsService,
    private readonly distributedLockService: DistributedLockService,
    private readonly cache: ProjectCacheService,
  ) {}

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Create a biz session
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param externalCompanyId - The external company ID
   * @param versionId - The version ID
   * @returns The created session
   */
  /**
   * Idempotently find or create a biz session for singleton content types (FLOW, CHECKLIST).
   * Uses a per-user per-content distributed lock + DB double-check to prevent duplicate
   * sessions when the same user has multiple concurrent sockets (e.g. two browser tabs).
   * @returns `{ session, isNew }` — `isNew` tells the caller whether to track a start event
   */
  async findOrCreateBizSession(
    environment: Environment,
    externalUserId: string,
    externalCompanyId: string,
    versionId: string,
    bizUserId: string,
    contentId: string,
  ): Promise<{ session: BizSession; isNew: boolean } | null> {
    const lockKey = buildSessionCreateLockKey(environment.id, externalUserId, contentId);
    const result = await this.distributedLockService.withRetryLock(
      lockKey,
      async () => {
        // Double-check: another socket may have created the session while we waited for the lock
        const existing = await this.contentDataService.findActiveSessionByContentId(
          contentId,
          bizUserId,
        );
        if (existing) {
          this.logger.debug(`Reusing session created by concurrent socket: ${existing.id}`);
          return { session: existing, isNew: false };
        }
        const session = await this.createBizSession(
          environment,
          externalUserId,
          externalCompanyId,
          versionId,
        );
        return session ? { session, isNew: true } : null;
      },
      5, // retry attempts
      300, // retry interval ms
      5000, // lock timeout ms
    );
    return result ?? null;
  }

  /**
   * Create a biz session
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param externalCompanyId - The external company ID
   * @param versionId - The version ID
   * @returns The created session
   */
  async createBizSession(
    environment: Environment,
    externalUserId: string,
    externalCompanyId: string,
    versionId: string,
  ): Promise<BizSession | null> {
    const environmentId = environment.id;
    const bizUser = await this.cache.memoize(
      this.cache.memoKeys.bizUser(environmentId, String(externalUserId)),
      () =>
        this.prisma.bizUser.findFirst({
          where: { externalId: String(externalUserId), environmentId },
        }),
    );
    const bizCompany = await this.cache.memoize(
      this.cache.memoKeys.bizCompany(environmentId, String(externalCompanyId)),
      () =>
        this.prisma.bizCompany.findFirst({
          where: { externalId: String(externalCompanyId), environmentId },
        }),
    );
    if (!bizUser || (externalCompanyId && !bizCompany)) {
      return null;
    }

    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      include: {
        content: true,
      },
    });

    if (!version) {
      return null;
    }

    return await this.prisma.bizSession.create({
      data: {
        state: 0,
        progress: 0,
        projectId: environment.projectId,
        environmentId: environment.id,
        bizUserId: bizUser.id,
        contentId: version.content.id,
        versionId,
        bizCompanyId: externalCompanyId ? bizCompany.id : null,
      },
    });
  }

  /**
   * Update the current step ID for a biz session
   * @param sessionId - The session ID
   * @param currentStepId - The current step ID
   * @returns The updated biz session or null if not found
   */
  async updateCurrentStepId(sessionId: string, currentStepId: string): Promise<BizSession | null> {
    return await this.prisma.bizSession.update({
      where: { id: sessionId },
      data: { currentStepId },
    });
  }

  /**
   * Update the version ID for a biz session
   * @param sessionId - The session ID
   * @param versionId - The version ID
   * @returns The updated biz session or null if not found
   */
  async updateBizSessionVersionId(
    sessionId: string,
    versionId: string,
  ): Promise<BizSession | null> {
    return await this.prisma.bizSession.update({
      where: { id: sessionId },
      data: { versionId },
    });
  }

  /**
   * Create content session
   * @param customContentVersion - The custom content version
   * @param socketData - The socket data
   * @param sessionId - The session ID
   * @param stepCvid - The step CVID
   * @returns The content session or null if the session creation fails
   */
  async createContentSession(
    customContentVersion: CustomContentVersion,
    socketData: SocketData,
    sessionId?: string,
    stepCvid?: string,
  ): Promise<CustomContentSession | null> {
    const { environment, externalUserId, externalCompanyId } = socketData;
    const contentType = customContentVersion.content.type as ContentDataType;
    const config = await this.projectsService.getConfig(environment);
    const themes = await this.contentDataService.findThemes({
      environment,
      externalUserId,
      externalCompanyId,
    });

    // Custom CSS gate: when the project's plan doesn't include it, strip
    // customCss from every theme before it ships in the session. This is the
    // single enforcement point — it covers the top theme and the per-step
    // themes (createSessionSteps reuses this same array) — so a downgrade
    // takes effect immediately and without touching stored data.
    const sessionThemes = config.customCss
      ? themes
      : themes.map((theme) => this.stripThemeCustomCss(theme));

    const sessionTheme = await this.createSessionTheme(
      sessionThemes,
      customContentVersion.themeId,
      environment,
      externalUserId,
      externalCompanyId,
    );

    const session: CustomContentSession = {
      id: sessionId,
      type: contentType,
      content: {
        id: customContentVersion.contentId,
        name: customContentVersion.content.name,
        type: customContentVersion.content.type as ContentDataType,
        project: {
          id: environment.projectId,
          removeBranding: config.removeBranding,
        },
      },
      draftMode: false,
      attributes: [],
      version: {
        id: customContentVersion.id,
        theme: sessionTheme,
      },
    };
    if (contentType === ContentDataType.CHECKLIST) {
      return await this.processChecklistSession(session, customContentVersion, socketData);
    }
    if (contentType === ContentDataType.FLOW) {
      return await this.processFlowSession(
        session,
        customContentVersion,
        socketData,
        sessionThemes,
        stepCvid,
      );
    }
    if (contentType === ContentDataType.LAUNCHER) {
      return await this.processLauncherSession(session, customContentVersion, socketData);
    }
    if (contentType === ContentDataType.BANNER) {
      return await this.processBannerSession(session, customContentVersion, socketData);
    }
    if (contentType === ContentDataType.RESOURCE_CENTER) {
      return await this.processResourceCenterSession(session, customContentVersion, socketData);
    }
    if (contentType === ContentDataType.TRACKER) {
      return await this.processTrackerSession(session, customContentVersion, socketData);
    }
    return session;
  }

  /**
   * Sync session version ID if published version differs from custom version
   * This ensures the biz session's versionId is updated to match the published version
   * when the content is using a draft/custom version that differs from published
   * @param session - The content session
   * @param customContentVersion - The custom content version
   */
  async syncSessionVersionIfNeeded(
    session: CustomContentSession,
    customContentVersion: CustomContentVersion,
  ): Promise<void> {
    if (!session.id) {
      return;
    }
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: session.id },
    });
    if (!bizSession) {
      return;
    }

    if (bizSession.versionId !== customContentVersion.id) {
      await this.updateBizSessionVersionId(bizSession.id, customContentVersion.id);
    }
  }

  /**
   * Query user attribute value based on attribute business type
   * @param attr - Attribute definition
   * @param environment - Environment context
   * @param externalUserId - External user ID
   * @param externalCompanyId - Optional company ID
   * @returns User attribute value
   */
  async queryUserAttributeValue(
    attr: Attribute,
    environment: Environment,
    externalUserId: string,
    externalCompanyId?: string,
  ): Promise<any> {
    const environmentId = environment.id;
    // Drop projections so per-request memos hold consistent full entities
    // across all callers in the scope.
    const bizUser = await this.cache.memoize(
      this.cache.memoKeys.bizUser(environmentId, String(externalUserId)),
      () =>
        this.prisma.bizUser.findFirst({
          where: {
            environmentId,
            externalId: String(externalUserId),
          },
        }),
    );

    if (!bizUser) {
      return null;
    }

    if (attr.bizType === AttributeBizType.USER) {
      if (bizUser?.data) {
        return getAttributeValue(bizUser.data, attr.codeName);
      }
      return null;
    }

    if (attr.bizType === AttributeBizType.COMPANY || attr.bizType === AttributeBizType.MEMBERSHIP) {
      if (!externalCompanyId) {
        return null;
      }

      const bizCompany = await this.cache.memoize(
        this.cache.memoKeys.bizCompany(environmentId, String(externalCompanyId)),
        () =>
          this.prisma.bizCompany.findFirst({
            where: {
              externalId: String(externalCompanyId),
              environmentId,
            },
          }),
      );

      if (!bizCompany) {
        return null;
      }

      const userOnCompany = await this.cache.memoize(
        this.cache.memoKeys.bizUserOnCompany(bizUser.id, bizCompany.id),
        () =>
          this.prisma.bizUserOnCompany.findFirst({
            where: {
              bizUserId: bizUser.id,
              bizCompanyId: bizCompany.id,
            },
          }),
      );

      if (!userOnCompany) {
        return null;
      }

      if (attr.bizType === AttributeBizType.COMPANY) {
        return getAttributeValue(bizCompany.data, attr.codeName);
      }

      if (attr.bizType === AttributeBizType.MEMBERSHIP) {
        return getAttributeValue(userOnCompany.data, attr.codeName);
      }

      return null;
    }

    return null;
  }

  // ============================================================================
  // Content Type Processing Methods
  // ============================================================================

  /**
   * Process CHECKLIST content type session
   * @param session - The content session
   * @param customContentVersion - The custom content version
   * @param socketData - The client data
   * @returns The processed session
   */
  private async processChecklistSession(
    session: CustomContentSession,
    customContentVersion: CustomContentVersion,
    socketData: SocketData,
  ): Promise<CustomContentSession> {
    const { environment, externalUserId, externalCompanyId, clientContext, clientConditions } =
      socketData;
    const checklistData = customContentVersion.data as unknown as ChecklistData;
    const attrCodes = extractChecklistAttrCodes(checklistData);
    const buttonAttrIds = extractButtonConditionAttributeIds(checklistData);

    const attributes = await this.extractAttributes(
      buttonAttrIds,
      environment,
      externalUserId,
      externalCompanyId,
      attrCodes,
    );
    session.attributes = attributes;

    // Evaluate checklist items with client conditions
    const items = await evaluateChecklistItemsWithContext(
      customContentVersion,
      clientContext,
      clientConditions,
    );

    session.expandPending = isExpandPending(customContentVersion);
    session.version.checklist = { ...checklistData, items };
    return session;
  }

  /**
   * Process BANNER content type session
   * @param session - The content session
   * @param customContentVersion - The custom content version
   * @param socketData - The client data
   * @returns The processed session
   */
  private async processBannerSession(
    session: CustomContentSession,
    customContentVersion: CustomContentVersion,
    socketData: SocketData,
  ): Promise<CustomContentSession> {
    const { environment, externalUserId, externalCompanyId } = socketData;
    const bannerData = customContentVersion.data as unknown as BannerData;
    const attrCodes = extractBannerAttrCodes(bannerData?.contents);
    const buttonAttrIds = extractButtonConditionAttributeIds(bannerData);

    const attributes = await this.extractAttributes(
      buttonAttrIds,
      environment,
      externalUserId,
      externalCompanyId,
      attrCodes,
    );
    session.attributes = attributes;
    session.version.banner = bannerData;
    return session;
  }

  /**
   * Process RESOURCE_CENTER content type session
   * @param session - The content session
   * @param customContentVersion - The custom content version
   * @param socketData - The client data
   * @returns The processed session
   */
  private async processResourceCenterSession(
    session: CustomContentSession,
    customContentVersion: CustomContentVersion,
    socketData: SocketData,
  ): Promise<CustomContentSession> {
    const { environment, externalUserId, externalCompanyId, clientContext, clientConditions } =
      socketData;
    const rawResourceCenterData = customContentVersion.data as unknown as ResourceCenterData;
    const resourceCenterData = await evaluateResourceCenterBlocksWithContext(
      rawResourceCenterData,
      clientContext,
      clientConditions,
    );

    // Extract attribute codes and button-condition attribute ids across the whole block tree
    const attrCodes: string[] = [];
    const buttonAttrIds: string[] = [];
    const allBlocks = resourceCenterData.tabs.flatMap((tab) => tab.blocks);
    attrCodes.push(...extractResourceCenterAttrCodes(allBlocks));
    for (const block of allBlocks) {
      if (
        (block.type === ResourceCenterBlockType.RICH_TEXT ||
          block.type === ResourceCenterBlockType.SUB_PAGE) &&
        block.content
      ) {
        buttonAttrIds.push(...extractButtonConditionAttributeIds({ contents: block.content }));
      }
    }

    const attributes = await this.extractAttributes(
      buttonAttrIds,
      environment,
      externalUserId,
      externalCompanyId,
      attrCodes,
    );
    session.attributes = attributes;

    // Populate unreadCount for announcement blocks
    await this.populateAnnouncementUnreadCounts(
      resourceCenterData,
      environment,
      externalUserId,
      externalCompanyId,
    );

    session.version.resourceCenter = resourceCenterData;
    return session;
  }

  /**
   * Populate unreadCount on each announcement block in the resource center data.
   * Counts the newest badge-distribution announcements the user is allowed to
   * see (passing their "Only show if..." targeting) and has not yet seen.
   * Capped at ANNOUNCEMENT_BADGE_SCAN_LIMIT to bound the scan + evaluation, and
   * uses the same DB-backed targeting evaluation as listAnnouncements so the
   * badge count never includes announcements the feed would hide.
   */
  private async populateAnnouncementUnreadCounts(
    resourceCenterData: ResourceCenterData,
    environment: Environment,
    externalUserId: string,
    externalCompanyId: string,
  ): Promise<void> {
    const announcementBlocks: ResourceCenterAnnouncementBlock[] = [];
    for (const tab of resourceCenterData.tabs ?? []) {
      for (const block of tab.blocks) {
        if (block.type === ResourceCenterBlockType.ANNOUNCEMENT) {
          announcementBlocks.push(block as ResourceCenterAnnouncementBlock);
        }
      }
    }
    if (announcementBlocks.length === 0) return;

    const setUnread = (count: number) => {
      for (const block of announcementBlocks) {
        block.unreadCount = count;
      }
    };

    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId: environment.id },
    });
    if (!bizUser) {
      setUnread(0);
      return;
    }

    // Newest N published announcements (only those whose scheduledAt has passed
    // or is null). The cap bounds both the scan and the targeting evaluation.
    const publishedAnnouncements = await this.prisma.contentOnEnvironment.findMany({
      where: {
        environmentId: environment.id,
        published: true,
        content: { type: ContentDataType.ANNOUNCEMENT, deleted: false },
        publishedVersion: {
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
        },
      },
      include: {
        publishedVersion: { select: { id: true, data: true, config: true } },
      },
      // Order by scheduledAt to match the feed's newest-N set (web-socket-v2
      // listAnnouncements), so the badge count and the list agree on which
      // announcements are in scope. Publish stamps scheduledAt on first publish.
      orderBy: { publishedVersion: { scheduledAt: 'desc' } },
      take: ANNOUNCEMENT_BADGE_SCAN_LIMIT,
    });

    // Keep badge-distribution announcements the user is actually allowed to see.
    const attributes = await this.contentDataService.findAttributes(environment);
    const evaluationContext: ConditionEvaluationContext = {
      environment,
      attributes,
      bizUser,
      externalCompanyId,
    };

    const badgeContentIds: string[] = [];
    for (const item of publishedAnnouncements) {
      const data = item.publishedVersion?.data as Record<string, any> | null;
      if (data?.distribution !== 'badge') {
        continue;
      }
      const config = item.publishedVersion?.config as unknown as {
        enabledAutoStartRules?: boolean;
        autoStartRules?: RulesCondition[];
      };
      if (
        await this.conditionEvaluationService.isVisibleByAutoStartRules(config, evaluationContext)
      ) {
        badgeContentIds.push(item.contentId);
      }
    }

    if (badgeContentIds.length === 0) {
      setUnread(0);
      return;
    }

    // Get seen announcement IDs
    const seenEvents = await this.prisma.bizEvent.findMany({
      where: {
        bizUserId: bizUser.id,
        contentId: { in: badgeContentIds },
        event: {
          codeName: BizEvents.ANNOUNCEMENT_SEEN,
          project: { environments: { some: { id: environment.id } } },
        },
      },
      select: { contentId: true },
      distinct: ['contentId'],
    });
    const seenSet = new Set(
      seenEvents.filter((event) => event.contentId).map((event) => event.contentId!),
    );

    setUnread(badgeContentIds.filter((id) => !seenSet.has(id)).length);
  }

  /**
   * Process FLOW content type session
   * @param session - The content session
   * @param customContentVersion - The custom content version
   * @param socketData - The socket data
   * @param themes - The themes array
   * @param stepCvid - The step CVID
   * @returns The processed session or null if current step not found
   */
  private async processFlowSession(
    session: CustomContentSession,
    customContentVersion: CustomContentVersion,
    socketData: SocketData,
    themes: Theme[],
    stepCvid?: string,
  ): Promise<CustomContentSession | null> {
    const steps = customContentVersion.steps;
    const { environment, externalUserId, externalCompanyId } = socketData;

    const attributes = await this.extractStepsAttributes(
      steps,
      environment,
      externalUserId,
      externalCompanyId,
    );
    session.attributes = attributes;

    const versionSteps = customContentVersion.steps;
    const sessionSteps = await this.createSessionSteps(
      versionSteps,
      themes,
      environment,
      externalUserId,
      externalCompanyId,
    );
    session.version.steps = sessionSteps;

    if (stepCvid) {
      const currentStep = steps.find((step) => step.cvid === stepCvid);
      if (!currentStep) {
        this.logger.error(`Current step not found for stepCvid ${stepCvid}`);
        return null;
      }
      session.currentStep = {
        cvid: currentStep.cvid,
        id: currentStep.id,
      };
    }

    return session;
  }

  /**
   * Process LAUNCHER content type session
   * @param session - The content session
   * @param customContentVersion - The custom content version
   * @param socketData - The client data
   * @returns The processed session
   */
  private async processLauncherSession(
    session: CustomContentSession,
    customContentVersion: CustomContentVersion,
    socketData: SocketData,
  ): Promise<CustomContentSession> {
    const { environment, externalUserId, externalCompanyId } = socketData;
    const launcher = customContentVersion.data as unknown as LauncherData;
    const attrCodes = extractLauncherAttrCodes(launcher);
    const buttonAttrIds = extractButtonConditionAttributeIds(launcher);

    const attributes = await this.extractAttributes(
      buttonAttrIds,
      environment,
      externalUserId,
      externalCompanyId,
      attrCodes,
    );
    session.attributes = attributes;

    session.version.launcher = { ...launcher };
    return session;
  }

  /**
   * Process TRACKER content type session
   * Tracker sessions carry the eventId from version.data for SDK-side event triggering.
   * Extracts and injects required attributes from autoStartRules conditions
   * (aligning with Launcher attribute injection pattern).
   */
  private async processTrackerSession(
    session: CustomContentSession,
    customContentVersion: CustomContentVersion,
    socketData: SocketData,
  ): Promise<CustomContentSession> {
    const { environment, externalUserId, externalCompanyId } = socketData;
    const data = customContentVersion.data as any;
    session.version.tracker = { eventId: data?.eventId ?? '' };
    // Send full config so SDK can evaluate tracker conditions locally.
    session.version.config = customContentVersion.config;

    // Extract attribute IDs from autoStartRules conditions for attribute injection
    const autoStartRules = customContentVersion.config?.autoStartRules ?? [];
    const attrIds = extractAttributeIdsFromConditions(autoStartRules);

    if (attrIds.length > 0) {
      const attributes = await this.extractAttributes(
        attrIds,
        environment,
        externalUserId,
        externalCompanyId,
      );
      session.attributes = attributes;
    }

    return session;
  }

  // ============================================================================
  // Theme and Step Processing Methods
  // ============================================================================

  /**
   * Get theme settings
   * @param themes - The themes
   * @param themeId - The theme ID
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param externalCompanyId - The external company ID
   * @returns The theme settings or null if not found
   */
  /**
   * Return a copy of the theme with `customCss` removed — from the base
   * settings AND from every variation's settings — for plans that don't
   * include the custom CSS feature. Variations carry a full settings copy
   * (the builder seeds them with cloneDeep(base)), and the SDK adopts the
   * matched variation's settings wholesale, so skipping them would let a
   * theme with variations smuggle customCss past the gate (and re-hide the
   * Made-with-Usertour badge). Does not mutate the original (the themes array
   * may be shared / cached); returns it unchanged when there's nothing to
   * strip.
   */
  private stripThemeCustomCss(theme: Theme): Theme {
    const stripCss = (settings: ThemeTypesSetting | null): ThemeTypesSetting | null => {
      if (!settings || settings.customCss == null) {
        return settings;
      }
      const { customCss: _customCss, ...rest } = settings;
      return rest as ThemeTypesSetting;
    };

    const settings = theme.settings as ThemeTypesSetting | null;
    const variations = (theme.variations as ThemeVariation[] | null) ?? null;

    const strippedSettings = stripCss(settings);
    const variationsHaveCss = !!variations?.some(
      (variation) => (variation?.settings as ThemeTypesSetting | undefined)?.customCss != null,
    );

    // Nothing to strip anywhere — return the original untouched.
    if (strippedSettings === settings && !variationsHaveCss) {
      return theme;
    }

    return {
      ...theme,
      settings: strippedSettings as unknown as Theme['settings'],
      variations: variationsHaveCss
        ? (variations!.map((variation) => ({
            ...variation,
            settings: stripCss(variation.settings as ThemeTypesSetting),
          })) as unknown as Theme['variations'])
        : theme.variations,
    };
  }

  private async createSessionTheme(
    themes: Theme[],
    themeId: string,
    environment: Environment,
    externalUserId: string,
    externalCompanyId?: string,
  ): Promise<SessionTheme | null> {
    const theme = themes.find((theme) => theme.id === themeId);
    if (!theme) {
      return null;
    }

    const settings = theme.settings as ThemeTypesSetting;
    const variations = (theme.variations as ThemeVariation[]) || [];

    const attrIds = extractThemeVariationsAttributeIds(variations);
    const attributes = await this.extractAttributes(
      attrIds,
      environment,
      externalUserId,
      externalCompanyId,
    );

    return {
      settings,
      variations,
      attributes,
    };
  }

  /**
   * Create session steps
   * @param steps - The steps
   * @param themes - The themes
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param externalCompanyId - The external company ID
   * @returns The session steps
   */
  private async createSessionSteps(
    steps: Step[],
    themes: Theme[],
    environment: Environment,
    externalUserId: string,
    externalCompanyId?: string,
  ): Promise<SessionStep[]> {
    // Early return for empty steps
    if (!steps.length) {
      return [];
    }

    // Create a cache for session themes to avoid duplicate processing
    const themeCache = new Map<string, SessionTheme | null>();

    // Collect unique theme IDs that need processing
    const uniqueThemeIds = new Set<string>();
    for (const step of steps) {
      if (step.themeId) {
        uniqueThemeIds.add(step.themeId);
      }
    }

    // Batch process all unique themes
    const themePromises = Array.from(uniqueThemeIds).map(async (themeId) => {
      try {
        const sessionTheme = await this.createSessionTheme(
          themes,
          themeId,
          environment,
          externalUserId,
          externalCompanyId,
        );
        themeCache.set(themeId, sessionTheme);
      } catch (error) {
        this.logger.error({
          message: `Failed to create session theme for themeId ${themeId}:`,
          error,
        });
        themeCache.set(themeId, null);
      }
    });

    // Wait for all theme processing to complete
    await Promise.all(themePromises);

    // Process steps with cached themes
    const results: SessionStep[] = steps.map((step) => {
      if (!step.themeId) {
        return step as unknown as SessionStep;
      }

      const sessionTheme = themeCache.get(step.themeId);
      return {
        ...step,
        theme: sessionTheme,
      } as unknown as SessionStep;
    });

    return results;
  }

  // ============================================================================
  // Attribute Extraction Methods
  // ============================================================================

  /**
   * Extract steps attributes
   * @param steps - The steps
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param externalCompanyId - The external company ID
   * @returns The steps attributes
   */
  private async extractStepsAttributes(
    steps: Step[],
    environment: Environment,
    externalUserId: string,
    externalCompanyId?: string,
  ): Promise<SessionAttribute[]> {
    if (!steps || steps.length === 0) {
      return [];
    }

    const attrIds = extractStepTriggerAttributeIds(steps);
    const attrCodes = extractStepContentAttrCodes(steps);
    const buttonAttrIds = extractButtonConditionAttributeIds(steps);

    return await this.extractAttributes(
      [...attrIds, ...buttonAttrIds],
      environment,
      externalUserId,
      externalCompanyId,
      attrCodes,
    );
  }

  /**
   * Extract attribute data based on attribute IDs and codes
   * @param attrIds - Array of attribute IDs to extract
   * @param environment - Environment context
   * @param externalUserId - External user ID
   * @param externalCompanyId - Optional company ID
   * @param attrCodes - Array of attribute codes to extract (optional)
   * @returns Array of session attribute information
   */
  private async extractAttributes(
    attrIds: string[],
    environment: Environment,
    externalUserId: string,
    externalCompanyId?: string,
    attrCodes: string[] = [],
  ): Promise<SessionAttribute[]> {
    if (attrIds.length === 0 && attrCodes.length === 0) {
      return [];
    }

    // Reuse the project-level Attribute cache from ContentDataService instead
    // of issuing a per-session findMany. Cache contains [USER, COMPANY,
    // MEMBERSHIP, EVENT] across all extracts; filter EVENT out so this
    // method's contract (session attributes only) is preserved.
    const allAttributes = await this.contentDataService.findAttributes(environment);
    const relevantAttributes = allAttributes.filter((attr) => {
      const isSessionBizType =
        attr.bizType === AttributeBizType.USER ||
        attr.bizType === AttributeBizType.COMPANY ||
        attr.bizType === AttributeBizType.MEMBERSHIP;
      if (!isSessionBizType) {
        return false;
      }
      return (
        attrIds.includes(attr.id) ||
        (attrCodes.includes(attr.codeName) && attr.bizType === AttributeBizType.USER)
      );
    });

    // Query attribute values and build result
    const results: SessionAttribute[] = [];

    for (const attr of relevantAttributes) {
      const value = await this.queryUserAttributeValue(
        attr,
        environment,
        externalUserId,
        externalCompanyId,
      );

      results.push({
        id: attr.id,
        codeName: attr.codeName,
        value,
        bizType: attr.bizType,
        dataType: attr.dataType,
      });
    }

    return results;
  }
}
