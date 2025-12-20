import { BizEvents, EventAttributes, StepSettings } from '@usertour/types';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { ContentType } from '@/content/models/content.model';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable } from '@nestjs/common';
import { BizSession, Event } from '@prisma/client';
import { addDays, isBefore, lightFormat, format, subDays, endOfDay, startOfDay } from 'date-fns';
import { PrismaService } from 'nestjs-prisma';
import { AnalyticsOrder } from './dto/analytics-order.input';
import { AnalyticsQuery } from './dto/analytics-query.input';
import { toZonedTime } from 'date-fns-tz';
import { ContentEditorElementType, ContentEditorQuestionElement } from '@usertour/types';

import { extractStepQuestion, numberQuestionTypes } from '@/utils/content-question';
import { Prisma } from '@prisma/client';
import { UnknownError } from '@/common/errors/errors';
import { PaginationConnection } from '@/common/openapi/pagination';
import { defaultEvents } from '@/common/initialization/initialization';

type AnalyticsConditions = {
  environmentId: string;
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

const getAggregationField = (question: ContentEditorQuestionElement) => {
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
    start: BizEvents.CHECKLIST_STARTED,
    complete: BizEvents.CHECKLIST_COMPLETED,
  },
};

const EVENTS = [
  BizEvents.FLOW_STARTED,
  BizEvents.FLOW_STEP_SEEN,
  BizEvents.FLOW_COMPLETED,
  BizEvents.LAUNCHER_SEEN,
  BizEvents.LAUNCHER_ACTIVATED,
  BizEvents.CHECKLIST_STARTED,
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
    environmentId: string,
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
      environmentId,
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
    // For LAUNCHER_ACTIVATED, only count the first occurrence per user
    const isLauncherActivated = completeEvent.codeName === BizEvents.LAUNCHER_ACTIVATED;
    const uniqueCompletions = isLauncherActivated
      ? await this.aggregationFirstEvent({ ...condition, eventId: completeEvent.id })
      : await this.aggregationByEvent({ ...condition, eventId: completeEvent.id });

    const totalCompletions = isLauncherActivated
      ? await this.aggregationFirstEvent({ ...condition, eventId: completeEvent.id })
      : await this.aggregationByEvent({
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
    environmentId: string,
    contentId: string,
    startDate: string,
    endDate: string,
    timezone: string,
  ) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        contentOnEnvironments: true,
      },
    });
    if (!content) {
      return false;
    }

    const publishedVersionId =
      content.contentOnEnvironments.find((item) => item.environmentId === environmentId)
        ?.publishedVersionId ||
      content.publishedVersionId ||
      content.editedVersionId;

    const version = await this.prisma.version.findUnique({
      where: { id: publishedVersionId },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });

    if (!version) {
      return false;
    }

    const rollWindowConfig: RollWindowConfig =
      (content.config as any)?.rollWindowConfig ?? defaultRollWindowConfig;

    // const version = content.publishedVersion || content.editedVersion;
    const startDateStr = startDate;
    const endDateStr = endDate;

    const ret = [];
    for (const step of version.steps) {
      const questionData = extractStepQuestion(step);
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
        environmentId,
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
        publishedVersion: { include: { steps: { orderBy: { sequence: 'asc' } } } },
        editedVersion: { include: { steps: { orderBy: { sequence: 'asc' } } } },
      },
    });
  }

  /**
   * Process analytics data for a single question
   */
  private async processQuestionAnalytics(
    environmentId: string,
    question: ContentEditorQuestionElement,
    contentId: string,
    startDateStr: string,
    endDateStr: string,
    rollingWindow: number,
    timezone: string,
  ) {
    const questionCvid = question.data.cvid;
    const field = getAggregationField(question);

    // Get basic answer statistics
    let answer: QuestionAnswerAnalytics[];
    let totalResponse: number;

    if (field === 'listAnswer') {
      const result = await this.aggregationListAnswer(
        environmentId,
        contentId,
        questionCvid,
        startDateStr,
        endDateStr,
      );
      answer = result.distribution;
      totalResponse = result.totalResponse;
    } else {
      answer = await this.aggregationQuestionAnswer(
        environmentId,
        contentId,
        questionCvid,
        startDateStr,
        endDateStr,
        field,
      );
      totalResponse = answer.reduce((sum, item) => sum + item.count, 0);
    }

    const response: any = {
      totalResponse,
      question,
      answer,
    };

    if (!numberQuestionTypes.includes(question.type)) return response;

    if (question.type === ContentEditorElementType.NPS) {
      const npsAnalysisByDay = await this.aggregationQuestionMetricsByDay(
        environmentId,
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
        environmentId,
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
    // For LAUNCHER_ACTIVATED, only count the first occurrence per user
    const isLauncherActivated = completeEvent.codeName === BizEvents.LAUNCHER_ACTIVATED;
    const uniqueCompletionByDay = isLauncherActivated
      ? await this.aggregationFirstEventByDay({ ...condition, eventId: completeEvent.id }, timezone)
      : await this.aggregationByDay({ ...condition, eventId: completeEvent.id }, timezone);
    const totalCompletionByDay = isLauncherActivated
      ? await this.aggregationFirstEventByDay({ ...condition, eventId: completeEvent.id }, timezone)
      : await this.aggregationByDay(
          {
            ...condition,
            eventId: completeEvent.id,
            isDistinct: false,
          },
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
      include: { steps: { orderBy: { sequence: 'asc' } } },
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
      const explicitCompletionStep =
        (stepInfo.setting as StepSettings)?.explicitCompletionStep ?? false;

      ret.push({
        name: stepInfo.name,
        stepIndex: index,
        explicitCompletionStep,
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
      include: { steps: { orderBy: { sequence: 'asc' } } },
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
    const { contentId, eventId, startDateStr, endDateStr, isDistinct, environmentId } = condition;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (!isDistinct) {
      const data = await this.prisma.$queryRaw`
      SELECT Count("BizEvent"."bizUserId") from "BizEvent" 
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId} AND "BizSession"."environmentId" = ${environmentId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
      `;
      return Number.parseInt(data[0].count.toString());
    }

    const data = await this.prisma.$queryRaw`
      SELECT Count(DISTINCT("BizEvent"."bizUserId")) from "BizEvent"
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId} AND "BizSession"."environmentId" = ${environmentId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
        `;
    return Number.parseInt(data[0].count.toString());
  }

  async aggregationByDay(condition: AnalyticsConditions, timezone: string) {
    const { contentId, eventId, startDateStr, endDateStr, isDistinct, environmentId } = condition;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    let data: [{ day: string; count: number }];
    if (!isDistinct) {
      data = await this.prisma.$queryRaw`
        SELECT DATE_TRUNC( 'DAY', "BizEvent"."createdAt" AT TIME ZONE ${timezone} ) AS DAY,
          Count("BizEvent"."bizUserId") from "BizEvent" 
          left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
          "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId} AND "BizSession"."environmentId" = ${environmentId}
          AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
          GROUP BY DAY
        `;
    } else {
      data = await this.prisma.$queryRaw`
        SELECT DATE_TRUNC( 'DAY', "BizEvent"."createdAt" AT TIME ZONE ${timezone} ) AS DAY,
          Count(DISTINCT("BizEvent"."bizUserId")) from "BizEvent" 
          left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
          "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId} AND "BizSession"."environmentId" = ${environmentId}
          AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
          GROUP BY DAY
        `;
    }
    return data.map((dd) => ({ ...dd, count: Number(dd.count) }));
  }

  /**
   * Aggregate events by day, counting only the first occurrence per user across all history
   * This is used for LAUNCHER_ACTIVATED events where multiple activations should only count as one
   * The first event is determined from all historical events, then filtered by the query time range
   * Only first events that occurred within the query time range are included
   */
  async aggregationFirstEventByDay(condition: AnalyticsConditions, timezone: string) {
    const { contentId, eventId, startDateStr, endDateStr, environmentId } = condition;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Optimized from original: Use DISTINCT ON instead of ROW_NUMBER() for better performance
    // First get all users' first events from all history, then filter by time range
    const data = (await this.prisma.$queryRaw`
      WITH first_events AS (
        SELECT DISTINCT ON (be."bizUserId")
          be."bizUserId",
          be."createdAt",
          DATE_TRUNC('DAY', be."createdAt" AT TIME ZONE ${timezone}) AS day
        FROM "BizEvent" be
        LEFT JOIN "BizSession" bs ON be."bizSessionId" = bs.id
        WHERE
          bs."contentId" = ${contentId} 
          AND be."eventId" = ${eventId} 
          AND bs."environmentId" = ${environmentId}
        ORDER BY be."bizUserId", be."createdAt" ASC
      )
      SELECT day, COUNT(*) as count
      FROM first_events
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY day
      ORDER BY day
    `) as Array<{ day: Date | string; count: bigint }>;

    return data.map((dd) => ({
      day: dd.day instanceof Date ? dd.day.toISOString() : String(dd.day),
      count: Number(dd.count),
    }));
  }

  /**
   * Aggregate first event per user, counting only first events that occurred within the query time range
   * This is used for LAUNCHER_ACTIVATED events where multiple activations should only count as one
   * The first event is determined from all historical events, then filtered by the query time range
   * Returns total count (not grouped by day)
   */
  async aggregationFirstEvent(condition: AnalyticsConditions) {
    const { contentId, eventId, startDateStr, endDateStr, environmentId } = condition;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // First get all users' first events from all history, then filter by time range
    const data = (await this.prisma.$queryRaw`
      WITH first_events AS (
        SELECT DISTINCT ON (be."bizUserId")
          be."bizUserId",
          be."createdAt"
        FROM "BizEvent" be
        LEFT JOIN "BizSession" bs ON be."bizSessionId" = bs.id
        WHERE
          bs."contentId" = ${contentId} 
          AND be."eventId" = ${eventId} 
          AND bs."environmentId" = ${environmentId}
        ORDER BY be."bizUserId", be."createdAt" ASC
      )
      SELECT COUNT(*) as count
      FROM first_events
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
    `) as Array<{ count: bigint }>;

    return Number.parseInt(data[0].count.toString());
  }

  async aggregationByStep(condition: AnalyticsConditions) {
    const { contentId, eventId, startDateStr, endDateStr, isDistinct, stepIndex, environmentId } =
      condition;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const stepIndexStr = String(stepIndex);

    if (!isDistinct) {
      const data = await this.prisma.$queryRaw`
      SELECT Count("BizEvent"."bizUserId") from "BizEvent" 
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId} AND "BizSession"."environmentId" = ${environmentId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
        AND "BizEvent"."data" ->> 'flow_step_number' = ${stepIndexStr}
      `;
      return Number.parseInt(data[0].count.toString());
    }

    const data = await this.prisma.$queryRaw`
      SELECT Count(DISTINCT("BizEvent"."bizUserId")) from "BizEvent"
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId} AND "BizSession"."environmentId" = ${environmentId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
        AND "BizEvent"."data" ->> 'flow_step_number' = ${stepIndexStr}
        `;
    return Number.parseInt(data[0].count.toString());
  }

  async aggregationByItem(condition: ItemAnalyticsConditions) {
    const { contentId, eventId, startDateStr, endDateStr, isDistinct, key, value, environmentId } =
      condition;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (!isDistinct) {
      const data = await this.prisma.$queryRaw`
      SELECT Count("BizEvent"."bizUserId") from "BizEvent" 
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId} AND "BizSession"."environmentId" = ${environmentId}
        AND "BizEvent"."createdAt" >= ${startDate} AND "BizEvent"."createdAt" <= ${endDate}
        AND "BizEvent"."data" ->> ${key} = ${String(value)}
      `;
      return Number.parseInt(data[0].count.toString());
    }

    const data = await this.prisma.$queryRaw`
      SELECT Count(DISTINCT("BizEvent"."bizUserId")) from "BizEvent"
        left join "BizSession" on "BizEvent"."bizSessionId" = "BizSession".id WHERE
        "BizSession"."contentId" = ${contentId} AND "BizEvent"."eventId" = ${eventId} AND "BizSession"."environmentId" = ${environmentId}
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
    const { contentId, startDate, endDate, environmentId } = query;
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
              environmentId,
              bizEvent: {
                some: {},
              },
            },
            include: {
              bizUser: true,
              bizEvent: { include: { event: true } },
              version: { include: { steps: { orderBy: { sequence: 'asc' } } } },
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
            ...args,
          }),
        () =>
          this.prisma.bizSession.count({
            where: {
              contentId,
              environmentId,
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
        bizEvent: { include: { event: true }, orderBy: { id: 'desc' } },
        content: true,
        version: { include: { steps: { orderBy: { sequence: 'asc' } } } },
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
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { content: true },
    });

    if (!bizSession || bizSession.state === 1) {
      return false;
    }
    if (bizSession.content.type === ContentType.FLOW) {
      return await this.endFlowSession(bizSession);
    }
    if (bizSession.content.type === ContentType.CHECKLIST) {
      return await this.endChecklistSession(bizSession);
    }
    if (bizSession.content.type === ContentType.LAUNCHER) {
      return await this.endLauncherSession(bizSession);
    }
    return false;
  }

  /**
   * End a flow session
   * @param session - The session to end
   * @returns True if the session was ended successfully, false otherwise
   */
  async endFlowSession(bizSession: BizSession) {
    const sessionId = bizSession.id;
    const endEvent = await this.prisma.event.findFirst({
      where: { codeName: BizEvents.FLOW_ENDED },
    });
    const seenEvent = await this.prisma.event.findFirst({
      where: { codeName: BizEvents.FLOW_STEP_SEEN },
    });
    const seenBizEvent = await this.prisma.bizEvent.findFirst({
      where: { bizSessionId: sessionId, eventId: seenEvent.id },
      orderBy: { createdAt: 'desc' },
    });
    const endBizEvent = await this.prisma.bizEvent.findFirst({
      where: { bizSessionId: sessionId, eventId: endEvent.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!endEvent || !seenEvent || !bizSession || endBizEvent) {
      return false;
    }

    const seenData = seenBizEvent?.data as any;
    const data: any = {
      [EventAttributes.FLOW_END_REASON]: 'admin_ended',
    };

    const endedAttributes =
      defaultEvents.find((event) => event.codeName === BizEvents.FLOW_ENDED)?.attributes || [];

    for (const attribute of endedAttributes) {
      if (seenData?.[attribute]) {
        data[attribute] = seenData[attribute];
      }
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

  /**
   * End a checklist session
   * @param session - The session to end
   * @returns True if the session was ended successfully, false otherwise
   */
  async endChecklistSession(bizSession: BizSession) {
    const sessionId = bizSession.id;
    const endEvent = await this.prisma.event.findFirst({
      where: { codeName: BizEvents.CHECKLIST_DISMISSED },
    });
    const latestBizEvent = await this.prisma.bizEvent.findFirst({
      where: { bizSessionId: sessionId },
      orderBy: { createdAt: 'desc' },
    });
    const endBizEvent = await this.prisma.bizEvent.findFirst({
      where: { bizSessionId: sessionId, eventId: endEvent.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!endEvent || endBizEvent) {
      return false;
    }

    const seenData = latestBizEvent?.data as any;
    const data: any = {
      [EventAttributes.CHECKLIST_END_REASON]: 'admin_ended',
    };
    const dismissedAttributes =
      defaultEvents.find((event) => event.codeName === BizEvents.CHECKLIST_DISMISSED)?.attributes ||
      [];

    for (const attribute of dismissedAttributes) {
      if (seenData?.[attribute]) {
        data[attribute] = seenData[attribute];
      }
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

  /**
   * End a launcher session
   * @param session - The session to end
   * @returns True if the session was ended successfully, false otherwise
   */
  async endLauncherSession(bizSession: BizSession) {
    const sessionId = bizSession.id;
    const endEvent = await this.prisma.event.findFirst({
      where: { codeName: BizEvents.LAUNCHER_DISMISSED },
    });
    const latestBizEvent = await this.prisma.bizEvent.findFirst({
      where: { bizSessionId: sessionId },
      orderBy: { createdAt: 'desc' },
    });
    const endBizEvent = await this.prisma.bizEvent.findFirst({
      where: { bizSessionId: sessionId, eventId: endEvent.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!endEvent || endBizEvent) {
      return false;
    }

    const seenData = latestBizEvent?.data as any;
    const data: any = {
      [EventAttributes.LAUNCHER_END_REASON]: 'admin_ended',
    };
    const dismissedAttributes =
      defaultEvents.find((event) => event.codeName === BizEvents.LAUNCHER_DISMISSED)?.attributes ||
      [];

    for (const attribute of dismissedAttributes) {
      if (seenData?.[attribute]) {
        data[attribute] = seenData[attribute];
      }
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

  /**
   * Aggregate list answer data with total response count
   * Returns both distribution and totalResponse for listAnswer field
   */
  private async aggregationListAnswer(
    environmentId: string,
    contentId: string,
    questionCvid: string,
    startDateStr: string,
    endDateStr: string,
  ): Promise<{ distribution: QuestionAnswerAnalytics[]; totalResponse: number }> {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const data = await this.prisma.$queryRaw<QuestionAnswerAnalytics[]>`
      SELECT unnest("listAnswer") as answer, count(*) as count 
      FROM "BizAnswer"
      WHERE
        "BizAnswer"."contentId" = ${contentId} 
        AND "BizAnswer"."cvid" = ${questionCvid}
        AND "BizAnswer"."createdAt" >= ${startDate} 
        AND "BizAnswer"."createdAt" <= ${endDate}
        AND "BizAnswer"."environmentId" = ${environmentId}
        AND "BizAnswer"."listAnswer" IS NOT NULL
        AND array_length("listAnswer", 1) > 0
      GROUP BY unnest("listAnswer")
      ORDER BY count DESC
    `;

    // Calculate total based on the number of BizAnswer records, not the unnest count
    const totalResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "BizAnswer"
      WHERE
        "BizAnswer"."contentId" = ${contentId} 
        AND "BizAnswer"."cvid" = ${questionCvid}
        AND "BizAnswer"."createdAt" >= ${startDate} 
        AND "BizAnswer"."createdAt" <= ${endDate}
        AND "BizAnswer"."environmentId" = ${environmentId}
        AND "BizAnswer"."listAnswer" IS NOT NULL
        AND array_length("listAnswer", 1) > 0
    `;
    const totalResponse = Number(totalResult[0]?.count ?? 0);

    const distribution = data.map((item) => ({
      ...item,
      count: Number(item.count),
      percentage: totalResponse > 0 ? Math.round((Number(item.count) / totalResponse) * 100) : 0,
    }));

    return { distribution, totalResponse };
  }

  async aggregationQuestionAnswer(
    environmentId: string,
    contentId: string,
    questionCvid: string,
    startDateStr: string,
    endDateStr: string,
    field: 'numberAnswer' | 'textAnswer',
  ): Promise<QuestionAnswerAnalytics[]> {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const data = await this.prisma.$queryRaw<QuestionAnswerAnalytics[]>`
      SELECT "BizAnswer".${Prisma.raw(`"${field}"`)} as answer, count(*) as count 
      FROM "BizAnswer"
      WHERE
        "BizAnswer"."contentId" = ${contentId} 
        AND "BizAnswer"."cvid" = ${questionCvid}
        AND "BizAnswer"."environmentId" = ${environmentId}
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
    environmentId: string,
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
        environmentId,
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
    const average = total > 0 ? Math.round((weightedSum / total) * 10) / 10 : 0;

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
    // Calculate exact percentages for NPS calculation (no rounding)
    const promotersPercentageExact = (promoters / total) * 100;
    const detractorsPercentageExact = (detractors / total) * 100;
    // Calculate NPS using exact percentages, then round the final result
    const npsScore = Math.round(promotersPercentageExact - detractorsPercentageExact);
    // Round percentages for display
    const promotersPercentage = Math.round(promotersPercentageExact);
    const passivesPercentage = Math.round((passives / total) * 100);
    const detractorsPercentage = Math.round(detractorsPercentageExact);

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

  async getContentSessionWithRelations(
    id: string,
    environmentId: string,
    include?: {
      content?: boolean;
      bizCompany?: boolean;
      bizUser?: boolean;
      version?: boolean;
    },
  ) {
    return await this.prisma.bizSession.findUnique({
      where: { id, environmentId },
      include,
    });
  }

  async listContentSessionsWithRelations(
    environmentId: string,
    contentId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    userId?: string,
    include?: Prisma.BizSessionInclude,
    orderBy?: Prisma.BizSessionOrderByWithRelationInput[],
  ): Promise<PaginationConnection<Prisma.BizSessionGetPayload<{ include: typeof include }>>> {
    const where: Prisma.BizSessionWhereInput = {
      contentId,
      environmentId,
      bizUser: userId ? { externalId: userId } : undefined,
    };

    return findManyCursorConnection(
      (args) =>
        this.prisma.bizSession.findMany({
          where,
          include,
          orderBy,
          ...args,
        }),
      () =>
        this.prisma.bizSession.count({
          where,
        }),
      paginationArgs,
    );
  }

  async querySessionsByExternalId(
    query: {
      environmentId: string;
      externalUserId?: string;
      externalCompanyId?: string;
      contentId?: string;
      startDate?: string;
      endDate?: string;
    },
    pagination: PaginationArgs,
    orderBy: AnalyticsOrder,
  ) {
    const { first, last, before, after } = pagination;
    const { environmentId, externalUserId, externalCompanyId, contentId, startDate, endDate } =
      query;

    try {
      // Build where conditions
      const where: Prisma.BizSessionWhereInput = {
        environmentId,
        deleted: false,
        bizEvent: {
          some: {},
        },
      };

      // Add contentId filter if provided
      if (contentId) {
        where.contentId = contentId;
      }

      // Add date range filters if provided
      if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        where.createdAt = {
          gte: startDateObj,
          lte: endDateObj,
        };
      }

      // Add external user filter
      if (externalUserId) {
        where.bizUser = {
          externalId: externalUserId,
        };
      }

      // Add external company filter
      if (externalCompanyId) {
        where.bizCompany = {
          externalId: externalCompanyId,
        };
      }

      // Ensure at least one of externalUserId or externalCompanyId is provided
      if (!externalUserId && !externalCompanyId) {
        return {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: 0,
        };
      }

      const resp = await findManyCursorConnection(
        (args) =>
          this.prisma.bizSession.findMany({
            where,
            include: {
              bizUser: {
                include: {
                  bizUsersOnCompany: {
                    include: { bizCompany: true },
                  },
                },
              },
              bizEvent: {
                include: { event: true },
              },
              content: true,
              version: true,
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
            ...args,
          }),
        () =>
          this.prisma.bizSession.count({
            where,
          }),
        { first, last, before, after },
      );
      return resp;
    } catch (_) {
      // console.log(error);
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
      };
    }
  }

  async deleteContentSessionWithRelations(id: string, environmentId: string) {
    const session = await this.prisma.bizSession.findUnique({
      where: { id, environmentId },
    });

    if (!session) {
      return null;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bizAnswer.deleteMany({
        where: { bizSessionId: id },
      });
      await tx.bizEvent.deleteMany({
        where: { bizSessionId: id },
      });
      await tx.bizSession.delete({
        where: { id },
      });
    });

    return session;
  }

  async getSessionAnswers(sessionId: string) {
    return await this.prisma.bizAnswer.findMany({
      where: { bizSessionId: sessionId },
    });
  }
}
