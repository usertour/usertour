import { BizEvents, EventAttributes } from '@/common/consts/attribute';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { ContentType } from '@/contents/models/content.model';
import { User } from '@/users/models/user.model';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable } from '@nestjs/common';
import { Environment, Event } from '@prisma/client';
import { addDays, isBefore, lightFormat } from 'date-fns';
import { PrismaService } from 'nestjs-prisma';
import { AnalyticsOrder } from './dto/analytics-order.input';
import { AnalyticsQuery } from './dto/analytics-query.input';

type AnalyticsConditions = {
  contentId: string;
  eventId: string;
  startDateStr: string;
  endDateStr: string;
  isDistinct: boolean;
  stepIndex?: number;
};

type ItemAnalyticsConditions = AnalyticsConditions & {
  key: string;
  value: string;
};

const EVENT_TYPE_MAPPING = {
  [ContentType.FLOW]: {
    start: BizEvents.FLOW_STARTED,
    complete: BizEvents.FLOW_COMPLETED,
  },
  [ContentType.LAUNCHER]: {
    start: BizEvents.LAUNCHER_SEEN,
    complete: BizEvents.LAUNCHER_ACTIVATED,
  },
  [ContentType.CHECKLIST]: {
    start: BizEvents.CHECKLIST_SEEN,
    complete: BizEvents.CHECKLIST_COMPLETED,
  },
};

const EVENTS = [
  BizEvents.FLOW_STARTED,
  BizEvents.FLOW_STEP_SEEN,
  BizEvents.FLOW_COMPLETED,
  BizEvents.LAUNCHER_SEEN,
  BizEvents.LAUNCHER_ACTIVATED,
  BizEvents.CHECKLIST_SEEN,
  BizEvents.CHECKLIST_COMPLETED,
];

export interface ChecklistData {
  buttonText: string;
  initialDisplay: any;
  completionOrder: any;
  preventDismissChecklist: boolean;
  items: ChecklistItemType[];
  content: any;
}

