import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import {
  AnnouncementData,
  ClientContext,
  ContentDataType,
  ResourceCenterBlockType,
  RulesCondition,
  RulesType,
} from '@usertour/types';
import { DEFAULT_ANNOUNCEMENT_DATA } from '@usertour/constants';

import { BizService } from '@/biz/biz.service';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import {
  createBizCompanyConditionsFilter,
  createBizUserConditionsFilter,
} from '@/common/attribute/filter';
import { BizUser, Environment } from '@/common/types/schema';
import {
  evaluateCustomContentVersion,
  filterAvailableAutoStartContentVersions,
  filterSingleSessionContentVersions,
  findLatestActivatedCustomContentVersions,
  isActivedAutoStartRules,
  isActivedHideRules,
  isAllowedByAutoStartRulesSetting,
  isShowOnlyContentType,
  isSingleSessionContentType,
  isSingletonContentType,
} from '@/utils/content-utils';
import type { CustomContentVersion } from '@/common/types/content';

import { AnnouncementService } from './announcement.service';
import type { AutoStartRulesConfig } from './condition-evaluation.service';
import { ContentDataService } from './content-data.service';

export interface DiagnoseParams {
  environment: Environment;
  contentId: string;
  /** The MCP layer resolves the type via the v2 content service and passes it here
   * (the websocket layer never looks up type-by-id — it always knows type from context). */
  contentType: ContentDataType;
  /** REQUIRED — diagnosis is always for a specific end-user (real display only
   * happens for identified users; structural checks belong to validate). The
   * not-found case is still a real answer: the identified gate fails. */
  externalUserId: string;
  externalCompanyId?: string;
  /** The page URL current_url conditions evaluate against — REQUIRED: the
   * runtime matcher needs a real URL (an empty one matches nothing, not even
   * the whole-site wildcard), so an omitted URL fabricates start_rules
   * failures. The MCP tool enforces this at its boundary too. */
  url: string;
}

/**
 * Gate facts for "why isn't my content showing?", each from a real runtime function.
 * The websocket layer produces only facts + the STAMPED compiled rules; the MCP layer
 * renders them readable (decompileConditions) and assembles the report. No
 * orchestrator composition is re-derived here.
 */
export interface DiagnoseFacts {
  contentType: ContentDataType;
  publishedVersionId: string | null;
  published: boolean;
  /** undefined → no userId given (per-user gates can't be evaluated). */
  userId?: string;
  userFound?: boolean;
  startRulesActive?: boolean; // isActivedAutoStartRules
  frequencyAllowed?: boolean; // isAllowedByAutoStartRulesSetting
  hidden?: boolean; // isActivedHideRules
  singleSessionApplicable: boolean; // isSingleSessionContentType
  singleSessionDismissed?: boolean;
  /** Lifetime session count for this (user, content) — lets the report say WHICH
   * not-dismissed state a single-session type is in (never shown vs still running). */
  totalSessions?: number;
  hasActiveSession?: boolean;
  /** For singleton types (one shows per type), the content id of a higher-priority
   * sibling that wins the single slot — set only when THIS content is itself eligible
   * (passes its own gates) but is outranked, so it would never auto-start. */
  outrankedByContentId?: string;
  /** Human-readable name of {@link outrankedByContentId}, resolved in the MCP layer
   * (the websocket runtime version only carries content id + type, not the name). */
  outrankedByName?: string;
  /** For singleton types, the content id of ANOTHER content of the same type that
   * currently has an active session: the runtime resumes it (strategy 1) into the single
   * slot BEFORE auto-starting fresh candidates, so THIS content can't appear (regardless
   * of priority) until that session ends. Set only when this content has no own session. */
  activeSlotHeldByContentId?: string;
  /** Human-readable name of {@link activeSlotHeldByContentId} (resolved in the MCP layer). */
  activeSlotHeldByName?: string;
  /** Stamped compiled conditions (.actived per leaf), for the MCP layer to render + overlay status. */
  autoStartRules?: RulesCondition[];
  hideRules?: RulesCondition[];
  /** The user's current attribute values (codeName → value), for the MCP layer to show the
   * ACTUAL value next to each user-scoped attribute condition (so the cause is self-evident). */
  userAttributes?: Record<string, unknown>;

