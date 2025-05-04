import { Injectable, Logger } from '@nestjs/common';
import { Content, ContentVersion, Question } from '../models/content.model';
import { ExpandType, OrderByType, VersionExpandType } from './contents.dto';
import { Prisma } from '@prisma/client';
import { ContentsService } from '@/contents/contents.service';
import { ContentNotFoundError, InvalidOrderByError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { paginate } from '@/common/openapi/pagination';
import { Environment } from '@/environments/models/environment.model';
import { parseOrderBy } from '@/common/openapi/sort';
import { extractQuestionData } from '@/utils/content';
type ContentWithVersions = Prisma.ContentGetPayload<{
  include: {
    editedVersion: true;
    publishedVersion: true;
  };
}>;

type VersionWithContent = Prisma.VersionGetPayload<{
  include: {
    content: true;
  };
}>;

@Injectable()
export class OpenAPIContentsService {
  private readonly logger = new Logger(OpenAPIContentsService.name);

  constructor(private contentsService: ContentsService) {}

  async getContent(id: string, environmentId: string, expand?: ExpandType[]): Promise<Content> {
    const content = await this.contentsService.getContentWithRelations(id, environmentId, {
      editedVersion: expand?.includes(ExpandType.EDITED_VERSION) ?? false,
      publishedVersion: expand?.includes(ExpandType.PUBLISHED_VERSION) ?? false,
    });

    if (!content) {
      throw new ContentNotFoundError();
    }

    return this.mapPrismaContentToApiContent(content, expand);
  }

  async listContents(
    requestUrl: string,
    environment: Environment,
    cursor?: string,
    orderBy?: OrderByType[],
    limit = 20,
    expand?: ExpandType[],
  ): Promise<{ results: Content[]; next: string | null; previous: string | null }> {
    const include = {
      editedVersion: expand?.includes(ExpandType.EDITED_VERSION) ?? false,
      publishedVersion: expand?.includes(ExpandType.PUBLISHED_VERSION) ?? false,
    };

    // Validate orderBy values
    if (
      orderBy?.some((value) => {
        const field = value.startsWith('-') ? value.substring(1) : value;
        return field !== OrderByType.CREATED_AT;
      })
    ) {
      throw new InvalidOrderByError();
    }

    const sortOrders = parseOrderBy(orderBy || ['createdAt']);

    const environmentId = environment.id;

    return paginate(
      requestUrl,
      cursor,
      limit,
      async (params) =>
        this.contentsService.listContentsWithRelations(environmentId, params, include, sortOrders),
      (node) => this.mapPrismaContentToApiContent(node, expand),
      expand ? { expand } : {},
    );
  }

  private mapPrismaContentToApiContent(
    content: ContentWithVersions,
    expand?: ExpandType[],
  ): Content {
    return {
      id: content.id,
      object: OpenApiObjectType.CONTENT,
      name: content.name,
      type: content.type,
      editedVersionId: content.editedVersionId,
      editedVersion:
        expand?.includes(ExpandType.EDITED_VERSION) && content.editedVersion
          ? {
              id: content.editedVersion.id,
              object: OpenApiObjectType.CONTENT_VERSION,
              number: content.editedVersion.sequence,
              questions: [],
              updatedAt: content.editedVersion.updatedAt.toISOString(),
              createdAt: content.editedVersion.createdAt.toISOString(),
            }
          : undefined,
      publishedVersionId: content.publishedVersionId,
      publishedVersion:
        expand?.includes(ExpandType.PUBLISHED_VERSION) && content.publishedVersion
          ? {
              id: content.publishedVersion.id,
              object: OpenApiObjectType.CONTENT_VERSION,
              number: content.publishedVersion.sequence,
              questions: [],
              updatedAt: content.publishedVersion.updatedAt.toISOString(),
              createdAt: content.publishedVersion.createdAt.toISOString(),
            }
          : undefined,
      updatedAt: content.updatedAt.toISOString(),
      createdAt: content.createdAt.toISOString(),
    } as Content;
  }

  async getContentVersion(
    id: string,
    environmentId: string,
    expand?: VersionExpandType[],
  ): Promise<ContentVersion> {
    const version = await this.contentsService.getContentVersionWithRelations(id, environmentId, {
      content: true,
    });

    if (!version) {
      throw new ContentNotFoundError();
    }

    return this.mapPrismaVersionToApiVersion(version, expand);
  }

  async listContentVersions(
    requestUrl: string,
    environment: Environment,
    contentId: string,
    cursor?: string,
    orderBy?: OrderByType[],
    expand?: VersionExpandType[],
    limit = 20,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    const environmentId = environment.id;
    // Validate orderBy values
    if (
      orderBy?.some((value) => {
        const field = value.startsWith('-') ? value.substring(1) : value;
        return field !== OrderByType.CREATED_AT;
      })
    ) {
      throw new InvalidOrderByError();
    }
    const content = await this.contentsService.getContentById(contentId);
    if (!content) {
      throw new ContentNotFoundError();
    }

    const sortOrders = parseOrderBy(orderBy || ['createdAt']);

    const include = {
      content: true,
    };

    return paginate(
      requestUrl,
      cursor,
      limit,
      async (params) =>
        this.contentsService.listContentVersionsWithRelations(
          environmentId,
          contentId,
          params,
          include,
          sortOrders,
        ),
      (node) => this.mapPrismaVersionToApiVersion(node, expand),
    );
  }

  private async mapPrismaVersionToApiVersion(
    version: VersionWithContent,
    expand?: VersionExpandType[],
  ): Promise<ContentVersion> {
    const shouldInclude = (type: VersionExpandType) => expand?.includes(type) ?? false;

    const questions = shouldInclude(VersionExpandType.QUESTIONS)
      ? await this.mapPrismaQuestionsToApiQuestions(version)
      : null;

    return {
      id: version.id,
      object: OpenApiObjectType.CONTENT_VERSION,
      number: version.sequence,
      questions,
      updatedAt: version.updatedAt.toISOString(),
      createdAt: version.createdAt.toISOString(),
    };
  }

  private async mapPrismaQuestionsToApiQuestions(version: VersionWithContent): Promise<Question[]> {
    const versionWithSteps = await this.contentsService.getContentVersionWithRelations(
      version.id,
      version.content.environmentId,
      { steps: true },
    );

    if (!versionWithSteps?.steps || versionWithSteps.steps.length === 0) {
      return [];
    }

    const questions: Question[] = [];
    for (const step of versionWithSteps.steps) {
      const questionData = extractQuestionData(step.data as any);
      const question = questionData[0];
      if (question) {
        questions.push({
          object: OpenApiObjectType.QUESTION,
          cvid: question.data.cvid,
          name: question.data.name,
          type: question.type,
        });
      }
    }
    return questions;
  }
}
