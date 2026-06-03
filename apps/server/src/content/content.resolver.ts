import { Common } from '@/auth/models/common.model';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { Capability } from '@usertour/types';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PrismaService } from 'nestjs-prisma';
import { ContentIdArgs } from './args/content-id.args';
import { VersionIdArgs } from './args/version-id.args';
import { ContentService } from './content.service';
import { ContentOrder } from './dto/content-order.input';
import { ContentQuery } from './dto/content-query.input';
import { ContentStepsInput } from './dto/content-steps.input';
import {
  ContentDuplicateInput,
  ContentIdInput,
  ContentUpdateInput,
} from './dto/content-update.input';
import { ContentInput, ContentVersionInput } from './dto/content.input';
import { CreateStepInput, UpdateStepInput } from './dto/step.input';
import { VersionUpdateInput } from './dto/version-update.input';
import { VersionIdInput, VersionUpdateLocalizationInput } from './dto/version.input';
import { ContentConnection } from './models/content-connection.model';
import { Content } from './models/content.model';
import { Step } from './models/step.model';
import { VersionConnection } from './models/version-connection.model';
import { VersionOnLocalization } from './models/version-on-localization.model';
import { Version } from './models/version.model';

@Resolver(() => Content)
@UseGuards(PermissionGuard)
export class ContentResolver {
  constructor(
    private contentService: ContentService,
    private prisma: PrismaService,
  ) {}

  @Mutation(() => Content)
  @RequirePermission({ capability: Capability.ContentCreate, scope: ScopeKind.Content })
  async createContent(@Args('data') data: ContentInput) {
    return await this.contentService.createContent(data);
  }

  @Mutation(() => Content)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  async updateContent(@Args('data') data: ContentUpdateInput) {
    return await this.contentService.updateContent(data.contentId, data.content);
  }

  @Mutation(() => Content)
  @RequirePermission({ capability: Capability.ContentCreate, scope: ScopeKind.Content })
  async duplicateContent(@Args('data') data: ContentDuplicateInput) {
    return await this.contentService.duplicateContent(
      data.contentId,
      data.name,
      data.targetEnvironmentId,
    );
  }

  // Nullable: the underlying service filters soft-deleted rows, so a contentId
  // that exists but is `deleted=true` resolves to null. Declaring the field as
  // `Content!` made Apollo surface this as a generic 500 ISE for any caller
  // hitting a soft-deleted content via deep-link/bookmark. The guard already
  // authorizes only project members, so returning null leaks nothing.
  @Query(() => Content, { nullable: true })
  @RequirePermission({ capability: Capability.ContentRead, scope: ScopeKind.Content })
  async getContent(@Args() { contentId }: ContentIdArgs) {
    return await this.contentService.getContentById(contentId);
  }

  @Mutation(() => Version)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  async createContentVersion(@Args('data') data: ContentVersionInput) {
    return await this.contentService.createContentVersion(data);
  }

  @Query(() => Version)
  @RequirePermission({ capability: Capability.ContentRead, scope: ScopeKind.Content })
  async getContentVersion(@Args() { versionId }: VersionIdArgs) {
    return await this.contentService.getContentVersionById(versionId);
  }

  @Mutation(() => Version)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  async updateContentVersion(@Args('data') input: VersionUpdateInput) {
    return await this.contentService.updateContentVersion(input);
  }

  @Mutation(() => Version)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  async restoreContentVersion(@Args('data') { versionId }: VersionIdInput) {
    return await this.contentService.restoreContentVersion(versionId);
  }

