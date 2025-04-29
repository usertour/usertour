import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpandType, ExpandTypes } from './sessions.dto';
import { ContentSession } from '../models/content-session.model';
import { AnalyticsService } from '@/analytics/analytics.service';
import { Prisma } from '@prisma/client';
import { ContentSessionNotFoundError } from '@/common/errors/errors';

type ContentSessionWithRelations = Prisma.BizSessionGetPayload<{
  include: {
    content?: true;
    bizCompany?: true;
    bizUser?: true;
    version?: true;
  };
}>;

@Injectable()
export class OpenAPIContentSessionService {
  private readonly logger = new Logger(OpenAPIContentSessionService.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
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
    cursor?: string,
    limit = 10,
    expand?: ExpandTypes,
  ) {
    const apiUrl = this.configService.get<string>('app.apiUrl');
    const { results, hasNext, endCursor } =
      await this.analyticsService.listContentSessionsWithRelations(
        environmentId,
        contentId,
        cursor,
        limit,
        this.getIncludeFromExpand(expand),
      );

    return {
      results: results.map(this.mapToContentSession),
      next: hasNext ? `${apiUrl}/v1/content_sessions?cursor=${endCursor}&limit=${limit}` : null,
      previous: cursor || null,
    };
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
      object: 'content_session',
      deleted: true,
    };
  }

  private mapToContentSession(session: ContentSessionWithRelations): ContentSession {
    return {
      id: session.id,
      object: 'content_session',
      answers: session.data as any,
      completedAt: null,
      completed: session.state === 1,
      contentId: session.contentId,
      content: session.content
        ? {
            id: session.content.id,
            object: 'content',
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
            object: 'company',
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
            object: 'user',
            attributes: session.bizUser.data as any,
            createdAt: session.bizUser.createdAt.toISOString(),
          }
        : undefined,
      versionId: session.versionId,
      version: session.version
        ? {
            id: session.version.id,
            object: 'content_version',
            number: session.version.sequence,
            updatedAt: session.version.updatedAt.toISOString(),
            createdAt: session.version.createdAt.toISOString(),
          }
        : undefined,
    };
  }
}
