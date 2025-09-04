import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { TrackEventDto } from '../v2/web-socket-v2.dto';
import { getEventProgress, getEventState, isValidEvent } from '@/utils/event';
import {
  BizEvents,
  CompanyAttributes,
  ContentDataType,
  EventAttributes,
  UserAttributes,
} from '@usertour/types';
import { BizEvent, BizUser, Environment } from '@/common/types/schema';
import { TrackEventData } from '@/common/types/track';

@Injectable()
export class TrackEventService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get filtered event data
   * @param eventId - The ID of the event
   * @param data - The data to get filtered event data
   * @returns The filtered event data
   */
  private async getFilterdEventData(
    eventId: string,
    data: any,
  ): Promise<Record<string, any> | false> {
    const attributes = await this.prisma.attributeOnEvent.findMany({
      where: { eventId },
      include: { attribute: true },
    });
    if (!attributes || attributes.length === 0) {
      return false;
    }

    const attrs = {};
    for (const key in data) {
      const isFind = attributes.find((attr) => attr.attribute.codeName === key);
      if (isFind) {
        attrs[key] = data[key];
      }
    }
    return attrs;
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
    // Update user attributes
    const currentTime = new Date().toISOString();
    const userData = (user.data as Record<string, unknown>) || {};
    const isFirstUserEvent = !userData[UserAttributes.FIRST_SEEN_AT];

    const updatedUserData = {
      ...userData,
      [UserAttributes.LAST_SEEN_AT]: currentTime,
      ...(isFirstUserEvent && { [UserAttributes.FIRST_SEEN_AT]: currentTime }),
    };

    await tx.bizUser.update({
      where: { id: user.id },
      data: { data: updatedUserData },
    });

    // Update company attributes if user belongs to a company
    if (bizSession.bizCompanyId) {
      const company = await tx.bizCompany.findUnique({
        where: { id: bizSession.bizCompanyId },
      });

      if (company) {
        const companyData = (company.data as Record<string, unknown>) || {};
        const isFirstCompanyEvent = !companyData[CompanyAttributes.FIRST_SEEN_AT];

        const updatedCompanyData = {
          ...companyData,
          [CompanyAttributes.LAST_SEEN_AT]: currentTime,
          ...(isFirstCompanyEvent && { [CompanyAttributes.FIRST_SEEN_AT]: currentTime }),
        };

        await tx.bizCompany.update({
          where: { id: company.id },
          data: { data: updatedCompanyData },
        });
      }
    }
  }

  /**
   * Track an event
   * @param data - The data to track an event
   * @returns The tracked event
   */
  async trackEvent(environment: Environment, data: TrackEventDto): Promise<BizEvent | false> {
    const { userId: externalUserId, eventName, sessionId, eventData } = data;
    const environmentId = environment.id;
    const projectId = environment.projectId;
    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    if (!bizUser) {
      return false;
    }
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: {
        content: { include: { contentOnEnvironments: true } },
        bizEvent: { include: { event: true } },
        version: true,
      },
    });
    if (!bizSession || bizSession.state === 1) {
      return false;
    }
    const event = await this.prisma.event.findFirst({
      where: { codeName: eventName, projectId },
    });
    if (!event) {
      return false;
    }
    const events = await this.getFilterdEventData(event.id, eventData);
    if (!events) {
      return false;
    }

    const contentId = bizSession.contentId;
    const versionId = bizSession.versionId;

    const progress =
      events?.flow_step_progress !== undefined
        ? getEventProgress(eventName, events.flow_step_progress)
        : undefined;
    const state = getEventState(eventName);

    const result = await this.prisma.$transaction(async (tx) => {
      // Re-fetch the session with latest events inside the transaction and lock the row
      const latestBizSession = await tx.bizSession.findUnique({
        where: { id: sessionId },
        include: {
          bizEvent: { include: { event: true } },
        },
      });

      if (!latestBizSession || latestBizSession.state === 1) {
        return false;
      }

      // Validate event inside the transaction with latest data
      if (!isValidEvent(eventName, latestBizSession, events)) {
        return false;
      }

      // Update seen attributes for user and company
      await this.updateSeenAttributes(tx, bizUser, bizSession);

      const insert = {
        bizUserId: bizUser.id,
        eventId: event.id,
        data: events,
        bizSessionId: bizSession.id,
      };
      const bizEvent = await tx.bizEvent.create({
        data: insert,
      });
      await tx.bizSession.update({
        where: { id: bizSession.id },
        data: {
          ...(progress !== undefined && { progress }),
          state,
        },
      });
      if (eventName === BizEvents.QUESTION_ANSWERED) {
        const answer: any = {
          bizEventId: bizEvent.id,
          contentId,
          cvid: events[EventAttributes.QUESTION_CVID],
          versionId,
          bizUserId: bizUser.id,
          bizSessionId: bizSession.id,
          environmentId,
        };
        if (events[EventAttributes.NUMBER_ANSWER]) {
          answer.numberAnswer = events[EventAttributes.NUMBER_ANSWER];
        }
        if (events[EventAttributes.TEXT_ANSWER]) {
          answer.textAnswer = events[EventAttributes.TEXT_ANSWER];
        }
        if (events[EventAttributes.LIST_ANSWER]) {
          answer.listAnswer = events[EventAttributes.LIST_ANSWER];
        }
        await tx.bizAnswer.create({
          data: answer,
        });
      }

      return bizEvent;
    });

    const trackEventData: TrackEventData = {
      eventName,
      bizSessionId: bizSession.id,
      userId: String(externalUserId),
      environmentId,
      projectId,
      eventProperties: {
        ...events,
      },
      userProperties: bizUser.data as Record<string, any>,
    };
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

    // this.integrationService.trackEvent(trackEventData);

    return result;
  }
}
