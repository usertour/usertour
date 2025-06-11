import { Injectable, Logger } from '@nestjs/common';
import {
  ContentSessionExpandType,
  ContentSessionOrderByType,
  GetContentSessionQueryDto,
  ListContentSessionsQueryDto,
} from './content-sessions.dto';
import { ContentSession, ContentSessionAnswers } from '../models/content-session.model';
import { AnalyticsService } from '@/analytics/analytics.service';
import { Prisma } from '@prisma/client';
import { ContentNotFoundError, ContentSessionNotFoundError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { paginate } from '@/common/openapi/pagination';
import { ContentService } from '@/content/content.service';
import { Environment } from '@/environments/models/environment.model';
import { parseOrderBy } from '@/common/openapi/sort';
import { extractQuestionData } from '@/utils/content';

type ContentSessionWithRelations = Prisma.BizSessionGetPayload<{
  include: {
    content?: true;
    bizCompany?: true;
    bizUser?: true;
    version?: true;
  };
}>;

@Injectable()
export class OpenAPIContentSessionsService {
  private readonly logger = new Logger(OpenAPIContentSessionsService.name);
  private readonly defaultInclude = {
    content: true,
    bizCompany: true,
    bizUser: true,
    version: true,
  };

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly contentService: ContentService,
  ) {}

  private async getSessionAnswers(
    session: ContentSessionWithRelations,
  ): Promise<ContentSessionAnswers[]> {
    if (!session.version) {
      return null;
    }

    const version = await this.contentService.getContentVersionWithRelations(
      session.versionId,
      session.content.projectId,
      { steps: true },
    );
    if (!version || version.steps.length === 0) {
      return null;
    }
    const steps = version.steps;
    const answers = await this.analyticsService.getSessionAnswers(session.id);

    const result: ContentSessionAnswers[] = answers
      .map((answer) => {
        const matchingStep = steps.find((step) => {
          const questions = extractQuestionData(step.data as any);
          return questions?.some((question) => question?.data?.cvid === answer.cvid);
        });

        if (!matchingStep) {
          return null;
        }

        const questions = extractQuestionData(matchingStep.data as any);
        const question = questions?.find((q) => q?.data?.cvid === answer.cvid);

        if (!question) {
          return null;
        }

        // Convert answer value to string
        const answerValue =
          answer.numberAnswer?.toString() ||
          answer.textAnswer ||
          (answer.listAnswer ? JSON.stringify(answer.listAnswer) : '');

        return {
          id: answer.id,
          object: OpenApiObjectType.CONTENT_SESSION_ANSWER,
          answerType: question.type,
          answerValue,
          createdAt: answer.createdAt.toISOString(),
          questionCvid: question.data.cvid,
          questionName: question.data.name,
        };
      })
      .filter(Boolean) as ContentSessionAnswers[];

    return result;
  }

  async getContentSession(
    id: string,
    environment: Environment,
    query?: GetContentSessionQueryDto,
  ): Promise<ContentSession> {
    const { expand } = query;
    const session = await this.analyticsService.getContentSessionWithRelations(
      id,
      environment.id,
      this.defaultInclude,
    );

    if (!session) {
      throw new ContentSessionNotFoundError();
    }

    return await this.mapToContentSession(session, expand);
  }

  async listContentSessions(
    requestUrl: string,
    environment: Environment,
    query: ListContentSessionsQueryDto,
  ) {
    const { contentId, limit, userId, cursor, expand, orderBy } = query;

    const content = await this.contentService.getContentById(contentId);
    if (!content) {
      throw new ContentNotFoundError();
    }

    const sortOrders = parseOrderBy(orderBy || [ContentSessionOrderByType.CREATED_AT]);

    const environmentId = environment.id;

    return paginate(
      requestUrl,
      cursor,
      limit,
      async (params) =>
        this.analyticsService.listContentSessionsWithRelations(
          environmentId,
          contentId,
          params,
          userId,
          this.defaultInclude,
          sortOrders,
        ),
      (session) => this.mapToContentSession(session, expand),
      expand ? { expand } : {},
    );
  }

  async deleteContentSession(id: string, environmentId: string) {
    await this.analyticsService.deleteContentSessionWithRelations(id, environmentId);

    return {
      id,
      object: OpenApiObjectType.CONTENT_SESSION,
      deleted: true,
    };
  }

  async endContentSession(id: string, environment: Environment) {
    const session = await this.analyticsService.getContentSessionWithRelations(
      id,
      environment.id,
      this.defaultInclude,
    );

    if (!session) {
      throw new ContentSessionNotFoundError();
    }

    const success = await this.analyticsService.endSession(id);
    if (!success) {
      throw new ContentSessionNotFoundError();
    }

    return await this.getContentSession(id, environment, {});
  }

  private async mapToContentSession(
    session: ContentSessionWithRelations,
    expand?: ContentSessionExpandType[],
  ): Promise<ContentSession> {
    const shouldInclude = (type: ContentSessionExpandType) => expand?.includes(type);

    const answers = shouldInclude(ContentSessionExpandType.ANSWERS)
      ? await this.getSessionAnswers(session)
      : null;

    return {
      id: session.id,
      object: OpenApiObjectType.CONTENT_SESSION,
      answers,
      completedAt: session.state === 1 ? session.updatedAt.toISOString() : null,
      completed: session.state === 1,
      contentId: session.contentId,
      content:
        shouldInclude(ContentSessionExpandType.CONTENT) && session.content
          ? {
              id: session.content.id,
              object: OpenApiObjectType.CONTENT,
              name: session.content.name,
              type: session.content.type,
              editedVersionId: session.content.editedVersionId,
              publishedVersionId: session.content.publishedVersionId,
              updatedAt: session.content.updatedAt.toISOString(),
              createdAt: session.content.createdAt.toISOString(),
            }
          : null,
      createdAt: session.createdAt.toISOString(),
      companyId: session.bizCompany?.externalId || null,
      company:
        shouldInclude(ContentSessionExpandType.COMPANY) && session.bizCompany
          ? {
              id: session.bizCompany.externalId,
              object: OpenApiObjectType.COMPANY,
              attributes: session.bizCompany.data as any,
              createdAt: session.bizCompany.createdAt.toISOString(),
            }
          : null,
      isPreview: false,
      lastActivityAt: session.updatedAt.toISOString(),
      progress: session.progress,
      userId: session.bizUser?.externalId || null,
      user:
        shouldInclude(ContentSessionExpandType.USER) && session.bizUser
          ? {
              id: session.bizUser.externalId,
              object: OpenApiObjectType.USER,
              attributes: session.bizUser.data as any,
              createdAt: session.bizUser.createdAt.toISOString(),
            }
          : null,
      versionId: session.versionId,
      version:
        shouldInclude(ContentSessionExpandType.VERSION) && session.version
          ? {
              id: session.version.id,
              object: OpenApiObjectType.CONTENT_VERSION,
              number: session.version.sequence,
              updatedAt: session.version.updatedAt.toISOString(),
              createdAt: session.version.createdAt.toISOString(),
            }
          : null,
    };
  }
}
