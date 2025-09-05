import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'nestjs-prisma';
import { ContentDataType, RulesType } from '@usertour/types';
import {
  filterActivatedContentWithoutClientConditions,
  findLatestActivatedCustomContentVersion,
  filterAvailableAutoStartContentVersions,
  isActivedHideRules,
  extractClientTrackConditions,
  ConditionExtractionMode,
  evaluateCustomContentVersion,
  findAvailableSessionId,
  findLatestStepCvid,
} from '@/utils/content-utils';
import { StartContentOptions, TrackCondition, SDKContentSession } from '@/common/types/sdk';
import { CustomContentVersion } from '@/common/types/content';
import { ContentManagementService } from './content-management.service';
import { ContentSessionService } from './content-session.service';
import { TrackEventService } from './track-event.service';
import { UserClientContextService } from './user-client-context.service';
import {
  getClientData,
  setContentSession,
  unsetContentSession,
  trackClientConditions,
  untrackCurrentConditions,
  getContentSession,
} from '@/web-socket/core/socket-helper';

export interface ContentStartContext {
  server: Server;
  client: Socket;
  contentType: ContentDataType;
  options?: StartContentOptions;
}

export interface ContentStartResult {
  success: boolean;
  session?: SDKContentSession;
  trackConditions?: TrackCondition[];
  reason?: string;
  invalidSession?: SDKContentSession;
}

/**
 * Service responsible for starting content (flows, checklists) with various strategies
 */
@Injectable()
export class ContentStartService {
  private readonly logger = new Logger(ContentStartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentManagementService: ContentManagementService,
    private readonly contentSessionService: ContentSessionService,
    private readonly trackEventService: TrackEventService,
    private readonly userClientContextService: UserClientContextService,
  ) {}

  /**
   * Main entry point for starting singleton content
   * Implements multiple strategies for content activation and handles all WebSocket operations
   */
  async startSingletonContent(context: ContentStartContext): Promise<boolean> {
    const { server, client, contentType } = context;

    try {
      const result = await this.startSingletonContentInternal(context);

      // Handle invalid session cleanup
      if (result.invalidSession) {
        unsetContentSession(server, client, contentType, result.invalidSession.id);
        untrackCurrentConditions(server, client);
      }

      // Early return if operation failed
      if (!result.success) {
        this.logger.debug(`Content start failed: ${result.reason}`, {
          contentType,
        });
        return false;
      }

      // Handle successful result
      // Set the content session if one was created
      if (result.session) {
        setContentSession(server, client, result.session);
      }

      // Handle track conditions if any were returned
      if (result.trackConditions && result.trackConditions.length > 0) {
        // For hide-only conditions, untrack current conditions first
        const excludeConditionIds = result.trackConditions.map(
          (trackCondition) => trackCondition.condition.id,
        );
        untrackCurrentConditions(server, client, excludeConditionIds);

        // Track the new conditions
        trackClientConditions(server, client, result.trackConditions);
      }

      this.logger.debug(`Content start succeeded: ${result.reason}`, {
        contentType,
      });

      return true;
    } catch (error) {
      this.logger.error(`Error in startSingletonContent: ${error.message}`, {
        contentType,
      });
      return false;
    }
  }

  /**
   * Internal method for content start logic (returns detailed result)
   */
  private async startSingletonContentInternal(
    context: ContentStartContext,
  ): Promise<ContentStartResult> {
    const { client, contentType, options } = context;
    const { contentId } = options ?? {};

    try {
      // Strategy 1: Try to start by specific contentId
      if (contentId) {
        const result = await this.tryStartByContentId(context);
        if (result.success) {
          return result;
        }
      }

      // Strategy 2: Handle existing session
      const existingSessionResult = await this.handleExistingSession(context);
      if (existingSessionResult.success) {
        return existingSessionResult;
      }

      // Get evaluated content versions for remaining strategies
      const evaluatedContentVersions = await this.getEvaluatedContentVersions(client, contentType);

      // Strategy 3: Try to start by latest activated content version
      const latestVersionResult = await this.tryStartByLatestActivatedContentVersion(
        context,
        evaluatedContentVersions,
      );
      if (latestVersionResult.success) {
        return latestVersionResult;
      }

      // Strategy 4: Try to start by auto start conditions
      const autoStartResult = await this.tryStartByAutoStartConditions(
        context,
        evaluatedContentVersions,
      );
      if (autoStartResult.success) {
        return autoStartResult;
      }

      // Strategy 5: Setup tracking conditions for future activation
      const trackingResult = await this.setupTrackingConditions(context, evaluatedContentVersions);

      return trackingResult;
    } catch (error) {
      this.logger.error(`Failed to start singleton content: ${error.message}`, {
        contentType,
        options,
        stack: error.stack,
      });

      return {
        success: false,
        reason: `Error starting content: ${error.message}`,
      };
    }
  }