  // ── Announcement-only gates (the feed has its own visibility pipeline) ──────
  /** The published version's "announcement time" (ISO). */
  scheduledAt?: string;
  /** scheduledAt is in the future — the feed/badge/popup hide it until then. */
  scheduledInFuture?: boolean;
  /** A published resource center in this environment carries a visible announcement
   * block — the ONLY surface the feed/badge/popup reach users through. */
  announcementBlockPublished?: boolean;
  /** This user already has a seen record (badge cleared; a popup never re-presents). */
  announcementSeen?: boolean;
  /** Distribution level of the published version (silent / badge / popup). */
  announcementDistribution?: string;
}

/** Per-segment breakdown for the diagnose report's segment leaves — see explainSegments. */
export interface SegmentExplanation {
  kind: 'all' | 'manual' | 'condition';
  bizType: 'user' | 'company';
  /** manual only. For a company segment with no company context: undefined. */
  isMember?: boolean;
  /** manual only. */
  memberCount?: number;
  /** condition only: the stored tree with per-LEAF `actived` verdicts stamped
   * (a leaf left unset = not evaluable). Undefined when nothing is evaluable
   * (company segment without a company context / user not found). */
  conditions?: RulesCondition[];
}

/** One row of the per-user panorama — see diagnoseUser. */
export interface UserPanoramaRow {
  contentId: string;
  name: string;
  contentType: ContentDataType;
  verdict: 'showing' | 'queued' | 'blocked' | 'browser_dependent';
  /** showing: how it got there. */
  via?: 'resume' | 'auto_start' | 'feed';
  /** queued: who holds the slot (resolved to a name in the MCP layer). */
  behindContentId?: string;
  behindName?: string;
  queueReason?: 'active_slot' | 'outranked';
  /** blocked: the single most relevant gate. */
  gate?: string;
  detail?: string;
}

@Injectable()
export class ContentDiagnosisService {
  constructor(
    private readonly bizService: BizService,
    private readonly contentDataService: ContentDataService,
    private readonly announcementService: AnnouncementService,
    private readonly prisma: PrismaService,
  ) {}

