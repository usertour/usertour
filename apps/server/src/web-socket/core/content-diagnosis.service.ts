import { Injectable } from '@nestjs/common';

import { ClientContext, ContentDataType, RulesCondition, RulesType } from '@usertour/types';

import { BizService } from '@/biz/biz.service';
import { Environment } from '@/common/types/schema';
import {
  evaluateCustomContentVersion,
  isActivedAutoStartRules,
  isActivedHideRules,
  isAllowedByAutoStartRulesSetting,
  isSingleSessionContentType,
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
  /** Stamped compiled conditions (.actived per leaf), for the MCP layer to render + overlay status. */
  autoStartRules?: RulesCondition[];
  hideRules?: RulesCondition[];
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
          autoStartRules: target.config.autoStartRules ?? [],
          hideRules: target.config.hideRules ?? [],
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