  @Mutation(() => Version)
  @RequirePermission({ capability: Capability.ContentPublish, scope: ScopeKind.Content })
  async publishedContentVersion(@Args('data') { versionId, environmentId }: VersionIdInput) {
    return await this.contentService.publishedContentVersion(versionId, environmentId);
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.ContentPublish, scope: ScopeKind.Content })
  async unpublishedContentVersion(@Args('data') { contentId, environmentId }: ContentIdInput) {
    await this.contentService.unpublishedContentVersion(contentId, environmentId);
    return { success: true };
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.ContentDelete, scope: ScopeKind.Content })
  async deleteContent(@Args('data') { contentId }: ContentIdInput) {
    await this.contentService.deleteContent(contentId);
    return { success: true };
  }

  @Query(() => VersionConnection)
  @RequirePermission({ capability: Capability.ContentRead, scope: ScopeKind.Content })
  async listContentVersions(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args() { contentId }: ContentIdArgs,
  ) {
    return await this.contentService.listContentVersions(contentId, {
      first,
      last,
      before,
      after,
    });
  }

  @Mutation(() => Version)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  async addContentSteps(@Args('data') contentStepsInput: ContentStepsInput) {
    return await this.contentService.addContentSteps(contentStepsInput);
  }

  @Mutation(() => Step)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  async addContentStep(@Args('data') step: CreateStepInput) {
    return await this.contentService.addContentStep(step);
  }

  @Mutation(() => Step)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  async updateContentStep(@Args('stepId') stepId: string, @Args('data') step: UpdateStepInput) {
    return await this.contentService.updateContentStep(stepId, step);
  }

  @Query(() => [VersionOnLocalization])
  @RequirePermission({ capability: Capability.ContentRead, scope: ScopeKind.Content })
  async findManyVersionLocations(@Args() { versionId }: VersionIdArgs) {
    return await this.contentService.findManyVersionLocations(versionId);
  }

  @Mutation(() => VersionOnLocalization)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  async updateVersionLocationData(@Args('data') input: VersionUpdateLocalizationInput) {
    return await this.contentService.upsertVersionLocationData(input);
  }

  // @Mutation(() => Common)
  // async updateStepsSequence(
  //   @UserEntity() user: User,
  //   @Args("versionId") versionId: string,
  //   @Args("data") stepIds: [string]
  // ) {
  //   await this.contentService.updateStepsSequence(user.id, versionId, stepIds);
  //   return { success: true };
  // }

  @Query(() => ContentConnection)
  @RequirePermission({ capability: Capability.ContentRead, scope: ScopeKind.Content })
  async queryContent(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'query', type: () => ContentQuery, nullable: true })
    query: ContentQuery,
    @Args({
      name: 'orderBy',
      type: () => ContentOrder,
      nullable: true,
    })
    orderBy: ContentOrder,
  ) {
    const { environmentId, published, ...rest } = query;
    const conditions = {
      ...rest,
      deleted: false,
    } as any;
    const env = await this.prisma.environment.findUnique({
      where: {
        id: environmentId,
      },
      include: {
        project: true,
      },
    });

    conditions.environment = { project: { id: env.project.id } };

    if (published !== undefined) {
      if (!published) {
        conditions.OR = [
          {
            contentOnEnvironments: {
              none: {
                environmentId,
              },
            },
          },
        ];
      } else {
        conditions.OR = [
          {
            contentOnEnvironments: {
              some: {
                environmentId,
                published: true,
              },
            },
          },
        ];
      }
    }

    if (conditions.name) {
      conditions.name = { contains: conditions.name };
    }
    try {
      return await findManyCursorConnection(
        (args) =>
          this.prisma.content.findMany({
            where: {
              ...conditions,
            },
            include: {
              contentOnEnvironments: {
                include: {
                  environment: true,
                },
              },
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
            ...args,
          }),
        () =>
          this.prisma.content.count({
            where: {
              ...conditions,
            },
          }),
        { first, last, before, after },
      );
    } catch (error) {
      console.log(error);
    }
  }

  @ResolveField('steps')
  steps(@Parent() content: Content) {
    return this.prisma.step.findMany({
      where: { versionId: content.editedVersionId },
      orderBy: { sequence: 'asc' },
    });
  }

  @ResolveField('editedVersion', () => Version, { nullable: true })
  editedVersion(@Parent() content: Content) {
    if (!content.editedVersionId) return null;
    return this.prisma.version.findUnique({
      where: { id: content.editedVersionId },
    });
  }
}
