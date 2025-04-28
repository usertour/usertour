import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Prisma } from '@prisma/client';
import { ExpandType, ExpandTypes } from './content-session.dto';
import { ContentSession } from '../models/content-session.model';
import { AnalyticsService } from '@/analytics/analytics.service';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';

type ContentSessionWithRelations = Prisma.BizSessionGetPayload<{
  include: {
    content?: true;
    bizCompany?: true;
    bizUser?: true;
    version?: true;
    bizEvent?: true;
  };
}>;

type BizSessionInclude = Prisma.BizSessionInclude;

@Injectable()
export class OpenAPIContentSessionService {
  private readonly logger = new Logger(OpenAPIContentSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  private getIncludeFromExpand(expand?: ExpandTypes) {
    if (!expand) return {};

    const include: BizSessionInclude = {};

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
    const session = await this.prisma.bizSession.findUnique({
      where: { id, content: { environmentId } },
      include: this.getIncludeFromExpand(expand),
    });

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
    const where: Prisma.BizSessionWhereInput = {
      contentId,
      content: {
        environmentId,
      },
    };

    this.logger.log('Before findMany');

    const sessions = await this.prisma.bizSession.findMany({
      where,
      include: this.getIncludeFromExpand(expand),
      take: Number(limit) + 1,
      ...(cursor && { cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log('After findMany');

    const hasNext = sessions.length > limit;
    const results = hasNext ? sessions.slice(0, -1) : sessions;

    this.logger.log('Before return');

    return {
      results: results.map(this.mapToContentSession),
      next: hasNext ? results[results.length - 1].id : null,
      previous: cursor || null,
    };
  }

  async deleteContentSession(id: string, environmentId: string) {
    const session = await this.prisma.bizSession.findUnique({
      where: { id, content: { environmentId } },
    });

    if (!session) {
      throw new OpenAPIException(
        OpenAPIErrors.CONTENT_SESSION.NOT_FOUND.message,
        404,
        OpenAPIErrors.CONTENT_SESSION.NOT_FOUND.code,
      );
    }

    await this.analyticsService.deleteSession(id);

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
