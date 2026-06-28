import { Injectable } from '@nestjs/common';

import { ClientContext, ContentDataType, RulesCondition, RulesType } from '@usertour/types';

import { BizService } from '@/biz/biz.service';
import { Environment } from '@/common/types/schema';
import {
  evaluateCustomContentVersion,
  filterAvailableAutoStartContentVersions,
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
        // Competition (singleton types only): the orchestrator auto-starts just the
        // top-priority eligible content of a type ([0] after priorityCompare). Reuse
        // the SAME selector to see if this content — when it would otherwise be
        // eligible — is outranked by a sibling and so never gets the slot. No live
        // socket here, so clientConditions/waitTimers are empty (matches the drift e2e).
        let outrankedByContentId: string | undefined;
        if (isSingletonContentType(contentType) && !target.session.activeSession) {
          const eligible = filterAvailableAutoStartContentVersions(evaluated, contentType, [], []);
          const targetEligible = eligible.some((cv) => cv.content.id === contentId);
          const winner = eligible[0];
          if (targetEligible && winner && winner.content.id !== contentId) {
            outrankedByContentId = winner.content.id;
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
