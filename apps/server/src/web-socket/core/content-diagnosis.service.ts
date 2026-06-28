import { Injectable } from '@nestjs/common';

import { ClientContext, ContentDataType, RulesCondition, RulesType } from '@usertour/types';

import { BizService } from '@/biz/biz.service';
import { Environment } from '@/common/types/schema';
import {
  evaluateCustomContentVersion,
  filterAvailableAutoStartContentVersions,
  findLatestActivatedCustomContentVersions,
  isActivedAutoStartRules,
  isActivedHideRules,
  isAllowedByAutoStartRulesSetting,
  isSingleSessionContentType,
  isSingletonContentType,
} from '@/utils/content-utils';

import { ContentDataService } from './content-data.service';

export interface DiagnoseParams {
  environment: Environment;
  contentId: string;
  /** The MCP layer resolves the type via the v2 content service and passes it here
   * (the websocket layer never looks up type-by-id — it always knows type from context). */
  contentType: ContentDataType;
  externalUserId?: string;
  externalCompanyId?: string;
  url?: string;
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
}

@Injectable()
export class ContentDiagnosisService {
  constructor(
    private readonly bizService: BizService,
    private readonly contentDataService: ContentDataService,
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
          // Only meaningful when this content would otherwise auto-start (its own gates
          // pass) — if its start_rules/frequency/hide already fail, THAT is the reason and
          // the slot competition is moot noise. So gate on it being eligible first.
          const eligible = filterAvailableAutoStartContentVersions(evaluated, contentType, [], []);
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
}