  /**
   * Strategy 1: Try to start content by specific contentId
   */
  private async tryStartByContentId(context: ContentStartContext): Promise<ContentStartResult> {
    const { client, contentType, options } = context;
    const { contentId } = options!;
    const { environment } = getClientData(client);

    try {
      // Get published version for the specific content
      const contentOnEnvironment = await this.prisma.contentOnEnvironment.findFirst({
        where: {
          environmentId: environment.id,
          contentId: contentId,
          published: true,
        },
      });

      if (!contentOnEnvironment) {
        return {
          success: false,
          reason: 'Content not found or not published',
        };
      }

      const evaluatedContentVersions = await this.getEvaluatedContentVersions(
        client,
        contentType,
        contentOnEnvironment.publishedVersionId,
      );

      if (evaluatedContentVersions.length > 0) {
        const result = await this.processContentVersion(
          context,
          evaluatedContentVersions[0],
          true, // createNewSession
        );

        if (result.success) {
          return {
            ...result,
            reason: 'Started by contentId',
          };
        }
      }

      return {
        success: false,
        reason: 'Content version not available or not activated',
      };
    } catch (error) {
      this.logger.error(`Error in tryStartByContentId: ${error.message}`);
      return {
        success: false,
        reason: `Error starting by contentId: ${error.message}`,
      };
    }
  }

  /**
   * Strategy 2: Handle existing session validation
   */
  private async handleExistingSession(context: ContentStartContext): Promise<ContentStartResult> {
    const { client, contentType } = context;

    const session = getContentSession(client, contentType);
    if (!session) {
      return { success: false, reason: 'No existing session' };
    }

    const isActive = await this.isSessionActive(client, contentType, session);
    if (isActive) {
      return {
        success: true,
        reason: 'Existing active session',
      };
    }

    // Return information about invalid session that needs cleanup
    return {
      success: false,
      reason: 'Existing session was invalid and needs cleanup',
      invalidSession: session,
    };
  }

  /**
   * Strategy 3: Try to start by latest activated content version
   */
  private async tryStartByLatestActivatedContentVersion(
    context: ContentStartContext,
    evaluatedContentVersions: CustomContentVersion[],
  ): Promise<ContentStartResult> {
    const { contentType } = context;

    const latestActivatedContentVersion = findLatestActivatedCustomContentVersion(
      evaluatedContentVersions,
      contentType as ContentDataType.CHECKLIST | ContentDataType.FLOW,
    );

    if (!latestActivatedContentVersion) {
      return {
        success: false,
        reason: 'No latest activated content version found',
      };
    }

    const result = await this.processContentVersion(
      context,
      latestActivatedContentVersion,
      false, // don't create new session
    );

    return {
      ...result,
      reason: result.success ? 'Started by latest activated version' : result.reason,
    };
  }

  /**
   * Strategy 4: Try to start by auto start conditions
   */
  private async tryStartByAutoStartConditions(
    context: ContentStartContext,
    evaluatedContentVersions: CustomContentVersion[],
  ): Promise<ContentStartResult> {
    const { contentType } = context;

    const autoStartContentVersion = filterAvailableAutoStartContentVersions(
      evaluatedContentVersions,
      contentType as ContentDataType.CHECKLIST | ContentDataType.FLOW,
    )?.[0];

    if (!autoStartContentVersion) {
      return {
        success: false,
        reason: 'No auto-start content version available',
      };
    }

    const result = await this.processContentVersion(
      context,
      autoStartContentVersion,
      true, // create new session for auto-start
    );

    return {
      ...result,
      reason: result.success ? 'Started by auto-start conditions' : result.reason,
    };
  }

