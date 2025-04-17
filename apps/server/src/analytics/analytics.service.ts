import { BizEvents, EventAttributes } from '@/common/consts/attribute';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { ContentType } from '@/contents/models/content.model';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable } from '@nestjs/common';
import { Event } from '@prisma/client';
import { addDays, isBefore, lightFormat, format, subDays, endOfDay, startOfDay } from 'date-fns';
import { PrismaService } from 'nestjs-prisma';
import { AnalyticsOrder } from './dto/analytics-order.input';
import { AnalyticsQuery } from './dto/analytics-query.input';
import { toZonedTime } from 'date-fns-tz';

import {
  aggregationQuestionTypes,
  ContentEditorElementType,
  extractQuestionData,
  GroupItem,
  numberQuestionTypes,
  QuestionElement,
} from '@/utils/content';
import { Prisma } from '@prisma/client';
import { UnknownError } from '@/common/errors/errors';

type AnalyticsConditions = {
  contentId: string;
  eventId: string;
  startDateStr: string;
  endDateStr: string;
  isDistinct: boolean;
  stepIndex?: number;
};

type RollWindowConfig = {
  nps: number;
  rate: number;
  scale: number;
};

type ItemAnalyticsConditions = AnalyticsConditions & {
  key: string;
  value: string;
};

const defaultRollWindowConfig = { nps: 365, rate: 365, scale: 365 };

const completeDistribution = (distribution: QuestionAnswerAnalytics[]) => {
  const fullDistribution: QuestionAnswerAnalytics[] = [];

  for (let score = 0; score <= 10; score++) {
    const existingItem = distribution.find((item) => Number(item.answer) === score);
    fullDistribution.push(
      existingItem || {
        answer: score,
        count: 0,
        percentage: 0,
      },
    );
  }

  return fullDistribution;
};