  async diagnose(params: DiagnoseParams): Promise<DiagnoseFacts> {
    const { environment, contentId, contentType, externalUserId, externalCompanyId, url } = params;
    const singleSessionApplicable = isSingleSessionContentType(contentType);

    const publishedVersionId = await this.contentDataService.findPublishedVersionId(
      contentId,
      environment.id,
    );
    const published = !!publishedVersionId;

    const bizUser = externalUserId
      ? await this.bizService.getBizUser(externalUserId, environment.id)
      : null;
    const userFound = externalUserId ? !!bizUser : undefined;

    // Announcements are a FEED with their own visibility pipeline (scheduledAt +
    // audience filter + resource-center reachability) — none of the session
    // machinery below applies, so they get their own gate evaluation.
    if (contentType === ContentDataType.ANNOUNCEMENT) {
      return this.diagnoseAnnouncement({
        environment,
        contentId,
        publishedVersionId,
        externalUserId,
        externalCompanyId,
        bizUser,
        userFound,
      });
    }

    if (published && bizUser && externalUserId) {
      const cvs = await this.contentDataService.findCustomContentVersions(
        { environment, externalUserId, externalCompanyId },
        [contentType],
      );
      const evaluated = await evaluateCustomContentVersion(cvs, {
        typeControl: { [RulesType.CURRENT_PAGE]: true, [RulesType.TIME]: true },
        clientContext: { pageUrl: url ?? '' } as ClientContext,
      });
      const target = evaluated.find((cv) => cv.content.id === contentId);

      if (target) {
        // Competition (singleton types only). The orchestrator fills the single slot in
        // strategy order: (1) RESUME an existing active session, then (2) auto-start the
        // top-priority eligible candidate. Reuse those exact selectors. No live socket
        // here, so clientConditions/waitTimers are empty (matches the drift e2e).
        let activeSlotHeldByContentId: string | undefined;
        let outrankedByContentId: string | undefined;
        if (isSingletonContentType(contentType) && !target.session.activeSession) {
          // The candidate pool must be the orchestrator's, not every evaluated
          // version: for banner / launcher / resource center it drops the ones
          // this user has already used up (one session per user, lifetime), so a
          // sibling the runtime will never consider cannot win the slot. Without
          // this the tool reported "outranked by X" while X's own diagnosis said
          // X can never show again — the runtime would in fact start THIS one.
          const competing = isSingleSessionContentType(contentType)
            ? filterSingleSessionContentVersions(evaluated)
            : evaluated;
          // Only meaningful when this content would otherwise auto-start (its own gates
          // pass) — if its start_rules/frequency/hide already fail, THAT is the reason and
          // the slot competition is moot noise. So gate on it being eligible first.
          const eligible = filterAvailableAutoStartContentVersions(competing, contentType, [], []);
          const targetEligible = eligible.some((cv) => cv.content.id === contentId);
          if (targetEligible) {
            // Strategy 1: another content of this type has a live session → it resumes into
            // the slot before anything fresh starts, so this one can't appear (any priority).
            const holder = findLatestActivatedCustomContentVersions(evaluated, [])?.[0];
            if (holder && holder.content.id !== contentId) {
              activeSlotHeldByContentId = holder.content.id;
            } else if (eligible[0] && eligible[0].content.id !== contentId) {
              // Strategy 2: no resume in the way, but a higher-priority sibling outranks it.
              outrankedByContentId = eligible[0].content.id;
            }
          }
        }

        return {
          contentType,
          publishedVersionId,
          published,
          userId: externalUserId,
          userFound: true,
          startRulesActive: isActivedAutoStartRules(target),
          frequencyAllowed: isAllowedByAutoStartRulesSetting(target),
          hidden: isActivedHideRules(target),
          singleSessionApplicable,
          singleSessionDismissed:
            singleSessionApplicable &&
            !target.session.activeSession &&
            target.session.totalSessions > 0,
          // Lets the report say WHICH not-dismissed state this is: never shown
          // at all, or shown and still running. The old detail lumped both into
          // "not yet shown (or still active)", and a support reviewer read it
          // as "already used its one session" — the opposite of the truth.
          totalSessions: target.session.totalSessions,
          hasActiveSession: !!target.session.activeSession,
          outrankedByContentId,
          activeSlotHeldByContentId,
          autoStartRules: target.config.autoStartRules ?? [],
          hideRules: target.config.hideRules ?? [],
          userAttributes: (bizUser.data as Record<string, unknown>) ?? {},
        };
      }
    }

    return {
      contentType,
      publishedVersionId,
      published,
      userId: externalUserId,
      userFound,
      singleSessionApplicable,
    };
  }

  /**
   * Announcement gates, each from the REAL feed pipeline (AnnouncementService):
   * scheduledAt (feed hides until it passes), audience targeting (the same
   * evaluator filterByTargeting uses, with per-condition facts), reachability (a
   * published resource center must carry a visible announcement block — mirrors
   * session-builder's populateAnnouncements guard), and the per-user seen record.
   */
  private async diagnoseAnnouncement(input: {
    environment: Environment;
    contentId: string;
    publishedVersionId: string | null;
    externalUserId?: string;
    externalCompanyId?: string;
    bizUser: BizUser | null;
    userFound?: boolean;
  }): Promise<DiagnoseFacts> {
    const { environment, contentId, publishedVersionId, externalUserId, externalCompanyId } = input;
    const facts: DiagnoseFacts = {
      contentType: ContentDataType.ANNOUNCEMENT,
      publishedVersionId,
      published: !!publishedVersionId,
      userId: externalUserId,
      userFound: input.userFound,
      singleSessionApplicable: false,
    };
    if (!publishedVersionId) {
      return facts;
    }

    const version = await this.prisma.version.findUnique({
      where: { id: publishedVersionId },
      select: { scheduledAt: true, config: true, data: true },
    });
    const scheduledAt = version?.scheduledAt ?? null;
    if (scheduledAt) {
      facts.scheduledAt = scheduledAt.toISOString();
      facts.scheduledInFuture = scheduledAt.getTime() > Date.now();
    }
    const data = (version?.data ?? null) as unknown as AnnouncementData | null;
    facts.announcementDistribution = data?.distribution ?? DEFAULT_ANNOUNCEMENT_DATA.distribution;
    facts.announcementBlockPublished = await this.hasPublishedAnnouncementBlock(environment.id);

    if (input.bizUser) {
      const { matched, stamped } = await this.announcementService.evaluateTargetingForDiagnosis(
        version?.config as AutoStartRulesConfig | null,
        environment,
        input.bizUser,
        externalCompanyId,
      );
      facts.startRulesActive = matched;
      facts.autoStartRules = stamped;
      facts.userAttributes = (input.bizUser.data as Record<string, unknown>) ?? {};
      const seen = await this.announcementService.getSeenAnnouncementIds(input.bizUser.id, [
        contentId,
      ]);
      facts.announcementSeen = seen.has(contentId);
    }
    return facts;
  }

