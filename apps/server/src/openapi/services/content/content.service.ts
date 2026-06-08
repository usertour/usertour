import { Injectable, Logger } from '@nestjs/common';
import { Content, ContentV2, ContentVersion, Question } from '../../models/content.model';
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
import { parseOrderBy } from '@/common/openapi/sort';
import { extractQuestionData } from '@/utils/content-question';
// v1 (legacy): the single top-level publishedVersion relation.
type ContentWithVersions = Prisma.ContentGetPayload<{
  include: { editedVersion: true; publishedVersion: true };
}>;

// v2: per-environment publish rows, each optionally carrying its published version.
type ContentOnEnvironmentWithVersion = Prisma.ContentOnEnvironmentGetPayload<{
  include: { publishedVersion: true };
}>;

type ContentWithEnvironments = Prisma.ContentGetPayload<{
  include: { editedVersion: true };
}> & {
  // The env rows are always loaded; the nested `publishedVersion` object is only
  // present when the publishedVersion expand is requested, so it's optional here.
  contentOnEnvironments?: Array<
    Omit<ContentOnEnvironmentWithVersion, 'publishedVersion'> & {
      publishedVersion?: ContentOnEnvironmentWithVersion['publishedVersion'] | null;
    }
  >;
};

type VersionWithContent = Prisma.VersionGetPayload<{
  include: {
    content: true;
  };
}>;

@Injectable()
export class OpenAPIContentService {
  private readonly logger = new Logger(OpenAPIContentService.name);

  constructor(private contentService: ContentService) {}

  // --- v1 (legacy: single publishedVersionId/publishedVersion) -------------

  async getContent(id: string, projectId: string, query?: GetContentQueryDto): Promise<Content> {
    const { expand } = query;
    const content = await this.contentService.getContentWithRelations(id, projectId, {
      editedVersion: expand?.includes(ContentExpandType.EDITED_VERSION) ?? false,
      publishedVersion: expand?.includes(ContentExpandType.PUBLISHED_VERSION) ?? false,
    });

    if (!content) {
      throw new ContentNotFoundError();
    }

    return this.mapPrismaContentToApiContent(content as ContentWithVersions, expand);
  }

  async listContent(
    requestUrl: string,
    projectId: string,
    query: ListContentQueryDto,
  ): Promise<{ results: Content[]; next: string | null; previous: string | null }> {
    const { cursor, orderBy, limit, expand, type } = query;

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
        this.contentService.listContentWithRelations(projectId, params, include, sortOrders, type),
      (node) => this.mapPrismaContentToApiContent(node as ContentWithVersions, expand),
      { ...(expand ? { expand } : {}), ...(type ? { type } : {}) },
    );
  }

  // --- v2 (per-environment publish state via environments[]) ---------------

  async getContentV2(
    id: string,
    projectId: string,
    query?: GetContentQueryDto,
  ): Promise<ContentV2> {
    const { expand } = query;
    const content = await this.contentService.getContentWithRelations(
      id,
      projectId,
      this.v2Include(expand),
    );

    if (!content) {
      throw new ContentNotFoundError();
    }

    return this.mapPrismaContentToApiContentV2(content as ContentWithEnvironments, expand);
  }

  async listContentV2(
    requestUrl: string,
    projectId: string,
    query: ListContentQueryDto,
  ): Promise<{ results: ContentV2[]; next: string | null; previous: string | null }> {
    const { cursor, orderBy, limit, expand, type } = query;

    const include = this.v2Include(expand);
    const sortOrders = parseOrderBy(orderBy || [ContentOrderByType.CREATED_AT]);

    return paginate(
      requestUrl,
      cursor,
      limit,
      async (params) =>
        this.contentService.listContentWithRelations(projectId, params, include, sortOrders, type),
      (node) => this.mapPrismaContentToApiContentV2(node as ContentWithEnvironments, expand),
      { ...(expand ? { expand } : {}), ...(type ? { type } : {}) },
    );
  }

  // The v2 include: editedVersion plus the per-environment publish rows. The
  // nested published version object is loaded only when the expand is requested.
  private v2Include(expand?: ContentExpandType[]): Prisma.ContentInclude {
    return {
      editedVersion: expand?.includes(ContentExpandType.EDITED_VERSION) ?? false,
      contentOnEnvironments: {
        include: {
          publishedVersion: expand?.includes(ContentExpandType.PUBLISHED_VERSION) ?? false,
        },
      },
    };
  }

  // --- mappers -------------------------------------------------------------

  private mapVersion(version: {
    id: string;
    sequence: number;
    updatedAt: Date;
    createdAt: Date;
  }): ContentVersion {
    return {
      id: version.id,
      object: OpenApiObjectType.CONTENT_VERSION,
      number: version.sequence,
      questions: [],
      updatedAt: version.updatedAt.toISOString(),
      createdAt: version.createdAt.toISOString(),
    };
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
          ? this.mapVersion(content.editedVersion)
          : undefined,
      publishedVersionId: content.publishedVersionId,
      publishedVersion:
        expand?.includes(ContentExpandType.PUBLISHED_VERSION) && content.publishedVersion
          ? this.mapVersion(content.publishedVersion)
          : undefined,
      updatedAt: content.updatedAt.toISOString(),
      createdAt: content.createdAt.toISOString(),
    } as Content;
  }

  private mapPrismaContentToApiContentV2(
    content: ContentWithEnvironments,
    expand?: ContentExpandType[],
  ): ContentV2 {
    return {
      id: content.id,
      object: OpenApiObjectType.CONTENT,
      name: content.name,
      type: content.type,
      editedVersionId: content.editedVersionId,
      editedVersion:
        expand?.includes(ContentExpandType.EDITED_VERSION) && content.editedVersion
          ? this.mapVersion(content.editedVersion)
          : undefined,
      environments: (content.contentOnEnvironments ?? []).map((coe) => ({
        environmentId: coe.environmentId,
        published: coe.published,
        publishedVersionId: coe.publishedVersionId,
        publishedAt: coe.publishedAt.toISOString(),
        publishedVersion:
          expand?.includes(ContentExpandType.PUBLISHED_VERSION) && coe.publishedVersion
            ? this.mapVersion(coe.publishedVersion)
            : undefined,
      })),
      updatedAt: content.updatedAt.toISOString(),
      createdAt: content.createdAt.toISOString(),
    } as ContentV2;
  }

  async getContentVersion(
    id: string,
    projectId: string,
    query: GetContentVersionQueryDto,
  ): Promise<ContentVersion> {
    const { expand } = query;
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
    projectId: string,
    query: ListContentVersionsQueryDto,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    const { contentId, cursor, orderBy, expand, limit = 20 } = query;

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
