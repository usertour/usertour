import { Injectable } from '@nestjs/common';
import { BizSession, Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { getEventProgress, getEventState, isValidEvent } from '@/utils/event';
import {
  BizEvents,
  CompanyAttributes,
  ContentDataType,
  EventAttributes,
  UserAttributes,
  ClientContext,
} from '@usertour/types';
import { BizCompany, BizEvent, BizUser, Environment, Event } from '@/common/types/schema';
import { TrackEventData } from '@/common/types/track';
import { CustomContentVersion } from '@/common/types/content';
import { deepmerge } from 'deepmerge-ts';

@Injectable()
export class EventTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Filter event data based on allowed attributes for the event
   * @param eventId - The ID of the event
   * @param data - The raw event data to filter
   * @returns The filtered event data or false if no valid attributes found
   */
  private async filterEventDataByAttributes(
    eventId: string,
    data: Record<string, any>,
  ): Promise<Record<string, any> | false> {
    // Early return if no data provided
    if (!data || Object.keys(data).length === 0) {
      return false;
    }

    // Fetch event attributes with optimized query
    const attributes = await this.prisma.attributeOnEvent.findMany({
      where: { eventId },
      select: {
        attribute: {
          select: {
            codeName: true,
          },
        },
      },
    });

    if (!attributes?.length) {
      return false;
    }

    // Create a Set for O(1) lookup performance instead of O(n) find
    const allowedAttributeNames = new Set(attributes.map((attr) => attr.attribute.codeName));

    // Filter data using efficient Set lookup
    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (allowedAttributeNames.has(key)) {
        filteredData[key] = value;
      }
    }

    // Return filtered data only if we have valid attributes
    return Object.keys(filteredData).length > 0 ? filteredData : false;
  }

  /**
   * Update seen attributes for a data record
   * @param data - Current data record
   * @param firstSeenKey - Key for first seen timestamp
   * @param lastSeenKey - Key for last seen timestamp
   * @param currentTime - Current timestamp
   * @returns Updated data with seen attributes
   */
  private updateSeenAttributesData(
    data: Record<string, unknown>,
    firstSeenKey: string,
    lastSeenKey: string,
    currentTime: string,
  ): Record<string, unknown> {
    const isFirstEvent = !data[firstSeenKey];

    return {
      ...data,
      [lastSeenKey]: currentTime,
      ...(isFirstEvent && { [firstSeenKey]: currentTime }),
    };
  }

  /**
   * Update user seen attributes
   * @param tx - Database transaction
   * @param user - Business user
   * @param currentTime - Current timestamp
   * @returns Promise for user update operation
   */
  private updateUserSeenAttributes(
    tx: Prisma.TransactionClient,
    user: BizUser,
    currentTime: string,
  ): Promise<BizUser> {
    const userData = (user.data as Record<string, unknown>) || {};
    const updatedUserData = this.updateSeenAttributesData(
      userData,
      UserAttributes.FIRST_SEEN_AT,
      UserAttributes.LAST_SEEN_AT,
      currentTime,
    );

    return tx.bizUser.update({
      where: { id: user.id },
      data: { data: updatedUserData as any },
    });
  }

  /**
   * Update company seen attributes if company exists
   * @param tx - Database transaction
   * @param bizCompanyId - Business company ID
   * @param currentTime - Current timestamp
   * @returns Promise for company update operation or null
   */
  private async updateCompanySeenAttributes(
    tx: Prisma.TransactionClient,
    bizCompanyId: string,
    currentTime: string,
  ): Promise<BizCompany | null> {
    const company = await tx.bizCompany.findUnique({
      where: { id: bizCompanyId },
    });

    if (!company) {
      return null;
    }

    const companyData = (company.data as Record<string, unknown>) || {};
    const updatedCompanyData = this.updateSeenAttributesData(
      companyData,
      CompanyAttributes.FIRST_SEEN_AT,
      CompanyAttributes.LAST_SEEN_AT,
      currentTime,
    );

    return tx.bizCompany.update({
      where: { id: company.id },
      data: { data: updatedCompanyData as any },
    });
  }

  /**
   * Update user and company seen attributes
   * @param tx - Database transaction
   * @param user - Business user
   * @param bizSession - Business session
   * @returns Promise<void>
   */
  private async updateSeenAttributes(
    tx: Prisma.TransactionClient,
    user: BizUser,
    bizSession: { bizCompanyId: string | null },
  ): Promise<void> {
    const currentTime = new Date().toISOString();

    // Prepare update operations
    const updateOperations: Promise<BizUser | BizCompany | null>[] = [
      this.updateUserSeenAttributes(tx, user, currentTime),
    ];

    // Add company update operation if company exists
    if (bizSession.bizCompanyId) {
      updateOperations.push(
        this.updateCompanySeenAttributes(tx, bizSession.bizCompanyId, currentTime),
      );
    }

    // Execute all updates in parallel within the transaction
    await Promise.all(updateOperations);
  }

  /**
   * Enrich event data with socket context
   */
  private enrichEventData(data: Record<string, unknown>, clientContext: ClientContext) {
    return clientContext
      ? {
          ...data,
          [EventAttributes.PAGE_URL]: clientContext.pageUrl,
          [EventAttributes.VIEWPORT_WIDTH]: clientContext.viewportWidth,
          [EventAttributes.VIEWPORT_HEIGHT]: clientContext.viewportHeight,
        }
      : data;
  }

  /**
   * Validate required entities for event tracking
   */
  private validateTrackingEntities(bizUser: BizUser, bizSession: BizSession, event: Event) {
    return bizUser && bizSession && bizSession.state !== 1 && event;
  }

  /**
   * Create business answer for question answered events
   */
  private async createBusinessAnswer(
    tx: Prisma.TransactionClient,
    bizEvent: BizEvent,
    events: Record<string, unknown>,
    contentId: string,
    versionId: string,
    bizUserId: string,
    bizSessionId: string,
    environmentId: string,
  ) {
    const answer: any = {
      bizEventId: bizEvent.id,
      contentId,
      cvid: events[EventAttributes.QUESTION_CVID] as string,
      versionId,
      bizUserId,
      bizSessionId,
      environmentId,
    };

    // Map answer fields based on the original implementation
    if (events[EventAttributes.NUMBER_ANSWER]) {
      answer.numberAnswer = events[EventAttributes.NUMBER_ANSWER] as number;
    }
    if (events[EventAttributes.TEXT_ANSWER]) {
      answer.textAnswer = events[EventAttributes.TEXT_ANSWER] as string;
    }
    if (events[EventAttributes.LIST_ANSWER]) {
      answer.listAnswer = events[EventAttributes.LIST_ANSWER] as string[];
    }

    await tx.bizAnswer.create({ data: answer });
  }

  /**
   * Execute event tracking transaction
   */
  private async executeEventTransaction(
    sessionId: string,
    eventName: string,
    events: Record<string, any>,
    bizUser: BizUser,
    bizSession: any,
    event: any,
    progress: number | undefined,
    state: number,
    environmentId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Re-fetch session with latest events
      const latestBizSession = await tx.bizSession.findUnique({
        where: { id: sessionId },
        include: { bizEvent: { include: { event: true } } },
      });

      if (!latestBizSession || latestBizSession.state === 1) {
        return false;
      }

      // Validate event
      if (!isValidEvent(eventName, latestBizSession, events)) {
        return false;
      }

      // Update seen attributes
      await this.updateSeenAttributes(tx, bizUser, bizSession);

      // Create business event
      const bizEvent = await tx.bizEvent.create({
        data: {
          bizUserId: bizUser.id,
          eventId: event.id,
          data: events,
          bizSessionId: bizSession.id,
        },
      });

      // Update session
      await tx.bizSession.update({
        where: { id: bizSession.id },
        data: {
          ...(progress !== undefined && { progress }),
          state,
        },
      });

      // Handle question answered event
      if (eventName === BizEvents.QUESTION_ANSWERED) {
        await this.createBusinessAnswer(
          tx,
          bizEvent,
          events,
          bizSession.contentId,
          bizSession.versionId,
          bizUser.id,
          bizSession.id,
          environmentId,
        );
      }

      return bizEvent;
    });
  }

  /**
   * Build tracking data for integration service
   */
  private buildTrackingData(
    eventName: string,
    bizSession: any,
    externalUserId: string,
    environmentId: string,
    projectId: string,
    events: Record<string, any>,
    bizUser: BizUser,
  ): TrackEventData {
    const trackEventData: TrackEventData = {
      eventName,
      bizSessionId: bizSession.id,
      userId: String(externalUserId),
      environmentId,
      projectId,
      eventProperties: { ...events },
      userProperties: bizUser.data as Record<string, any>,
    };

    // Add flow-specific properties
    if (bizSession.content.type === ContentDataType.FLOW) {
      trackEventData.eventProperties = {
        ...trackEventData.eventProperties,
        [EventAttributes.FLOW_ID]: bizSession.content.id,
        [EventAttributes.FLOW_NAME]: bizSession.content.name,
        [EventAttributes.FLOW_SESSION_ID]: bizSession.id,
        [EventAttributes.FLOW_VERSION_ID]: bizSession.version.id,
        [EventAttributes.FLOW_VERSION_NUMBER]: bizSession.version.sequence,
      };
    }

    return trackEventData;
  }

  /**
   * Track an event
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param eventName - The event name
   * @param sessionId - The session ID
   * @param data - The event data
   * @returns The tracked event
   */
  async trackEvent(
    environment: Environment,
    externalUserId: string,
    eventName: string,
    sessionId: string,
    data: Record<string, any>,
    clientContext: ClientContext,
  ): Promise<BizEvent | false> {
    const { id: environmentId, projectId } = environment;

    const eventData = this.enrichEventData(data, clientContext);

    // Fetch required entities
    const [bizUser, bizSession, event] = await Promise.all([
      this.prisma.bizUser.findFirst({
        where: { externalId: externalUserId, environmentId },
      }),
      this.prisma.bizSession.findUnique({
        where: { id: sessionId },
        include: {
          content: { include: { contentOnEnvironments: true } },
          bizEvent: { include: { event: true } },
          version: true,
        },
      }),
      this.prisma.event.findFirst({
        where: { codeName: eventName, projectId },
      }),
    ]);

    // Validate entities
    if (!this.validateTrackingEntities(bizUser, bizSession, event)) {
      return false;
    }

    // Filter event data
    const events = await this.filterEventDataByAttributes(event.id, eventData);
    if (!events) {
      return false;
    }

    // Calculate progress and state
    const progress =
      events?.flow_step_progress !== undefined
        ? getEventProgress(eventName, events.flow_step_progress)
        : undefined;
    const state = getEventState(eventName);

    // Execute transaction
    const result = await this.executeEventTransaction(
      sessionId,
      eventName,
      events,
      bizUser,
      bizSession,
      event,
      progress,
      state,
      environmentId,
    );

    if (!result) {
      return false;
    }

    // Build tracking data for integration service
    // const trackEventData = this.buildTrackingData(
    //   eventName,
    //   bizSession,
    //   externalUserId,
    //   environmentId,
    //   projectId,
    //   events,
    //   bizUser,
    // );

    // this.integrationService.trackEvent(trackEventData);

    return result;
  }

  /**
   * Build event data for flow start events
   * @param customContentVersion - The custom content version
   * @param startReason - The start reason
   * @returns Flow start event data
   */
  private buildFlowStartEventData(
    customContentVersion: CustomContentVersion,
    startReason: string,
  ): Record<string, any> {
    return {
      [EventAttributes.FLOW_START_REASON]: startReason,
      [EventAttributes.FLOW_VERSION_ID]: customContentVersion.id,
      [EventAttributes.FLOW_VERSION_NUMBER]: customContentVersion.sequence,
    };
  }

  /**
   * Build event data for checklist start events
   * @param customContentVersion - The custom content version
   * @param startReason - The start reason
   * @returns Checklist start event data
   */
  private buildChecklistStartEventData(
    customContentVersion: CustomContentVersion,
    startReason: string,
  ): Record<string, any> {
    return {
      [EventAttributes.CHECKLIST_ID]: customContentVersion.content.id,
      [EventAttributes.CHECKLIST_NAME]: customContentVersion.content.name,
      [EventAttributes.CHECKLIST_START_REASON]: startReason,
      [EventAttributes.CHECKLIST_VERSION_ID]: customContentVersion.id,
      [EventAttributes.CHECKLIST_VERSION_NUMBER]: customContentVersion.sequence,
    };
  }

  /**
   * Get event name and data for auto start events
   * @param customContentVersion - The custom content version
   * @param startReason - The start reason
   * @returns Object containing event name and event data
   */
  private getAutoStartEventConfig(
    customContentVersion: CustomContentVersion,
    startReason: string,
  ): { eventName: string; eventData: Record<string, any> } {
    const contentType = customContentVersion.content.type as ContentDataType;

    if (contentType === ContentDataType.FLOW) {
      return {
        eventName: BizEvents.FLOW_STARTED,
        eventData: this.buildFlowStartEventData(customContentVersion, startReason),
      };
    }

    return {
      eventName: BizEvents.CHECKLIST_STARTED,
      eventData: this.buildChecklistStartEventData(customContentVersion, startReason),
    };
  }

  /**
   * Track auto start event for flows or checklists
   * @param customContentVersion - The custom content version
   * @param bizSession - The business session
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param startReason - The start reason
   * @param clientContext - The socket context
   * @returns The tracked event or false if tracking failed
   */
  async trackAutoStartEvent(
    customContentVersion: CustomContentVersion,
    bizSession: BizSession,
    environment: Environment,
    externalUserId: string,
    startReason: string,
    clientContext: ClientContext,
  ): Promise<BizEvent | false> {
    // Input validation
    if (!customContentVersion?.content?.type || !startReason?.trim() || !externalUserId?.trim()) {
      return false;
    }

    // Get event configuration based on content type
    const { eventName, eventData } = this.getAutoStartEventConfig(
      customContentVersion,
      startReason,
    );

    // Track the event
    return await this.trackEvent(
      environment,
      externalUserId,
      eventName,
      bizSession.id,
      eventData,
      clientContext,
    );
  }

  /**
   * Track flow ended event
   * @param bizSession - The business session
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param endReason - The end reason
   * @returns The tracked event or false if tracking failed
   */
  async trackFlowEndedEvent(
    bizSession: BizSession,
    environment: Environment,
    externalUserId: string,
    endReason: string,
    clientContext: ClientContext,
  ): Promise<BizEvent | false> {
    const latestStepSeenEvent = await this.prisma.bizEvent.findFirst({
      where: {
        bizSessionId: bizSession.id,
        event: {
          codeName: BizEvents.FLOW_STEP_SEEN,
        },
      },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });
    const seenData = (latestStepSeenEvent?.data as any) ?? {};

    const eventData: Record<string, any> = deepmerge({}, seenData, {
      [EventAttributes.FLOW_END_REASON]: endReason,
    });
    const eventName = BizEvents.FLOW_ENDED;

    return await this.trackEvent(
      environment,
      externalUserId,
      eventName,
      bizSession.id,
      eventData,
      clientContext,
    );
  }
}
