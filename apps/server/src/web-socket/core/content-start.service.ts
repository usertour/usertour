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
  extractClientWaitTimerConditions,
} from '@/utils/content-utils';
import {
  StartContentOptions,
  TrackCondition,
  SDKContentSession,
  WaitTimerCondition,
} from '@/common/types/sdk';
import { CustomContentVersion } from '@/common/types/content';
import { ContentManagementService } from './content-management.service';
import { ContentSessionService } from './content-session.service';
import { TrackEventService } from './track-event.service';
import { SocketManagementService } from './socket-management.service';
import { SocketClientData } from './socket-data.service';

interface ContentStartContext {
  server: Server;
  client: Socket;
  contentType: ContentDataType;
  options?: StartContentOptions;
}

interface ContentStartResult {
  success: boolean;
  session?: SDKContentSession;
  trackConditions?: TrackCondition[];
  waitTimerConditions?: WaitTimerCondition[];
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
    private readonly socketManagementService: SocketManagementService,
  ) {}

  /**
   * Handles invalid session cleanup
   * Cleans up invalid session state and tracking conditions
   */
  private handleInvalidSession(
    context: ContentStartContext,
    invalidSession: SDKContentSession,
  ): void {
    const { client, contentType } = context;

    this.socketManagementService.unsetCurrentContentSession(client, contentType, invalidSession.id);
    this.socketManagementService.untrackCurrentConditions(client);
  }

  /**
   * Handles the result of content start operations
   * Processes ContentStartResult and performs necessary WebSocket operations
   */
  private async handleContentStartResult(
    context: ContentStartContext,
    result: ContentStartResult,
    forceGoToStep = false,
  ): Promise<boolean> {
    const { client, contentType } = context;

    try {
      const { success, session, trackConditions, waitTimerConditions, reason } = result;

      // Early return if operation failed
      if (!success) {
        this.logger.debug(`Content start failed: ${reason}`, {
          contentType,
        });
        return false;
      }

      // Handle successful result
      // Set the content session if one was created
      if (session) {
        this.socketManagementService.setContentSession(client, session);
        if (forceGoToStep) {
          this.socketManagementService.forceGoToStep(
            client,
            session.id,
            session.currentStep?.cvid!,
          );
        }
        this.socketManagementService.cancelCurrentWaitTimerConditions(client);
      }

      // Handle track conditions if any were returned
      const excludeConditionIds =
        trackConditions?.map((trackCondition) => trackCondition.condition.id) ?? [];
      //untrack current conditions
      this.socketManagementService.untrackCurrentConditions(client, excludeConditionIds);
      // Track the new conditions
      this.socketManagementService.trackClientConditions(client, trackConditions);

      // Track the new wait timer conditions
      if (waitTimerConditions) {
        this.socketManagementService.startWaitTimerConditions(client, waitTimerConditions);
      }

      this.logger.debug(`Content start succeeded: ${reason}`, {
        contentType,
      });

      return true;
    } catch (error) {
      this.logger.error(`Error in handleContentStartResult: ${error.message}`, {
        contentType,
      });
      return false;
    }
  }

  /**
   * Main entry point for starting singleton content
   * Implements multiple strategies for content activation and coordinates the start process
   */
  async startSingletonContent(context: ContentStartContext): Promise<boolean> {
    const { client, contentType, options } = context;
    const { contentId } = options ?? {};

    try {
      // Strategy 1: Try to start by specific contentId
      if (contentId) {
        const result = await this.tryStartByContentId(context);
        if (result.success) {
          return await this.handleContentStartResult(context, result, true);
        }
      }

      // Strategy 2: Handle existing session
      const existingSessionResult = await this.handleExistingSession(context);
      if (existingSessionResult.success) {
        return await this.handleContentStartResult(context, existingSessionResult);
      }

      if (existingSessionResult.invalidSession) {
        this.handleInvalidSession(context, existingSessionResult.invalidSession);
      }

      // Get evaluated content versions for remaining strategies
      const evaluatedContentVersions = await this.getEvaluatedContentVersions(client, contentType);

      // Strategy 3: Try to start by latest activated content version
      const latestVersionResult = await this.tryStartByLatestActivatedContentVersion(
        context,
        evaluatedContentVersions,
      );
      if (latestVersionResult.success) {
        return await this.handleContentStartResult(context, latestVersionResult);
      }

      // Strategy 4: Try to start by auto start conditions
      const autoStartResult = await this.tryStartByAutoStartConditions(
        context,
        evaluatedContentVersions,
      );
      if (autoStartResult.success) {
        return await this.handleContentStartResult(context, autoStartResult);
      }

      // Strategy 5: Setup tracking conditions for future activation
      const trackingResult = await this.setupTrackingConditions(context, evaluatedContentVersions);

      return await this.handleContentStartResult(context, trackingResult);
    } catch (error) {
      this.logger.error(`Failed to start singleton content: ${error.message}`, {
        contentType,
        options,
        stack: error.stack,
      });

      return false;
    }
  }

  /**
   * Strategy 1: Try to start content by specific contentId
   */
  private async tryStartByContentId(context: ContentStartContext): Promise<ContentStartResult> {
    const { client, contentType, options } = context;
    const { contentId } = options!;
    const socketClietData = await this.socketManagementService.getClientData(client.id);
    if (!socketClietData) {
      return {
        success: false,
        reason: 'No socket client data',
      };
    }
    const { environment } = socketClietData;

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
    const socketClietData = await this.socketManagementService.getClientData(client.id);
    if (!socketClietData) {
      return {
        success: false,
        reason: 'No socket client data',
      };
    }
    const { environment, externalUserId, externalCompanyId } = socketClietData;

    const session = await this.socketManagementService.getSessionByContentType(
      client.id,
      contentType,
    );
    if (!session) {
      return { success: false, reason: 'No existing session' };
    }
    // Refresh session
    const refreshedSession = await this.contentSessionService.refreshContentSession(
      session,
      environment,
      externalUserId,
      externalCompanyId,
    );

    // Compare session to detect changes
    const isSessionChanged = this.contentSessionService.compareContentSessions(
      session,
      refreshedSession,
    );
    const isActive = await this.isSessionActive(client, contentType, session);
    if (isActive) {
      if (isSessionChanged) {
        return {
          success: true,
          reason: 'Existing active session with changes',
          session: refreshedSession,
        };
      }
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
    const { contentType, client } = context;
    const socketClietData = await this.socketManagementService.getClientData(client.id);
    if (!socketClietData) {
      return {
        success: false,
        reason: 'No socket client data',
      };
    }
    const { waitTimerConditions } = socketClietData;
    const firedWaitTimerVersionIds = waitTimerConditions
      ?.filter((waitTimerCondition) => waitTimerCondition.activated)
      .map((waitTimerCondition) => waitTimerCondition.versionId);

    const autoStartContentVersions = filterAvailableAutoStartContentVersions(
      evaluatedContentVersions,
      contentType as ContentDataType.CHECKLIST | ContentDataType.FLOW,
      firedWaitTimerVersionIds,
    );

    if (!autoStartContentVersions || autoStartContentVersions.length === 0) {
      return {
        success: false,
        reason: 'No auto-start content version available',
      };
    }
    const autoStartContentVersion = autoStartContentVersions[0];

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

    const waitTimerConditions = extractClientWaitTimerConditions(trackCustomContentVersions);

    if (trackConditions.length > 0 || waitTimerConditions.length > 0) {
      // This would need to be implemented in the calling service
      // as it involves WebSocket-specific operations
      return {
        success: true,
        trackConditions,
        waitTimerConditions,
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
    clientData: SocketClientData,
    startOptions: StartContentOptions,
    createNewSession = false,
  ): Promise<ContentStartResult & { sessionId?: string; currentStepCvid?: string }> {
    if (createNewSession) {
      return await this.createNewSession(customContentVersion, clientData, startOptions);
    }

    return this.findExistingSession(customContentVersion, startOptions);
  }

  /**
   * Create a new business session
   */
  private async createNewSession(
    customContentVersion: CustomContentVersion,
    clientData: SocketClientData,
    startOptions: StartContentOptions,
  ): Promise<ContentStartResult & { sessionId?: string; currentStepCvid?: string }> {
    const { environment, externalUserId, externalCompanyId, clientContext } = clientData;
    const { stepCvid, startReason } = startOptions;
    const versionId = customContentVersion.id;
    const steps = customContentVersion.steps;
    const currentStepCvid = stepCvid || steps?.[0]?.cvid;
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
      clientContext,
    );

    return {
      success: true,
      sessionId: bizSession.id,
      currentStepCvid,
    };
  }

  /**
   * Find existing session
   */
  private findExistingSession(
    customContentVersion: CustomContentVersion,
    startOptions: StartContentOptions,
  ): ContentStartResult & { sessionId?: string; currentStepCvid?: string } {
    const session = customContentVersion.session;
    const contentType = customContentVersion.content.type as ContentDataType;
    const { stepCvid } = startOptions;
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
    clientData: SocketClientData,
    stepCvid: string,
  ): Promise<SDKContentSession | null> {
    return await this.contentSessionService.createContentSession(
      sessionId,
      customContentVersion,
      clientData,
      stepCvid,
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
  private extractHideRulesConditions(customContentVersion: CustomContentVersion): TrackCondition[] {
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
    const clientData = await this.socketManagementService.getClientData(client.id);
    if (!clientData) {
      return {
        success: false,
        reason: 'No socket client data',
      };
    }

    try {
      // Handle session management
      const sessionResult = await this.handleSessionManagement(
        customContentVersion,
        clientData,
        options,
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

      // Extract tracking conditions for hide rules
      const trackConditions = this.extractHideRulesConditions(customContentVersion);

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
    const socketClietData = await this.socketManagementService.getClientData(client.id);
    if (!socketClietData) {
      return [];
    }
    const { environment, trackConditions, externalUserId, externalCompanyId } = socketClietData;

    // Get client context from socket data
    const clientContext = socketClietData.clientContext;

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
