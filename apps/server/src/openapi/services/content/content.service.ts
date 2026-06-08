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

// v2: editedVersion plus the per-environment publish rows. The nested
// `publishedVersion` is only populated when the expand is requested; the mappers
// guard it at runtime.
type ContentWithEnvironments = Prisma.ContentGetPayload<{
  include: {
    editedVersion: true;
    contentOnEnvironments: { include: { publishedVersion: true } };
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

  // v1 and v2 differ only in what they include and how they map it; the fetch +
  // null-check + pagination plumbing below is shared.

  async getContent(id: string, projectId: string, query?: GetContentQueryDto): Promise<Content> {
    const expand = query?.expand;
    return this.getMapped(id, projectId, this.v1Include(expand), (c) =>
      this.mapContentV1(c, expand),
    );
  }

  listContent(
    requestUrl: string,
    projectId: string,
    query: ListContentQueryDto,
  ): Promise<{ results: Content[]; next: string | null; previous: string | null }> {
    return this.listMapped(requestUrl, projectId, query, this.v1Include(query.expand), (n) =>
      this.mapContentV1(n, query.expand),
    );
  }

  async getContentV2(
    id: string,
    projectId: string,
    query?: GetContentQueryDto,
  ): Promise<ContentV2> {
    const expand = query?.expand;
    return this.getMapped(id, projectId, this.v2Include(expand), (c) =>
      this.mapContentV2(c, expand),
    );
  }

  listContentV2(
    requestUrl: string,
    projectId: string,
    query: ListContentQueryDto,
  ): Promise<{ results: ContentV2[]; next: string | null; previous: string | null }> {
    return this.listMapped(requestUrl, projectId, query, this.v2Include(query.expand), (n) =>
      this.mapContentV2(n, query.expand),
    );
  }

  // --- shared plumbing -----------------------------------------------------

  // The generic include erases the relation types here, so the mapper receives an
  // untyped node and re-asserts the concrete shape it loaded (mapContentV1 /
  // mapContentV2 are strongly typed at their boundary).
  private async getMapped<T>(
    id: string,
    projectId: string,
    include: Prisma.ContentInclude,
    map: (content: any) => T,
  ): Promise<T> {
    const content = await this.contentService.getContentWithRelations(id, projectId, include);
    if (!content) {
      throw new ContentNotFoundError();
    }
    return map(content);
  }

  private listMapped<T>(
    requestUrl: string,
    projectId: string,
    query: ListContentQueryDto,
    include: Prisma.ContentInclude,
    map: (node: any) => T,
  ): Promise<{ results: T[]; next: string | null; previous: string | null }> {
    const { cursor, limit, orderBy, expand, type } = query;
    const sortOrders = parseOrderBy(orderBy || [ContentOrderByType.CREATED_AT]);
    return paginate(
      requestUrl,
      cursor,
      limit,
      (params) =>
        this.contentService.listContentWithRelations(projectId, params, include, sortOrders, type),
      (node) => map(node),
      { ...(expand ? { expand } : {}), ...(type ? { type } : {}) },
    );
  }

  private v1Include(expand?: ContentExpandType[]): Prisma.ContentInclude {
    return {
      editedVersion: expand?.includes(ContentExpandType.EDITED_VERSION) ?? false,
      publishedVersion: expand?.includes(ContentExpandType.PUBLISHED_VERSION) ?? false,
    };
  }

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

  // Fields shared by both response shapes (everything except publish state).
  private mapBase(
    content: ContentWithVersions | ContentWithEnvironments,
    expand?: ContentExpandType[],
  ) {
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
      updatedAt: content.updatedAt.toISOString(),
      createdAt: content.createdAt.toISOString(),
    };
  }

  private mapContentV1(content: ContentWithVersions, expand?: ContentExpandType[]): Content {
    return {
      ...this.mapBase(content, expand),
      publishedVersionId: content.publishedVersionId,
      publishedVersion:
        expand?.includes(ContentExpandType.PUBLISHED_VERSION) && content.publishedVersion
          ? this.mapVersion(content.publishedVersion)
          : undefined,
    } as Content;
  }

  private mapContentV2(content: ContentWithEnvironments, expand?: ContentExpandType[]): ContentV2 {
    return {
      ...this.mapBase(content, expand),
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