  /**
   * Strategy 5: Setup tracking conditions for future activation
   */
  private async setupTrackingConditions(
    context: ContentStartContext,
    evaluatedContentVersions: CustomContentVersion[],
  ): Promise<ContentStartResult> {
    const { contentType } = context;

    const trackCustomContentVersions: CustomContentVersion[] =
      filterActivatedContentWithoutClientConditions(evaluatedContentVersions, contentType);

    const trackConditions = extractClientTrackConditions(
      trackCustomContentVersions,
      ConditionExtractionMode.BOTH,
    );

    if (trackConditions.length > 0) {
      // This would need to be implemented in the calling service
      // as it involves WebSocket-specific operations
      return {
        success: true,
        trackConditions,
        reason: 'Setup tracking conditions for future activation',
      };
    }

    return {
      success: true,
      reason: 'No content available for activation or tracking',
    };
  }

  /**
   * Validate content version before processing
   */
  private validateContentVersion(customContentVersion: CustomContentVersion): ContentStartResult {
    if (isActivedHideRules(customContentVersion)) {
      return {
        success: false,
        reason: 'Content is hidden by rules',
      };
    }

    return { success: true };
  }

  /**
   * Handle session management (create new or find existing)
   */
  private async handleSessionManagement(
    customContentVersion: CustomContentVersion,
    clientData: any,
    stepCvid?: string,
    createNewSession = false,
  ): Promise<ContentStartResult & { sessionId?: string; currentStepCvid?: string }> {
    const { environment, externalUserId, externalCompanyId } = clientData;
    const contentType = customContentVersion.content.type as ContentDataType;
    const versionId = customContentVersion.id;
    const steps = customContentVersion.steps;

    if (createNewSession) {
      return await this.createNewSession(
        customContentVersion,
        environment,
        externalUserId,
        externalCompanyId,
        versionId,
        stepCvid,
        steps,
      );
    }

    return this.findExistingSession(customContentVersion, contentType, stepCvid);
  }

  /**
   * Create a new business session
   */
  private async createNewSession(
    customContentVersion: CustomContentVersion,
    environment: any,
    externalUserId: string,
    externalCompanyId: string,
    versionId: string,
    stepCvid?: string,
    steps?: any[],
  ): Promise<ContentStartResult & { sessionId?: string; currentStepCvid?: string }> {
    const startReason = 'auto_start';
    const bizSession = await this.contentSessionService.createBizSession(
      environment,
      externalUserId,
      externalCompanyId,
      versionId,
    );

    if (!bizSession) {
      return {
        success: false,
        reason: 'Failed to create business session',
      };
    }

    await this.trackEventService.trackAutoStartEvent(
      customContentVersion,
      bizSession,
      environment,
      externalUserId,
      startReason,
    );

    return {
      success: true,
      sessionId: bizSession.id,
      currentStepCvid: stepCvid || steps?.[0]?.cvid,
    };
  }

  /**
   * Find existing session
   */
  private findExistingSession(
    customContentVersion: CustomContentVersion,
    contentType: ContentDataType,
    stepCvid?: string,
  ): ContentStartResult & { sessionId?: string; currentStepCvid?: string } {
    const session = customContentVersion.session;
    const sessionId = findAvailableSessionId(session.latestSession, contentType);
    const currentStepCvid = stepCvid || findLatestStepCvid(session.latestSession?.bizEvent);

    if (!sessionId) {
      return {
        success: false,
        reason: 'No available session found',
      };
    }

    return {
      success: true,
      sessionId,
      currentStepCvid,
    };
  }

  /**
   * Create content session
   */
  private async createContentSession(
    sessionId: string,
    customContentVersion: CustomContentVersion,
    clientData: any,
    contentType: ContentDataType,
    currentStepCvid: string,
  ): Promise<SDKContentSession | null> {
    const { environment, externalUserId, externalCompanyId } = clientData;

    return await this.contentSessionService.createContentSession(
      sessionId,
      customContentVersion,
      environment,
      externalUserId,
      contentType,
      externalCompanyId,
      currentStepCvid,
    );
  }