export interface ChecklistItemType {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  isVisible?: boolean;
  clickedActions: any;
  completeConditions: any;
  onlyShowTask: boolean;
  onlyShowTaskConditions: any;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async queryContentAnalytics(
    contentId: string,
    startDate: string,
    endDate: string,
    timezone: string,
    user: User,
  ) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });
    const environment = await this.prisma.environment.findUnique({
      where: { id: content.environmentId },
    });
    if (!content || !this.hasPermission(user, environment)) {
      return;
    }
    const projectId = environment.projectId;
    const startDateStr = startDate;
    const endDateStr = endDate;
    const events = await this.prisma.event.findMany({
      where: {
        projectId,
        codeName: {
          in: EVENTS,
        },
      },
    });

    const startEventFilter = (ev: Event) => ev.codeName === EVENT_TYPE_MAPPING[content.type].start;

    const completeEventFilter = (ev: Event) =>
      ev.codeName === EVENT_TYPE_MAPPING[content.type].complete;

    const stepSeenEventFilter = (ev: Event) => ev.codeName === BizEvents.FLOW_STEP_SEEN;

    const startEvent = events.find(startEventFilter);
    const completeEvent = events.find(completeEventFilter);
    const stepSeenEvent = events.find(stepSeenEventFilter);

    if (!startEvent || !completeEvent || !stepSeenEvent) {
      return false;
    }
    const condition = {
      contentId,
      eventId: startEvent.id,
      startDateStr,
      endDateStr,
      isDistinct: true,
    };
    const uniqueViews = await this.aggregationByEvent({ ...condition });
    const totalViews = await this.aggregationByEvent({
      ...condition,
      isDistinct: false,
    });
    const uniqueCompletions = await this.aggregationByEvent({
      ...condition,
      eventId: completeEvent.id,
    });
    const totalCompletions = await this.aggregationByEvent({
      ...condition,
      eventId: completeEvent.id,
      isDistinct: false,
    });
    const viewsByStep = await this.aggregationStepsByContent(
      condition,
      stepSeenEvent,
      completeEvent,
    );
    const viewsByTask = await this.aggregationTasksByContent(condition, projectId);
    const viewsByDay = await this.aggregationViewsByDay(
      { ...condition },
      timezone,
      startEvent,
      completeEvent,
    );

    const data = {
      uniqueViews,
      totalViews,
      uniqueCompletions,
      totalCompletions,
      viewsByDay,
      viewsByStep,
      viewsByTask,
    };

    console.log(data);

    return data;
  }

  async aggregationViewsByDay(
    condition: AnalyticsConditions,
    timezone: string,
    startEvent: Event,
    completeEvent: Event,
  ) {
    const { startDateStr, endDateStr } = condition;
    const uniqueViewsByDay = await this.aggregationByDay(
      { ...condition, eventId: startEvent.id },
      timezone,
    );
    const totalViewsByDay = await this.aggregationByDay(
      { ...condition, eventId: startEvent.id, isDistinct: false },
      timezone,
    );
    const uniqueCompletionByDay = await this.aggregationByDay(
      { ...condition, eventId: completeEvent.id },
      timezone,
    );
    const totalCompletionByDay = await this.aggregationByDay(
      { ...condition, eventId: completeEvent.id, isDistinct: false },
      timezone,
    );
    const data = [];

    if (isBefore(endDateStr, startDateStr)) {
      return false;
    }

    let startDate = new Date(startDateStr);
    const endDate = addDays(endDateStr, 1);

    while (isBefore(startDate, endDate)) {
      const dd = lightFormat(startDate, 'yyyy-MM-dd');
      const uniqueView = uniqueViewsByDay.find(
        (views) => lightFormat(views.day, 'yyyy-MM-dd') === dd,
      );
      const totalView = totalViewsByDay.find(
        (views) => lightFormat(views.day, 'yyyy-MM-dd') === dd,
      );
      const uniqueCompletion = uniqueCompletionByDay.find(
        (views) => lightFormat(views.day, 'yyyy-MM-dd') === dd,
      );
      const totalCompletion = totalCompletionByDay.find(
        (views) => lightFormat(views.day, 'yyyy-MM-dd') === dd,
      );
      data.push({
        date: startDate,
        uniqueViews: uniqueView ? uniqueView.count : 0,
        totalViews: totalView ? totalView.count : 0,
        uniqueCompletions: uniqueCompletion ? uniqueCompletion.count : 0,
        totalCompletions: totalCompletion ? totalCompletion.count : 0,
      });
      startDate = addDays(startDate, 1);
    }

    console.log(data);

    return data;
  }

  async aggregationStepsByContent(
    condition: AnalyticsConditions,
    startEvent: Event,
    completeEvent: Event,
  ) {
    const { contentId } = condition;
    const content = await this.prisma.content.findFirst({
      where: { id: contentId },
    });
    if (
      !content ||
      content.type === ContentType.CHECKLIST ||
      content.type === ContentType.LAUNCHER
    ) {
      return false;
    }
    const versionId = content.published ? content.publishedVersionId : content.editedVersionId;
    const version = await this.prisma.version.findFirst({
      where: { id: versionId },
      include: { steps: true },
    });
    if (!version || !version.steps || version.steps.length === 0) {
      return false;
    }
    const maxStepIndex = version.steps.length;

    const ret = [];
    let totalUniqueViews: number;
    for (let index = 0; index < maxStepIndex; index++) {
      const stepInfo = version.steps[index];
      const stepCondition = {
        ...condition,
        stepIndex: index,
        eventId: startEvent.id,
      };
      const uniqueViews = await this.aggregationByStep(stepCondition);
      const totalViews = await this.aggregationByStep({
        ...stepCondition,
        isDistinct: false,
      });
      const uniqueCompletions = await this.aggregationByStep({
        ...stepCondition,
        eventId: completeEvent.id,
      });
      const totalCompletions = await this.aggregationByStep({
        ...stepCondition,
        eventId: completeEvent.id,
        isDistinct: false,
      });
      if (totalUniqueViews === undefined) {
        totalUniqueViews = uniqueViews;
      }
      ret.push({
        name: stepInfo.name,
        stepIndex: index,
        analytics: {
          uniqueViews,
          totalViews,
          uniqueCompletions,
          totalCompletions,
        },
      });
    }
    return ret;
  }

  async aggregationTasksByContent(condition: AnalyticsConditions, projectId: string) {
    const { contentId } = condition;
    const content = await this.prisma.content.findFirst({
      where: { id: contentId },
    });
    if (!content || content.type !== ContentType.CHECKLIST) {
      return false;
    }
    const versionId = content.published ? content.publishedVersionId : content.editedVersionId;
    const version = await this.prisma.version.findFirst({
      where: { id: versionId },
      include: { steps: true },
    });
    if (!version || !version.data) {
      return false;
    }

    const events = await this.prisma.event.findMany({
      where: {
        projectId,
        codeName: {
          in: [BizEvents.CHECKLIST_SEEN, BizEvents.CHECKLIST_TASK_COMPLETED],
        },
      },
    });
    const startEvent = events.find((ev) => ev.codeName === BizEvents.CHECKLIST_SEEN);
    const completeEvent = events.find((ev) => ev.codeName === BizEvents.CHECKLIST_TASK_COMPLETED);
    if (!startEvent || !completeEvent) {
      return false;
    }

    const checklistData = version.data as unknown as ChecklistData;
    const totalItem = checklistData.items.length;

    const ret = [];
    let totalUniqueViews: number;
    for (let index = 0; index < totalItem; index++) {
      const item = checklistData.items[index];
      const taskCondition = {
        ...condition,
        eventId: startEvent.id,
        key: 'checklist_id',
        value: content.id,
      };
      const uniqueViews = await this.aggregationByItem({
        ...taskCondition,
      });
      const totalViews = await this.aggregationByItem({
        ...taskCondition,
        isDistinct: false,
      });
      const uniqueCompletions = await this.aggregationByItem({
        ...taskCondition,
        eventId: completeEvent.id,
        key: 'checklist_task_id',
        value: item.id,
      });
      const totalCompletions = await this.aggregationByItem({
        ...taskCondition,
        eventId: completeEvent.id,
        key: 'checklist_task_id',
        value: item.id,
        isDistinct: false,
      });

      if (totalUniqueViews === undefined) {
        totalUniqueViews = uniqueViews;
      }
      ret.push({
        name: item.name,
        taskId: item.id,
        analytics: {
          uniqueViews,
          totalViews,
          uniqueCompletions,
          totalCompletions,
        },
      });
    }
    return ret;
  }

  async aggregationByEvent(condition: AnalyticsConditions) {
    const { contentId, eventId, startDateStr, endDateStr, isDistinct } = condition;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (!isDistinct) {
      const data = await this.prisma.$queryRaw`
      SELECT Count("BizEvent"."bizUserId") from "BizEvent" 
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
      `;
      return Number.parseInt(data[0].count.toString());
    }

    const data = await this.prisma.$queryRaw`
      SELECT Count(DISTINCT("BizEvent"."bizUserId")) from "BizEvent"
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
        `;
    return Number.parseInt(data[0].count.toString());
  }

  async aggregationByDay(condition: AnalyticsConditions, timezone: string) {
    const { contentId, eventId, startDateStr, endDateStr, isDistinct } = condition;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    let data: [{ day: string; count: number }];
    if (!isDistinct) {
      data = await this.prisma.$queryRaw`
        SELECT DATE_TRUNC( 'DAY', "BizEvent"."createdAt" AT TIME ZONE ${timezone} ) AS DAY,
          Count("BizEvent"."bizUserId") from "BizEvent" 
          left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
          "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId}
          AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
          GROUP BY DAY
        `;
    } else {
      data = await this.prisma.$queryRaw`
        SELECT DATE_TRUNC( 'DAY', "BizEvent"."createdAt" AT TIME ZONE ${timezone} ) AS DAY,
          Count(DISTINCT("BizEvent"."bizUserId")) from "BizEvent" 
          left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
          "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId}
          AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
          GROUP BY DAY
        `;
    }
    return data.map((dd) => ({ ...dd, count: Number(dd.count) }));
  }

  async aggregationByStep(condition: AnalyticsConditions) {
    const { contentId, eventId, startDateStr, endDateStr, isDistinct, stepIndex } = condition;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const stepIndexStr = String(stepIndex);

    if (!isDistinct) {
      const data = await this.prisma.$queryRaw`
      SELECT Count("BizEvent"."bizUserId") from "BizEvent" 
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
        AND "BizEvent"."data" ->> 'flow_step_number' = ${stepIndexStr}
      `;
      return Number.parseInt(data[0].count.toString());
    }

    const data = await this.prisma.$queryRaw`
      SELECT Count(DISTINCT("BizEvent"."bizUserId")) from "BizEvent"
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
        AND "BizEvent"."data" ->> 'flow_step_number' = ${stepIndexStr}
        `;
    return Number.parseInt(data[0].count.toString());
  }

  async aggregationByItem(condition: ItemAnalyticsConditions) {
    const { contentId, eventId, startDateStr, endDateStr, isDistinct, key, value } = condition;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (!isDistinct) {
      const data = await this.prisma.$queryRaw`
      SELECT Count("BizEvent"."bizUserId") from "BizEvent" 
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
        AND "BizEvent"."data" ->> ${key} = ${String(value)}
      `;
      return Number.parseInt(data[0].count.toString());
    }

    const data = await this.prisma.$queryRaw`
      SELECT Count(DISTINCT("BizEvent"."bizUserId")) from "BizEvent"
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
        AND "BizEvent"."data" ->> ${key} = ${String(value)}
        `;
    return Number.parseInt(data[0].count.toString());
  }

  async queryRecentSessions(
    query: AnalyticsQuery,
    pagination: PaginationArgs,
    orderBy: AnalyticsOrder,
    user: User,
  ) {
    const { first, last, before, after } = pagination;
    const { contentId, startDate, endDate } = query;
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    try {
      const content = await this.prisma.content.findUnique({
        where: { id: contentId },
      });
      if (!content) {
        return false;
      }
      const environment = await this.prisma.environment.findUnique({
        where: { id: content.environmentId },
      });
      if (!content || !this.hasPermission(user, environment)) {
        return;
      }
      const resp = await findManyCursorConnection(
        (args) =>
          this.prisma.bizSession.findMany({
            where: {
              contentId,
              createdAt: {
                gte: startDateObj,
                lte: endDateObj,
              },
              bizEvent: {
                some: {},
              },
            },
            include: { bizUser: true, bizEvent: true },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
            ...args,
          }),
        () =>
          this.prisma.bizSession.count({
            where: {
              contentId,
              createdAt: {
                gte: startDateObj,
                lte: endDateObj,
              },
              bizEvent: {
                some: {},
              },
            },
          }),
        { first, last, before, after },
      );
      return resp;
    } catch (_) {
      // console.log(error);
    }
  }

  async hasPermission(user: User, environment: Environment) {
    if (!environment) {
      return false;
    }
    const userOnProject = await this.prisma.userOnProject.findFirst({
      where: {
        userId: user.id,
        projectId: environment.projectId,
        role: { in: ['ADMIN', 'OWNER'] },
      },
    });
    if (!userOnProject) {
      return false;
    }
    return true;
  }

  async getSession(sessionId: string) {
    return await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { content: true },
    });
  }

  async querySessionDetail(sessionId: string) {
    return await this.prisma.bizSession.findUnique({
      where: { id: sessionId, deleted: false },
      include: {
        bizUser: true,
        bizEvent: { include: { event: true }, orderBy: { createdAt: 'desc' } },
        content: true,
        version: true,
      },
    });
  }

  async endSession(sessionId: string) {
    const endEvent = await this.prisma.event.findFirst({
      where: { codeName: BizEvents.FLOW_ENDED },
    });
    const seenEvent = await this.prisma.event.findFirst({
      where: { codeName: BizEvents.FLOW_STEP_SEEN },
    });
    const bizSession = await this.prisma.bizSession.findUnique({ where: { id: sessionId } });
    const seenBizEvent = await this.prisma.bizEvent.findFirst({
      where: { bizSessionId: sessionId, eventId: seenEvent.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!endEvent || !seenEvent || !bizSession) {
      return false;
    }

    const seenData = seenBizEvent?.data as any;
    const data: any = {
      [EventAttributes.FLOW_END_REASON]: 'admin_ended',
    };

    if (seenData?.flow_step_number) {
      data[EventAttributes.FLOW_STEP_NUMBER] = seenData.flow_step_number;
    }
    if (seenData?.flow_step_cvid) {
      data[EventAttributes.FLOW_STEP_CVID] = seenData.flow_step_cvid;
    }
    if (seenData?.flow_step_name) {
      data[EventAttributes.FLOW_STEP_NAME] = seenData.flow_step_name;
    }
    if (seenData?.flow_step_progress) {
      data[EventAttributes.FLOW_STEP_PROGRESS] = seenData?.flow_step_progress;
    }

    return await this.prisma.$transaction(async (tx) => {
      await tx.bizEvent.create({
        data: {
          bizSessionId: sessionId,
          eventId: endEvent.id,
          bizUserId: bizSession.bizUserId,
          data,
        },
      });
      await tx.bizSession.update({
        where: { id: sessionId },
        data: { state: 1 },
      });
      return true;
    });
  }

  async deleteSession(sessionId: string) {
    const session = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return false;
    }
    return await this.prisma.$transaction(async (tx) => {
      await tx.bizEvent.deleteMany({
        where: { bizSessionId: sessionId },
      });
      await tx.bizSession.delete({
        where: { id: sessionId },
      });
      return true;
    });
  }
}