const getAggregationField = (question: QuestionElement) => {
  if (numberQuestionTypes.includes(question.type)) {
    return 'numberAnswer';
  }
  if (question.type === ContentEditorElementType.MULTIPLE_CHOICE) {
    return question.data.allowMultiple ? 'listAnswer' : 'textAnswer';
  }
  return 'textAnswer';
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

type QuestionAnswerAnalytics = {
  answer: string | number;
  count: number;
  percentage: number;
};

interface BaseMetricsByDay {
  day: Date;
  startDate: Date;
  endDate: Date;
  distribution: QuestionAnswerAnalytics[];
}

interface NPSMetricsByDay extends BaseMetricsByDay {
  metrics: {
    promoters: { count: number; percentage: number };
    passives: { count: number; percentage: number };
    detractors: { count: number; percentage: number };
    total: number;
    npsScore: number;
  };
}

interface RatingMetricsByDay extends BaseMetricsByDay {
  metrics: {
    average: number;
    total: number;
  };
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async queryContentAnalytics(
    contentId: string,
    startDate: string,
    endDate: string,
    timezone: string,
  ) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });
    const environment = await this.prisma.environment.findUnique({
      where: { id: content.environmentId },
    });
    if (!content) {
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

    return {
      uniqueViews,
      totalViews,
      uniqueCompletions,
      totalCompletions,
      viewsByDay,
      viewsByStep,
      viewsByTask,
    };
  }

  /**
   * Query analytics data for questions in content
   */
  async queryContentQuestionAnalytics(
    contentId: string,
    startDate: string,
    endDate: string,
    timezone: string,
  ) {
    const content = await this.getContentWithVersion(contentId);
    if (!content) {
      return;
    }

    const rollWindowConfig: RollWindowConfig =
      (content.config as any)?.rollWindowConfig ?? defaultRollWindowConfig;

    const version = content.publishedVersion || content.editedVersion;
    const startDateStr = startDate;
    const endDateStr = endDate;

    const ret = [];
    for (const step of version.steps) {
      const questionData = this.extractQuestionForAnalytics(step);
      if (!questionData) continue;
      let rollingWindow = 365;
      if (questionData.type === ContentEditorElementType.NPS) {
        rollingWindow = rollWindowConfig.nps;
      } else if (questionData.type === ContentEditorElementType.STAR_RATING) {
        rollingWindow = rollWindowConfig.rate;
      } else if (questionData.type === ContentEditorElementType.SCALE) {
        rollingWindow = rollWindowConfig.scale;
      }

      const response = await this.processQuestionAnalytics(
        questionData,
        contentId,
        startDateStr,
        endDateStr,
        rollingWindow,
        timezone,
      );
      ret.push(response);
    }

    return ret;
  }

  /**
   * Get content with its version data
   */
  private async getContentWithVersion(contentId: string) {
    return await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        publishedVersion: { include: { steps: true } },
        editedVersion: { include: { steps: true } },
      },
    });
  }

  /**
   * Extract question data from step if it's a valid question for analytics
   */
  private extractQuestionForAnalytics(step: any) {
    const questionData = extractQuestionData(step.data as unknown as GroupItem[]);
    if (questionData.length === 0) return null;

    const question = questionData[0];
    if (!aggregationQuestionTypes.includes(question.type)) return null;

    return question;
  }

  /**
   * Process analytics data for a single question
   */
  private async processQuestionAnalytics(
    question: QuestionElement,
    contentId: string,
    startDateStr: string,
    endDateStr: string,
    rollingWindow: number,
    timezone: string,
  ) {
    const questionCvid = question.data.cvid;
    const field = getAggregationField(question);

    // Get basic answer statistics
    const answer = await this.aggregationQuestionAnswer(
      contentId,
      questionCvid,
      startDateStr,
      endDateStr,
      field,
    );
    const totalResponse = answer.reduce((sum, item) => sum + item.count, 0);

    const response: any = {
      totalResponse,
      question,
      answer,
    };

    if (!numberQuestionTypes.includes(question.type)) return response;

    if (question.type === ContentEditorElementType.NPS) {
      const npsAnalysisByDay = await this.aggregationQuestionMetricsByDay(
        contentId,
        questionCvid,
        startDateStr,
        endDateStr,
        rollingWindow,
        'nps',
        timezone,
      );

      response.npsAnalysisByDay = npsAnalysisByDay;
    } else {
      const averageByDay = await this.aggregationQuestionMetricsByDay(
        contentId,
        questionCvid,
        startDateStr,
        endDateStr,
        rollingWindow,
        'rating',
        timezone,
      );
      response.averageByDay = averageByDay;
    }

    return response;
  }

  async aggregationViewsByDay(
    condition: AnalyticsConditions,
    timezone: string,
    startEvent: Event,
    completeEvent: Event,
  ) {
    const { startDateStr, endDateStr } = condition;

    // Convert string dates to Date objects with timezone consideration
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Validate date range
    if (isBefore(endDate, startDate)) {
      return false;
    }

    // Get aggregated statistics
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
    let currentDate = startDate;
    const finalEndDate = endDate;

    // Iterate through each day in the date range
    while (isBefore(currentDate, finalEndDate)) {
      // Format date considering timezone
      const dd = format(toZonedTime(currentDate, timezone), 'yyyy-MM-dd');

      // Build daily statistics object with default value 0 for missing data
      data.push({
        date: currentDate,
        uniqueViews:
          uniqueViewsByDay.find((views) => lightFormat(views.day, 'yyyy-MM-dd') === dd)?.count || 0,
        totalViews:
          totalViewsByDay.find((views) => lightFormat(views.day, 'yyyy-MM-dd') === dd)?.count || 0,
        uniqueCompletions:
          uniqueCompletionByDay.find((views) => lightFormat(views.day, 'yyyy-MM-dd') === dd)
            ?.count || 0,
        totalCompletions:
          totalCompletionByDay.find((views) => lightFormat(views.day, 'yyyy-MM-dd') === dd)
            ?.count || 0,
      });

      // Move to next day
      currentDate = addDays(currentDate, 1);
    }

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

  async aggregationQuestionSession(
    contentId: string,
    questionCvid: string,
    startDateStr: string,
    endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const data = await this.prisma.$queryRaw`
      SELECT Count(DISTINCT("BizAnswer"."bizSessionId")) from "BizAnswer"
        WHERE
        "BizAnswer"."contentId" = ${contentId} AND "BizAnswer"."cvid" = ${questionCvid}
        AND "BizAnswer"."createdAt" >= ${startDate} AND "BizAnswer"."createdAt" <= ${endDate}
        `;
    return Number.parseInt(data[0].count.toString());
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
            include: { bizUser: true, bizEvent: { include: { event: true } } },
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

  async listSessionsDetail(
    query: AnalyticsQuery,
    pagination: PaginationArgs,
    orderBy: AnalyticsOrder,
  ) {
    try {
      const sessions = await this.queryRecentSessions(query, pagination, orderBy);
      if (!sessions) {
        throw new UnknownError('Failed to fetch sessions');
      }

      // Fetch all session details in a single query
      const sessionIds = sessions.edges.map((edge) => edge.node.id);
      const sessionDetails = await this.querySessionsDetail(sessionIds);

      // Create a map of session ID to session details for efficient lookup
      const sessionDetailMap = new Map(sessionDetails.map((detail) => [detail.id, detail]));

      // Build the response with enhanced session details
      return {
        edges: sessions.edges.map((edge) => ({
          node: sessionDetailMap.get(edge.node.id) || edge.node,
          cursor: edge.cursor,
        })),
        pageInfo: sessions.pageInfo,
        totalCount: sessions.totalCount,
      };
    } catch (error) {
      if (error instanceof UnknownError) {
        throw error;
      }
      throw new UnknownError('Failed to fetch session details');
    }
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
        bizUser: { include: { bizCompany: true } },
        bizEvent: { include: { event: true }, orderBy: { createdAt: 'desc' } },
        content: true,
        version: true,
      },
    });
  }

  async querySessionsDetail(sessionIds: string[]) {
    return await this.prisma.bizSession.findMany({
      where: {
        id: { in: sessionIds },
        deleted: false,
      },
      include: {
        bizUser: { include: { bizUsersOnCompany: { include: { bizCompany: true } } } },
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
      await tx.bizAnswer.deleteMany({
        where: { bizSessionId: sessionId },
      });
      await tx.bizEvent.deleteMany({
        where: { bizSessionId: sessionId },
      });
      await tx.bizSession.delete({
        where: { id: sessionId },
      });
      return true;
    });
  }

  async aggregationQuestionAnswer(
    contentId: string,
    questionCvid: string,
    startDateStr: string,
    endDateStr: string,
    field: 'numberAnswer' | 'textAnswer' | 'listAnswer',
  ): Promise<QuestionAnswerAnalytics[]> {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (field === 'listAnswer') {
      const data = await this.prisma.$queryRaw<QuestionAnswerAnalytics[]>`
        SELECT unnest("listAnswer") as answer, count(*) as count 
        FROM "BizAnswer"
        WHERE
          "BizAnswer"."contentId" = ${contentId} 
          AND "BizAnswer"."cvid" = ${questionCvid}
          AND "BizAnswer"."createdAt" >= ${startDate} 
          AND "BizAnswer"."createdAt" <= ${endDate}
          AND "BizAnswer"."listAnswer" IS NOT NULL
          AND array_length("listAnswer", 1) > 0
        GROUP BY unnest("listAnswer")
        ORDER BY count DESC
      `;
      const total = data.reduce((sum, item) => sum + Number(item.count), 0);
      return data.map((item) => ({
        ...item,
        count: Number(item.count),
        percentage: total > 0 ? Math.round((Number(item.count) / total) * 100) : 0,
      }));
    }

    const data = await this.prisma.$queryRaw<QuestionAnswerAnalytics[]>`
      SELECT "BizAnswer".${Prisma.raw(`"${field}"`)} as answer, count(*) as count 
      FROM "BizAnswer"
      WHERE
        "BizAnswer"."contentId" = ${contentId} 
        AND "BizAnswer"."cvid" = ${questionCvid}
        AND "BizAnswer"."createdAt" >= ${startDate} 
        AND "BizAnswer"."createdAt" <= ${endDate}
        AND "BizAnswer".${Prisma.raw(`"${field}"`)} IS NOT NULL
      GROUP BY "BizAnswer".${Prisma.raw(`"${field}"`)}
      ORDER BY count DESC
    `;
    const total = data.reduce((sum, item) => sum + Number(item.count), 0);
    return data.map((item) => ({
      ...item,
      count: Number(item.count),
      percentage: total > 0 ? Math.round((Number(item.count) / total) * 100) : 0,
    }));
  }

  /**
   * Calculate daily metrics for questions with rolling window
   * @param type 'nps' | 'rating' - Type of question to calculate metrics for
   * @returns Array of daily analysis with metrics and distribution
   */
  private async aggregationQuestionMetricsByDay(
    contentId: string,
    questionCvid: string,
    startDateStr: string,
    endDateStr: string,
    rollingWindow: number,
    type: 'nps' | 'rating',
    timezone: string,
  ): Promise<Array<NPSMetricsByDay | RatingMetricsByDay>> {
    const data: Array<NPSMetricsByDay | RatingMetricsByDay> = [];
    const startDate = startOfDay(toZonedTime(new Date(startDateStr), timezone));
    const endDate = endOfDay(toZonedTime(new Date(endDateStr), timezone));
    const isNps = type === 'nps';

    let currentDate = startDate;
    while (isBefore(currentDate, endDate)) {
      // Calculate start date for rolling window

      const windowStartDate = startOfDay(
        toZonedTime(subDays(currentDate, rollingWindow - 1), timezone),
      );
      const windowEndDate = endOfDay(toZonedTime(currentDate, timezone));

      // Get answers within the rolling window period
      const distribution = await this.aggregationQuestionAnswer(
        contentId,
        questionCvid,
        windowStartDate.toISOString(),
        windowEndDate.toISOString(),
        'numberAnswer',
      );

      // Calculate metrics based on type
      const metrics = isNps
        ? this.calculateNPSMetrics(distribution)
        : this.calculateRatingMetrics(distribution);

      const baseData: BaseMetricsByDay = {
        day: currentDate,
        startDate: windowStartDate,
        endDate: windowEndDate,
        distribution: isNps ? completeDistribution(distribution) : distribution,
      };

      if (isNps) {
        data.push({
          ...baseData,
          metrics,
        } as NPSMetricsByDay);
      } else {
        data.push({
          ...baseData,
          metrics,
        } as RatingMetricsByDay);
      }

      currentDate = addDays(currentDate, 1);
    }

    return data;
  }

  /**
   * Calculate rating metrics from answer data
   */
  private calculateRatingMetrics(distribution: QuestionAnswerAnalytics[]) {
    const total = distribution.reduce((sum, item) => sum + item.count, 0);
    const weightedSum = distribution.reduce(
      (sum, item) => sum + Number(item.answer) * item.count,
      0,
    );
    const average = total > 0 ? Number((weightedSum / total).toFixed(2)) : 0;

    return {
      average,
      total,
    };
  }

  /**
   * Calculate NPS metrics from answer data
   */
  private calculateNPSMetrics(answer: QuestionAnswerAnalytics[]) {
    const promoters = answer
      .filter((item) => Number(item.answer) >= 9)
      .reduce((sum, item) => sum + item.count, 0);
    const passives = answer
      .filter((item) => Number(item.answer) >= 7 && Number(item.answer) <= 8)
      .reduce((sum, item) => sum + item.count, 0);
    const detractors = answer
      .filter((item) => Number(item.answer) <= 6)
      .reduce((sum, item) => sum + item.count, 0);

    const total = promoters + passives + detractors;
    const promotersPercentage = Math.round((promoters / total) * 100);
    const passivesPercentage = Math.round((passives / total) * 100);
    const detractorsPercentage = Math.round((detractors / total) * 100);
    const npsScore = promotersPercentage - detractorsPercentage;

    return {
      promoters: {
        count: promoters,
        percentage: promotersPercentage,
      },
      passives: {
        count: passives,
        percentage: passivesPercentage,
      },
      detractors: {
        count: detractors,
        percentage: detractorsPercentage,
      },
      total,
      npsScore,
    };
  }
}
