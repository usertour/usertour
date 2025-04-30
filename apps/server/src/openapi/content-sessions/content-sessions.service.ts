import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpandType, ExpandTypes } from './content-sessions.dto';
import { ContentSession } from '../models/content-session.model';
import { AnalyticsService } from '@/analytics/analytics.service';
import { Prisma } from '@prisma/client';
import {
  ContentNotFoundError,
  ContentSessionNotFoundError,
  InvalidRequestError,
} from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/types/openapi';
import { paginate } from '@/common/openapi/pagination';
import { ContentsService } from '@/contents/contents.service';

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

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
    private readonly contentsService: ContentsService,
  ) {}

  private getIncludeFromExpand(expand?: ExpandTypes) {
    if (!expand) return {};

    const include: {
      content?: boolean;
      bizCompany?: boolean;
      bizUser?: boolean;
      version?: boolean;
    } = {};

    if (expand.includes(ExpandType.CONTENT)) {
      include.content = true;
    }
    if (expand.includes(ExpandType.COMPANY)) {
      include.bizCompany = true;
    }
    if (expand.includes(ExpandType.USER)) {
      include.bizUser = true;
    }
    if (expand.includes(ExpandType.VERSION)) {
      include.version = true;
    }

    return include;
  }

  async getContentSession(
    id: string,
    environmentId: string,
    expand?: ExpandTypes,
  ): Promise<ContentSession> {
    const session = await this.analyticsService.getContentSessionWithRelations(
      id,
      environmentId,
      this.getIncludeFromExpand(expand),
    );

    if (!session) {
      return null;
    }

    return this.mapToContentSession(session);
  }

  async listContentSessions(
    environmentId: string,
    contentId: string,
    limit = 10,
    cursor?: string,
    expand?: ExpandTypes,
  ) {
    if (!contentId) {
      throw new InvalidRequestError('contentId is required');
    }

    const content = await this.contentsService.getContentById(contentId);
    if (!content) {
      throw new ContentNotFoundError();
    }

    const apiUrl = this.configService.get<string>('app.apiUrl');
    const include = this.getIncludeFromExpand(expand);

    return paginate(
      apiUrl,
      'content_sessions',
      contentId,
      cursor,
      limit,
      async (params) =>
        await this.analyticsService.listContentSessionsWithRelations(
          environmentId,
          contentId,
          params,
          include,
        ),
      this.mapToContentSession,
    );
  }

  async deleteContentSession(id: string, environmentId: string) {
    const session = await this.analyticsService.deleteContentSessionWithRelations(
      id,
      environmentId,
    );

    if (!session) {
      throw new ContentSessionNotFoundError();
    }

    return {
      id,
      object: OpenApiObjectType.SESSION,
      deleted: true,
    };
  }

  private mapToContentSession(session: ContentSessionWithRelations): ContentSession {
    return {
      id: session.id,
      object: OpenApiObjectType.SESSION,
      answers: session.data as any,
      completedAt: null,
      completed: session.state === 1,
      contentId: session.contentId,
      content: session.content
        ? {
            id: session.content.id,
            object: OpenApiObjectType.CONTENT,
            type: session.content.type,
            editedVersionId: session.content.editedVersionId,
            publishedVersionId: session.content.publishedVersionId,
            updatedAt: session.content.updatedAt.toISOString(),
            createdAt: session.content.createdAt.toISOString(),
          }
        : undefined,
      createdAt: session.createdAt.toISOString(),
      companyId: session.bizCompanyId,
      company: session.bizCompany
        ? {
            id: session.bizCompany.id,
            object: OpenApiObjectType.COMPANY,
            attributes: session.bizCompany.data as any,
            createdAt: session.bizCompany.createdAt.toISOString(),
          }
        : undefined,
      isPreview: false,
      lastActivityAt: session.updatedAt.toISOString(),
      progress: session.progress,
      userId: session.bizUserId,
      user: session.bizUser
        ? {
            id: session.bizUser.id,
            object: OpenApiObjectType.USER,
            attributes: session.bizUser.data as any,
            createdAt: session.bizUser.createdAt.toISOString(),
          }
        : undefined,
      versionId: session.versionId,
      version: session.version
        ? {
            id: session.version.id,
            object: OpenApiObjectType.VERSION,
            number: session.version.sequence,
            updatedAt: session.version.updatedAt.toISOString(),
            createdAt: session.version.createdAt.toISOString(),
          }
        : undefined,
    };
  }
}
