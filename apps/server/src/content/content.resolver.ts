import { Common } from '@/auth/models/common.model';
import { AuditWeb } from '@/audit/audit.decorator';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';
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
import { ContentPublishRecordConnection } from './models/content-publish-record.model';
import { ContentService } from './content.service';
import { ContentOrder } from './dto/content-order.input';
import { ContentQuery } from './dto/content-query.input';
import {
  ContentDuplicateInput,
  ContentIdInput,
  ContentUpdateInput,
} from './dto/content-update.input';
import { ContentInput, ContentVersionInput } from './dto/content.input';
import { VersionUpdateInput } from './dto/version-update.input';
import { VersionIdInput, VersionUpdateLocalizationInput } from './dto/version.input';
import { ContentConnection } from './models/content-connection.model';
import { Content } from './models/content.model';
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
  @AuditWeb({
    action: 'create',
    resourceType: 'content',
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
  })
  async createContent(@Args('data') data: ContentInput) {
    return await this.contentService.createContent(data);
  }

  @Mutation(() => Content)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  @AuditWeb({
    action: 'update',
    resourceType: 'content',
    resourceId: (a) => (a.data as { contentId: string }).contentId,
  })
  async updateContent(@Args('data') data: ContentUpdateInput) {
    return await this.contentService.updateContent(data.contentId, data.content);
  }

  @Mutation(() => Content)
  @RequirePermission({ capability: Capability.ContentCreate, scope: ScopeKind.Content })
  @AuditWeb({
    action: 'create',
    resourceType: 'content',
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
  })
  async duplicateContent(@Args('data') data: ContentDuplicateInput) {
    return await this.contentService.duplicateContent(data.contentId, data.name);
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
  // Lifecycle boundary (once per edit session on published content) — audited, unlike
  // the draft-edit stream (updateContentVersion etc.), whose ledger is version history.
  @AuditWeb({
    action: 'update',
    resourceType: 'content',
    resourceId: (_a, r) => String((r as { contentId?: string })?.contentId ?? ''),
  })
  async createContentVersion(@UserEntity() user: User, @Args('data') data: ContentVersionInput) {
    return await this.contentService.createContentVersion(data, { userId: user.id });
  }

  @Query(() => Version)
  @RequirePermission({ capability: Capability.ContentRead, scope: ScopeKind.Content })
  async getContentVersion(@Args() { versionId }: VersionIdArgs) {
    return await this.contentService.getContentVersionById(versionId);
  }

  @Mutation(() => Version)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  async updateContentVersion(@UserEntity() user: User, @Args('data') input: VersionUpdateInput) {
    return await this.contentService.updateContentVersion(input, { userId: user.id });
  }

  @Mutation(() => Version)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  // Restoring an old version wholesale replaces what's staged for publish — the
  // classic "who did that?" action.
  @AuditWeb({
    action: 'update',
    resourceType: 'content',
    resourceId: (_a, r) => String((r as { contentId?: string })?.contentId ?? ''),
  })
  async restoreContentVersion(
    @UserEntity() user: User,
    @Args('data') { versionId }: VersionIdInput,
  ) {
    return await this.contentService.restoreContentVersion(versionId, { userId: user.id });
  }

  @Mutation(() => Version)
  @RequirePermission({ capability: Capability.ContentPublish, scope: ScopeKind.Content })
  @AuditWeb({
    action: 'update',
    resourceType: 'content',
    // publishedContentVersion returns the CONTENT row (its id IS the content id) —
    // reading `contentId` here yields undefined and the required-column write of
    // the audit row fails silently, wiping web publishes from the audit trail.
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
    environmentId: (a) => (a.data as { environmentId?: string }).environmentId,
  })
  async publishedContentVersion(
    @UserEntity() user: User,
    @Args('data') { versionId, environmentId }: VersionIdInput,
  ) {
    return await this.contentService.publishedContentVersion(versionId, environmentId, {
      userId: user.id,
    });
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.ContentPublish, scope: ScopeKind.Content })
  @AuditWeb({
    action: 'update',
    resourceType: 'content',
    resourceId: (a) => (a.data as { contentId: string }).contentId,
    environmentId: (a) => (a.data as { environmentId?: string }).environmentId,
  })
  async unpublishedContentVersion(
    @UserEntity() user: User,
    @Args('data') { contentId, environmentId }: ContentIdInput,
  ) {
    await this.contentService.unpublishedContentVersion(contentId, environmentId, {
      userId: user.id,
    });
    return { success: true };
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.ContentDelete, scope: ScopeKind.Content })
  @AuditWeb({
    action: 'delete',
    resourceType: 'content',
    resourceId: (a) => (a.data as { contentId: string }).contentId,
  })
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

  @Query(() => ContentPublishRecordConnection)
  @RequirePermission({ capability: Capability.ContentRead, scope: ScopeKind.Content })
  async listContentPublishRecords(
    @Args() { contentId }: ContentIdArgs,
    @Args() pagination: PaginationArgs,
    @Args('environmentId', { nullable: true }) environmentId?: string,
  ) {
    return await this.contentService.listContentPublishRecords(
      contentId,
      pagination,
      environmentId ?? undefined,
    );
  }

  @Query(() => [VersionOnLocalization])
  @RequirePermission({ capability: Capability.ContentRead, scope: ScopeKind.Content })
  async listVersionLocalizations(@Args() { versionId }: VersionIdArgs) {
    return await this.contentService.listVersionLocalizations(versionId);
  }

  @Mutation(() => VersionOnLocalization)
  @RequirePermission({ capability: Capability.ContentUpdate, scope: ScopeKind.Content })
  async upsertVersionLocalization(@Args('data') input: VersionUpdateLocalizationInput) {
    return await this.contentService.upsertVersionLocalization(input);
  }

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
    // include steps: the getContent document requests editedVersion.steps, and
    // editedVersion shares the Version:id cache entry with getContentVersion —
    // returning it without steps normalizes Version.steps to null and wipes the
    // step list from detail's view.
    return this.prisma.version.findUnique({
      where: { id: content.editedVersionId },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
  }
}

/**
 * Field resolvers for Version rows. `updatedByName` resolves the author column
 * to a display name at read time (page-sized lists — a per-row lookup is fine).
 */
@Resolver(() => Version)
export class VersionFieldsResolver {
  constructor(private prisma: PrismaService) {}

  @ResolveField('updatedByName', () => String, { nullable: true })
  async updatedByName(@Parent() version: { updatedByUserId?: string | null }) {
    if (!version.updatedByUserId) {
      return null;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: version.updatedByUserId },
      select: { name: true },
    });
    return user?.name ?? null;
  }
}