  /**
   * Whether ANY published resource center in the environment carries a visible
   * announcement block — without one the feed, badge, and popup are unreachable
   * (mirrors session-builder's populateAnnouncements early return; block-level
   * "only show" conditions are evaluated per user at runtime, so a block that
   * exists but is condition-gated still counts as reachable here).
   */
  private async hasPublishedAnnouncementBlock(environmentId: string): Promise<boolean> {
    const resourceCenters = await this.prisma.contentOnEnvironment.findMany({
      where: {
        environmentId,
        published: true,
        content: { type: ContentDataType.RESOURCE_CENTER, deleted: false },
      },
      select: { publishedVersion: { select: { data: true } } },
    });
    return resourceCenters.some((rc) => {
      const data = rc.publishedVersion?.data as {
        tabs?: { blocks?: { type?: string }[] }[];
      } | null;
      return (data?.tabs ?? []).some((tab) =>
        (tab.blocks ?? []).some((block) => block?.type === ResourceCenterBlockType.ANNOUNCEMENT),
      );
    });
  }
  /**
   * Explain WHY a user is inside/outside each referenced segment — the
   * per-condition breakdown the segment leaf in a diagnose report cannot give
   * on its own (membership is computed as ONE combined query at runtime, with
   * no per-leaf verdicts).
   *
   * Faithfulness rule: every leaf verdict comes from the SAME filter builder
   * the runtime membership check uses (createBiz*ConditionsFilter), run with
   * exactly one leaf at a time — so the explanation can never use different
   * semantics than the verdict it explains. The authoritative in/out answer
   * stays the content rule's own stamped leaf; this is commentary.
   *
   * A company-typed segment diagnosed without a company context returns
   * `conditions: undefined` (nothing evaluable) rather than guesses.
   */
  async explainSegments(
    segmentIds: string[],
    environment: Environment,
    externalUserId: string,
    externalCompanyId?: string,
  ): Promise<Record<string, SegmentExplanation>> {
    if (segmentIds.length === 0) return {};
    const out: Record<string, SegmentExplanation> = {};
    const [segments, attributes, bizUser] = await Promise.all([
      this.prisma.segment.findMany({ where: { id: { in: segmentIds } } }),
      this.prisma.attribute.findMany({ where: { projectId: environment.projectId } }),
      this.prisma.bizUser.findFirst({
        where: { environmentId: environment.id, externalId: externalUserId },
      }),
    ]);
    const bizCompany = externalCompanyId
      ? await this.prisma.bizCompany.findFirst({
          where: { environmentId: environment.id, externalId: externalCompanyId },
        })
      : null;

    for (const segment of segments) {
      const isUserSegment = segment.bizType === SegmentBizType.USER;
      const bizType = isUserSegment ? ('user' as const) : ('company' as const);

      if (segment.dataType === SegmentDataType.ALL) {
        out[segment.id] = { kind: 'all', bizType };
        continue;
      }

      if (segment.dataType === SegmentDataType.MANUAL) {
        if (isUserSegment) {
          const [memberCount, membership] = await Promise.all([
            this.prisma.bizUserOnSegment.count({ where: { segmentId: segment.id } }),
            bizUser
              ? this.prisma.bizUserOnSegment.findFirst({
                  where: { segmentId: segment.id, bizUserId: bizUser.id },
                })
              : Promise.resolve(null),
          ]);
          out[segment.id] = { kind: 'manual', bizType, memberCount, isMember: !!membership };
        } else {
          const memberCount = await this.prisma.bizCompanyOnSegment.count({
            where: { segmentId: segment.id },
          });
          const membership = bizCompany
            ? await this.prisma.bizCompanyOnSegment.findFirst({
                where: { segmentId: segment.id, bizCompanyId: bizCompany.id },
              })
            : null;
          out[segment.id] = {
            kind: 'manual',
            bizType,
            memberCount,
            // Without a company context we cannot say which company's membership
            // to check — leave isMember undefined rather than guessing.
            isMember: bizCompany ? !!membership : undefined,
          };
        }
        continue;
      }

      // CONDITION segment: stamp a per-leaf verdict onto a clone of the stored tree.
      const conditions = Array.isArray(segment.data)
        ? (JSON.parse(JSON.stringify(segment.data)) as RulesCondition[])
        : undefined;
      const canEvaluate = isUserSegment ? !!bizUser : !!bizCompany;
      if (conditions && canEvaluate) {
        const stampLeaf = async (leaf: RulesCondition): Promise<void> => {
          const filter = isUserSegment
            ? createBizUserConditionsFilter([leaf], attributes)
            : createBizCompanyConditionsFilter([leaf], attributes);
          if (!filter) {
            // The leaf did not compile (attribute deleted / unsupported) — not
            // evaluable, leave `actived` unset so it reads as unknown.
            return;
          }
          const hit = isUserSegment
            ? await this.prisma.bizUser.findFirst({
                where: {
                  environmentId: environment.id,
                  externalId: externalUserId,
                  AND: [filter],
                },
              })
            : await this.prisma.bizCompany.findFirst({
                where: {
                  environmentId: environment.id,
                  externalId: String(externalCompanyId),
                  AND: [filter],
                },
              });
          leaf.actived = !!hit;
        };
        const walk = async (nodes: RulesCondition[]): Promise<void> => {
          for (const node of nodes) {
            if (node.conditions?.length) await walk(node.conditions);
            else await stampLeaf(node);
          }
        };
        await walk(conditions);
      }
      out[segment.id] = {
        kind: 'condition',
        bizType,
        conditions: canEvaluate ? conditions : undefined,
      };
    }
    return out;
  }
  /**
   * The per-USER panorama: everything published in the environment, sorted into
   * what shows NOW, what is queued behind a slot, what is blocked (one gate
   * each), and what only the browser can decide. Uses the SAME selectors the
   * orchestrator fills slots with (resume first, then top eligible by
   * priority, single-session filter applied) — so the competition verdicts
   * cannot drift from runtime, and the whole race is answered in ONE call
   * instead of a per-content diagnose whose conclusions shift as you go.
   */
  async diagnoseUser(params: {
    environment: Environment;
    externalUserId: string;
    externalCompanyId?: string;
    url: string;
  }): Promise<{ userFound: boolean; rows: UserPanoramaRow[] }> {
    const { environment, externalUserId, externalCompanyId, url } = params;
    const bizUser = await this.bizService.getBizUser(externalUserId, environment.id);
    if (!bizUser) {
      return { userFound: false, rows: [] };
    }
    const rows: UserPanoramaRow[] = [];

    // Live-only condition types: not evaluable server-side. A rule that fails
    // ONLY on these must not be reported "blocked" (the diagnose_content
    // contract, kept here too): it is browser-dependent.
    const LIVE_ONLY = new Set<string>([
      RulesType.ELEMENT,
      RulesType.TEXT_INPUT,
      RulesType.TEXT_FILL,
      RulesType.TASK_IS_CLICKED,
      RulesType.WAIT,
    ]);
    const foldRules = (conditions: RulesCondition[], unknownAs: boolean): boolean => {
      if (!conditions || conditions.length === 0) return false;
      const one = (c: RulesCondition): boolean => {
        if (c.conditions?.length) return fold(c.conditions);
        if (LIVE_ONLY.has(c.type)) return unknownAs;
        return !!c.actived;
      };
      const fold = (list: RulesCondition[]): boolean => {
        const results = list.map(one);
        return list[0]?.operators === 'and' ? results.every(Boolean) : results.some(Boolean);
      };
      return fold(conditions);
    };

    const blockedRow = (cv: CustomContentVersion, type: ContentDataType): UserPanoramaRow => {
      const base = {
        contentId: cv.content.id,
        name: cv.content.name ?? '',
        contentType: type,
      };
      if (isActivedHideRules(cv)) {
        return { ...base, verdict: 'blocked', gate: 'hidden', detail: 'a hide rule matches.' };
      }
      const rules = cv.config.autoStartRules ?? [];
      if (!isActivedAutoStartRules(cv)) {
        // Pessimistic fold failed. If the optimistic fold passes, the failure is
        // entirely browser-only leaves — browser-dependent, not blocked.
        if (rules.length > 0 && foldRules(rules, true)) {
          return {
            ...base,
            verdict: 'browser_dependent',
            detail:
              'start conditions undecidable server-side (browser-only leaves) — confirm in the app.',
          };
        }
        return {
          ...base,
          verdict: 'blocked',
          gate: 'start_rules',
          detail:
            rules.length === 0
              ? 'no start rules — appears only via start_content / usertour.start().'
              : 'start conditions do not match — run diagnose_content for the tree.',
        };
      }
      if (!isAllowedByAutoStartRulesSetting(cv)) {
        return { ...base, verdict: 'blocked', gate: 'frequency', detail: 'frequency cap reached.' };
      }
      // A start `wait` is a BROWSER timer: the availability filter excludes the
      // content until the timer fires, which server-side is simply "not yet".
      // Reporting that as blocked was wrong twice over — it will show, and the
      // row sent operators to diagnose_content, which correctly answers "no
      // blocker" (a maintenance-round reviewer chased that loop to a dead end).
      const waitSeconds = cv.config.autoStartRulesSetting?.wait;
      if (waitSeconds) {
        return {
          ...base,
          verdict: 'browser_dependent',
          detail: `starts ${waitSeconds}s after the page loads (a browser timer, so the server cannot say it has elapsed) — confirm in the app.`,
        };
      }
      return {
        ...base,
        verdict: 'blocked',
        gate: 'eligibility',
        detail:
          'not eligible to auto-start here, but no single gate explains it — re-check hide rules ' +
          'and the start-rule settings on this version.',
      };
    };

    const sessionTypes = [
      ContentDataType.FLOW,
      ContentDataType.CHECKLIST,
      ContentDataType.BANNER,
      ContentDataType.RESOURCE_CENTER,
      ContentDataType.LAUNCHER,
    ];
    for (const type of sessionTypes) {
      const cvs = await this.contentDataService.findCustomContentVersions(
        { environment, externalUserId, externalCompanyId },
        [type],
      );
      if (cvs.length === 0) continue;
      const evaluated = await evaluateCustomContentVersion(cvs, {
        typeControl: { [RulesType.CURRENT_PAGE]: true, [RulesType.TIME]: true },
        clientContext: { pageUrl: url } as ClientContext,
      });
      const pool = isSingleSessionContentType(type)
        ? filterSingleSessionContentVersions(evaluated)
        : evaluated;
      const eligible = filterAvailableAutoStartContentVersions(pool, type, [], []);
      const eligibleIds = new Set(eligible.map((cv) => cv.content.id));

      if (isSingletonContentType(type)) {
        // Banner is SHOW_ONLY: no resume — it re-evaluates every page.
        const holder = isShowOnlyContentType(type)
          ? undefined
          : findLatestActivatedCustomContentVersions(evaluated, [])?.[0];
        const winner = holder ?? eligible[0];
        for (const cv of evaluated) {
          const base = {
            contentId: cv.content.id,
            name: cv.content.name ?? '',
            contentType: type,
          };
          if (winner && cv.content.id === winner.content.id) {
            rows.push({
              ...base,
              verdict: 'showing',
              via: holder ? 'resume' : 'auto_start',
            });
          } else if (eligibleIds.has(cv.content.id)) {
            rows.push({
              ...base,
              verdict: 'queued',
              behindContentId: winner?.content.id,
              queueReason: holder ? 'active_slot' : 'outranked',
            });
          } else if (
            isSingleSessionContentType(type) &&
            !cv.session.activeSession &&
            cv.session.totalSessions > 0
          ) {
            rows.push({
              ...base,
              verdict: 'blocked',
              gate: 'single_session',
              detail: 'shows once per user and was already shown.',
            });
          } else {
            rows.push(blockedRow(cv, type));
          }
        }
      } else {
        // Launcher: many can coexist — everything eligible or already active shows.
        for (const cv of evaluated) {
          const base = {
            contentId: cv.content.id,
            name: cv.content.name ?? '',
            contentType: type,
          };
          if (cv.session.activeSession) {
            rows.push({ ...base, verdict: 'showing', via: 'resume' });
          } else if (eligibleIds.has(cv.content.id)) {
            rows.push({ ...base, verdict: 'showing', via: 'auto_start' });
          } else if (isSingleSessionContentType(type) && cv.session.totalSessions > 0) {
            rows.push({
              ...base,
              verdict: 'blocked',
              gate: 'single_session',
              detail: 'shows once per user and was already shown.',
            });
          } else {
            rows.push(blockedRow(cv, type));
          }
        }
      }
    }

    // Trackers are headless: their conditions only ever evaluate in the browser.
    const trackers = await this.prisma.contentOnEnvironment.findMany({
      where: {
        environmentId: environment.id,
        published: true,
        content: { type: ContentDataType.TRACKER, deleted: false },
      },
      include: { content: true },
    });
    for (const t of trackers) {
      rows.push({
        contentId: t.contentId,
        name: t.content.name ?? '',
        contentType: ContentDataType.TRACKER,
        verdict: 'browser_dependent',
        detail: 'headless tracker — fires its event in the browser when its conditions match.',
      });
    }

    // Announcements: the feed pipeline (scheduled + audience + reachability + seen).
    const announcements = await this.prisma.contentOnEnvironment.findMany({
      where: {
        environmentId: environment.id,
        published: true,
        content: { type: ContentDataType.ANNOUNCEMENT, deleted: false },
      },
      include: { content: true },
    });
    for (const a of announcements) {
      const facts = await this.diagnose({
        environment,
        contentId: a.contentId,
        contentType: ContentDataType.ANNOUNCEMENT,
        externalUserId,
        externalCompanyId,
        url,
      });
      const base = {
        contentId: a.contentId,
        name: a.content.name ?? '',
        contentType: ContentDataType.ANNOUNCEMENT,
      };
      if (facts.scheduledInFuture) {
        rows.push({
          ...base,
          verdict: 'blocked',
          gate: 'scheduled',
          detail: 'announcement time is in the future.',
        });
      } else if (facts.announcementBlockPublished === false) {
        rows.push({
          ...base,
          verdict: 'blocked',
          gate: 'rc_reachability',
          detail: 'no published resource center carries an announcement block.',
        });
      } else if (facts.startRulesActive === false) {
        rows.push({
          ...base,
          verdict: 'blocked',
          gate: 'start_rules',
          detail: 'audience filter does not match this user.',
        });
      } else if (facts.announcementSeen) {
        rows.push({
          ...base,
          verdict: 'blocked',
          gate: 'seen',
          detail: 'already seen — the popup never re-presents.',
        });
      } else {
        rows.push({ ...base, verdict: 'showing', via: 'feed' });
      }
    }

    return { userFound: true, rows };
  }
}
