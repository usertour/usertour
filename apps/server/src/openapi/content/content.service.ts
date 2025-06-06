import { Injectable, Logger } from '@nestjs/common';
import { Content, ContentVersion, Question } from '../models/content.model';
import {
  ContentExpandType,
  ContentOrderByType,
  GetContentQueryDto,
  GetContentVersionQueryDto,
  ListContentQueryDto,
  VersionExpandType,
  ListContentVersionsQueryDto,
  VersionOrderByType,
} from './content.dto';
import { Prisma } from '@prisma/client';
import { ContentService } from '@/content/content.service';
import { ContentNotFoundError } from '@/common/errors/errors';
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
export class OpenAPIContentService {
  private readonly logger = new Logger(OpenAPIContentService.name);

  constructor(private contentService: ContentService) {}

  async getContent(
    id: string,
    environment: Environment,
    query?: GetContentQueryDto,
  ): Promise<Content> {
    const { expand } = query;
    const content = await this.contentService.getContentWithRelations(id, environment.projectId, {
      editedVersion: expand?.includes(ContentExpandType.EDITED_VERSION) ?? false,
      publishedVersion: expand?.includes(ContentExpandType.PUBLISHED_VERSION) ?? false,
    });

    if (!content) {
      throw new ContentNotFoundError();
    }

    return this.mapPrismaContentToApiContent(content, expand);
  }

  async listContent(
    requestUrl: string,
    environment: Environment,
    query: ListContentQueryDto,
  ): Promise<{ results: Content[]; next: string | null; previous: string | null }> {
    const { cursor, orderBy, limit, expand } = query;

    const include = {
      editedVersion: expand?.includes(ContentExpandType.EDITED_VERSION) ?? false,
      publishedVersion: expand?.includes(ContentExpandType.PUBLISHED_VERSION) ?? false,
    };
    const sortOrders = parseOrderBy(orderBy || [ContentOrderByType.CREATED_AT]);

    return paginate(
      requestUrl,
      cursor,
      limit,
      async (params) =>
        this.contentService.listContentWithRelations(
          environment.projectId,
          params,
          include,
          sortOrders,
        ),
      (node) => this.mapPrismaContentToApiContent(node, expand),
      expand ? { expand } : {},
    );
  }

  private mapPrismaContentToApiContent(
    content: ContentWithVersions,
    expand?: ContentExpandType[],
  ): Content {
    return {
      id: content.id,
      object: OpenApiObjectType.CONTENT,
      name: content.name,
      type: content.type,
      editedVersionId: content.editedVersionId,
      editedVersion:
        expand?.includes(ContentExpandType.EDITED_VERSION) && content.editedVersion
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
        expand?.includes(ContentExpandType.PUBLISHED_VERSION) && content.publishedVersion
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
    environment: Environment,
    query: GetContentVersionQueryDto,
  ): Promise<ContentVersion> {
    const { expand } = query;
    const projectId = environment.projectId;
    const version = await this.contentService.getContentVersionWithRelations(id, projectId, {
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
    query: ListContentVersionsQueryDto,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    const { contentId, cursor, orderBy, expand, limit = 20 } = query;
    const projectId = environment.projectId;

    const content = await this.contentService.getContentById(contentId);
    if (!content) {
      throw new ContentNotFoundError();
    }

    const sortOrders = parseOrderBy(orderBy || [VersionOrderByType.CREATED_AT]);

    const include = {
      content: true,
    };

    return paginate(
      requestUrl,
      cursor,
      limit,
      async (params) =>
        this.contentService.listContentVersionsWithRelations(
          projectId,
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
    const versionWithSteps = await this.contentService.getContentVersionWithRelations(
      version.id,
      version.content.projectId,
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
