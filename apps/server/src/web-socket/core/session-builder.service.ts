import { AttributeBizType, Attribute } from '@/attributes/models/attribute.model';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  ChecklistData,
  ContentDataType,
  RulesType,
  Step as SDKStep,
  ThemeTypesSetting,
  ThemeVariation,
} from '@usertour/types';
import {
  extractStepTriggerAttributeIds,
  extractStepContentAttrCodes,
  extractThemeVariationsAttributeIds,
  getAttributeValue,
  evaluateChecklistItems,
  getChecklistInitialDisplay,
} from '@/utils/content-utils';
import {
  SessionAttribute,
  CustomContentVersion,
  SocketData,
  CustomContentSession,
  SessionTheme,
  SessionStep,
  Environment,
  Step,
  Theme,
  BizSession,
  BizSessionWithContentAndVersion,
  ClientCondition,
} from '@/common/types';
import { DataResolverService } from './data-resolver.service';

@Injectable()
export class SessionBuilderService {
  private readonly logger = new Logger(SessionBuilderService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataResolverService: DataResolverService,
  ) {}

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
    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: { externalId: String(externalCompanyId), environmentId },
    });
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
   * Get theme settings
   * @param themes - The themes
   * @param themeId - The theme ID
   * @returns The theme settings or null if not found
   */
  async createSessionTheme(
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
  async createSessionSteps(
    steps: SDKStep[],
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
        return step;
      }

      const sessionTheme = themeCache.get(step.themeId);
      return {
        ...step,
        theme: sessionTheme,
      };
    });

    return results;
  }

  /**
   * Create content session
   * @param sessionId - The session ID
   * @param customContentVersion - The custom content version
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param contentType - The content type
   * @param externalCompanyId - The external company ID
   * @param stepIndex - The step index
   * @returns The content session or null if the session creation fails
   */
  async createContentSession(
    sessionId: string,
    customContentVersion: CustomContentVersion,
    socketData: SocketData,
    stepCvid?: string,
  ): Promise<CustomContentSession | null> {
    const { environment, externalUserId, externalCompanyId } = socketData;
    const contentType = customContentVersion.content.type as ContentDataType;
    const config = await this.dataResolverService.getConfig(environment);
    const themes = await this.dataResolverService.fetchThemes(
      environment,
      externalUserId,
      externalCompanyId,
    );
    const sessionTheme = await this.createSessionTheme(
      themes,
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
        themes,
        stepCvid,
      );
    }
    return session;
  }

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
    const { clientContext, clientConditions } = socketData;

    // Extract activated and deactivated condition IDs
    const activatedIds = clientConditions
      ?.filter((clientCondition: ClientCondition) => clientCondition.isActive === true)
      .map((clientCondition: ClientCondition) => clientCondition.conditionId);

    const deactivatedIds = clientConditions
      ?.filter((clientCondition: ClientCondition) => clientCondition.isActive === false)
      .map((clientCondition: ClientCondition) => clientCondition.conditionId);

    // Evaluate content versions with proper conditions
    const items = await evaluateChecklistItems(customContentVersion, {
      typeControl: {
        [RulesType.CURRENT_PAGE]: true,
        [RulesType.TIME]: true,
      },
      clientContext,
      activatedIds,
      deactivatedIds,
    });
    const checklistData = customContentVersion.data as unknown as ChecklistData;

    const initialDisplay = getChecklistInitialDisplay(customContentVersion);
    session.version.checklist = { ...checklistData, items, initialDisplay };
    return session;
  }

  /**
   * Process FLOW content type session
   * @param session - The content session
   * @param customContentVersion - The custom content version
   * @param themes - The themes array
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param externalCompanyId - The external company ID
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

    const versionSteps = customContentVersion.steps as unknown as SDKStep[];
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
   * Rebuild content session with regenerated data
   * @param contentSession - The existing content session
   * @param customContentVersion - The custom content version
   * @param socketData - The client data
   * @returns Rebuilt content session or null if rebuild fails
   */
  async rebuildContentSession(
    customContentVersion: CustomContentVersion,
    contentSession: CustomContentSession,
    socketData: SocketData,
  ): Promise<CustomContentSession | null> {
    const { environment, externalUserId, externalCompanyId } = socketData;

    // Get themes for session theme creation
    const themes = await this.dataResolverService.fetchThemes(
      environment,
      externalUserId,
      externalCompanyId,
    );
    const themeId = customContentVersion.themeId;

    // Regenerate session theme
    const sessionTheme = await this.createSessionTheme(
      themes,
      themeId,
      environment,
      externalUserId,
      externalCompanyId,
    );

    if (!sessionTheme) {
      this.logger.error(`Failed to create session theme for themeId ${themeId}`);
      return null;
    }
    const contentType = contentSession.type as ContentDataType;

    // Create a deep copy of the content session to avoid mutating the original
    const newSession: CustomContentSession = {
      ...contentSession,
      version: {
        ...contentSession.version,
        theme: sessionTheme,
      },
    };
    if (contentType === ContentDataType.FLOW) {
      return await this.processFlowSession(newSession, customContentVersion, socketData, themes);
    }
    if (contentType === ContentDataType.CHECKLIST) {
      return await this.processChecklistSession(newSession, customContentVersion, socketData);
    }

    return newSession;
  }

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

    return await this.extractAttributes(
      attrIds,
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

    const attributes = await this.prisma.attribute.findMany({
      where: {
        projectId: environment.projectId,
        bizType: {
          in: [AttributeBizType.USER, AttributeBizType.COMPANY, AttributeBizType.MEMBERSHIP],
        },
      },
    });

    // Filter attributes by the extracted IDs and codes
    const relevantAttributes = attributes.filter(
      (attr) =>
        attrIds.includes(attr.id) ||
        (attrCodes.includes(attr.codeName) && attr.bizType === AttributeBizType.USER),
    );

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

  /**
   * Query user attribute value based on attribute business type
   * @param attr - Attribute definition
   * @param environment - Environment context
   * @param bizUser - Business user
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
    const bizUser = await this.prisma.bizUser.findFirst({
      where: {
        environmentId,
        externalId: String(externalUserId),
      },
      select: {
        data: true,
        id: true,
      },
    });

    if (!bizUser) return null;

    if (attr.bizType === AttributeBizType.USER) {
      if (bizUser?.data) {
        return getAttributeValue(bizUser.data, attr.codeName);
      }
      return null;
    }

    if (attr.bizType === AttributeBizType.COMPANY || attr.bizType === AttributeBizType.MEMBERSHIP) {
      if (!externalCompanyId) return null;

      const bizCompany = await this.prisma.bizCompany.findFirst({
        where: {
          externalId: String(externalCompanyId),
          environmentId,
        },
      });

      if (!bizCompany) return null;

      const userOnCompany = await this.prisma.bizUserOnCompany.findFirst({
        where: {
          bizUserId: bizUser.id,
          bizCompanyId: bizCompany.id,
        },
        select: {
          data: true,
        },
      });

      if (!userOnCompany) return null;

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

  /**
   * Get biz session
   * @param sessionId - The session ID
   * @returns The biz session or null if not found
   */
  async getBizSessionWithContentAndVersion(
    sessionId: string,
  ): Promise<BizSessionWithContentAndVersion | null> {
    return await this.prisma.bizSession.findUnique({
      where: { id: sessionId, state: 0 },
      include: {
        content: true,
        version: true,
      },
    });
  }
}