  /**
   * Update session version
   */
  private async updateSessionVersion(sessionId: string, versionId: string): Promise<void> {
    await this.prisma.bizSession.update({
      where: { id: sessionId },
      data: { versionId },
    });
  }

  /**
   * Extract tracking conditions for hide rules
   */
  private extractTrackingConditions(customContentVersion: CustomContentVersion): TrackCondition[] {
    return extractClientTrackConditions([customContentVersion], ConditionExtractionMode.HIDE_ONLY);
  }

  /**
   * Process content version with common logic
   */
  private async processContentVersion(
    context: ContentStartContext,
    customContentVersion: CustomContentVersion,
    createNewSession = false,
  ): Promise<ContentStartResult> {
    // Early validation
    const validationResult = this.validateContentVersion(customContentVersion);
    if (!validationResult.success) {
      return validationResult;
    }

    const { client, options } = context;
    const { stepCvid } = options ?? {};
    const clientData = getClientData(client);
    const contentType = customContentVersion.content.type as ContentDataType;

    try {
      // Handle session management
      const sessionResult = await this.handleSessionManagement(
        customContentVersion,
        clientData,
        stepCvid,
        createNewSession,
      );

      if (!sessionResult.success) {
        return sessionResult;
      }

      // Create content session
      const contentSession = await this.createContentSession(
        sessionResult.sessionId!,
        customContentVersion,
        clientData,
        contentType,
        sessionResult.currentStepCvid!,
      );

      if (!contentSession) {
        return {
          success: false,
          reason: 'Failed to create content session',
        };
      }

      // Update session version
      await this.updateSessionVersion(sessionResult.sessionId!, customContentVersion.id);

      // Extract tracking conditions
      const trackConditions = this.extractTrackingConditions(customContentVersion);

      return {
        success: true,
        session: contentSession,
        trackConditions,
        reason: 'Content session created successfully',
      };
    } catch (error) {
      this.logger.error(`Error processing content version: ${error.message}`);
      return {
        success: false,
        reason: `Error processing content version: ${error.message}`,
      };
    }
  }

  /**
   * Get evaluated content versions
   */
  private async getEvaluatedContentVersions(
    client: Socket,
    contentType: ContentDataType,
    versionId?: string,
  ): Promise<CustomContentVersion[]> {
    const { environment, trackConditions, externalUserId, externalCompanyId } =
      getClientData(client);

    // Get user client context
    const userClientContext = await this.userClientContextService.getUserClientContext(
      environment,
      externalUserId,
    );
    const clientContext = userClientContext?.clientContext;

    // Extract activated and deactivated condition IDs
    const activatedIds = trackConditions
      ?.filter((trackCondition: TrackCondition) => trackCondition.condition.actived)
      .map((trackCondition: TrackCondition) => trackCondition.condition.id);

    const deactivatedIds = trackConditions
      ?.filter((trackCondition: TrackCondition) => !trackCondition.condition.actived)
      .map((trackCondition: TrackCondition) => trackCondition.condition.id);

    const contentVersions = await this.contentManagementService.fetchCustomContentVersions(
      environment,
      externalUserId,
      externalCompanyId,
      versionId,
    );

    const filteredContentVersions = contentVersions.filter((contentVersion) =>
      [contentType].includes(contentVersion.content.type as ContentDataType),
    );

    // Evaluate content versions with proper conditions
    return await evaluateCustomContentVersion(filteredContentVersions, {
      typeControl: {
        [RulesType.CURRENT_PAGE]: true,
        [RulesType.TIME]: true,
      },
      clientContext,
      activatedIds,
      deactivatedIds,
    });
  }

  /**
   * Check if the existing session is still active
   */
  private async isSessionActive(
    client: Socket,
    contentType: ContentDataType,
    session: SDKContentSession,
  ): Promise<boolean> {
    const sessionVersion = await this.getEvaluatedContentVersions(
      client,
      contentType,
      session.version.id,
    );

    return sessionVersion.length > 0 && !isActivedHideRules(sessionVersion[0]);
  }
}
