import { Common } from '@/auth/models/common.model';
import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PrismaService } from 'nestjs-prisma';
import { ContentIdArgs } from './args/content-id.args';
import { VersionIdArgs } from './args/version-id.args';
import { ContentsGuard } from './contents.guard';
import { ContentsService } from './contents.service';
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
import { VersionOnLocalization } from './models/version-on-localization.model';
import { Version } from './models/version.model';

@Resolver(() => Content)
@UseGuards(ContentsGuard)
export class ContentsResolver {
  constructor(
    private contentsService: ContentsService,
    private prisma: PrismaService,
  ) {}

  @Mutation(() => Content)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async createContent(@Args('data') data: ContentInput) {
    return await this.contentsService.createContent(data);
  }

  @Mutation(() => Content)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async updateContent(@Args('data') data: ContentUpdateInput) {
    return await this.contentsService.updateContent(data.contentId, data.content);
  }

  @Mutation(() => Content)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async duplicateContent(@Args('data') data: ContentDuplicateInput) {
    return await this.contentsService.duplicateContent(
      data.contentId,
      data.name,
      data.targetEnvironmentId,
    );
  }

  @Query(() => Content)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async getContent(@Args() { contentId }: ContentIdArgs) {
    return await this.contentsService.getContentById(contentId);
  }

  @Mutation(() => Version)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async createContentVersion(@Args('data') data: ContentVersionInput) {
    return await this.contentsService.createContentVersion(data);
  }

  @Query(() => Version)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async getContentVersion(@Args() { versionId }: VersionIdArgs) {
    return await this.contentsService.getContentVersionById(versionId);
  }

  @Mutation(() => Version)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async updateContentVersion(@Args('data') input: VersionUpdateInput) {
    return await this.contentsService.updateContentVersion(input);
  }

  @Mutation(() => Version)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async restoreContentVersion(@Args('data') { versionId }: VersionIdInput) {
    return await this.contentsService.restoreContentVersion(versionId);
  }

  @Mutation(() => Version)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async publishedContentVersion(@Args('data') { versionId }: VersionIdInput) {
    return await this.contentsService.publishedContentVersion(versionId);
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async unpublishedContentVersion(@Args('data') { contentId }: ContentIdInput) {
    await this.contentsService.unpublishedContentVersion(contentId);
    return { success: true };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteContent(@Args('data') { contentId }: ContentIdInput) {
    await this.contentsService.deleteContent(contentId);
    return { success: true };
  }

  @Query(() => [Version])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async listContentVersions(@Args() { contentId }: ContentIdArgs) {
    return await this.contentsService.listContentVersions(contentId);
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async addContentSteps(@Args('data') contentStepsInput: ContentStepsInput) {
    await this.contentsService.addContentSteps(contentStepsInput);
    return { success: true };
  }

  @Mutation(() => Step)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async addContentStep(@Args('data') step: CreateStepInput) {
    return await this.contentsService.addContentStep(step);
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async updateContentStep(@Args('stepId') stepId: string, @Args('data') step: UpdateStepInput) {
    await this.contentsService.updateContentStep(stepId, step);
    return { success: true };
  }

  @Query(() => [VersionOnLocalization])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async findManyVersionLocations(@Args() { versionId }: VersionIdArgs) {
    return await this.contentsService.findManyVersionLocations(versionId);
  }

  @Mutation(() => VersionOnLocalization)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async updateVersionLocationData(@Args('data') input: VersionUpdateLocalizationInput) {
    return await this.contentsService.upsertVersionLocationData(input);
  }

  // @Mutation(() => Common)
  // async updateStepsSequence(
  //   @UserEntity() user: User,
  //   @Args("versionId") versionId: string,
  //   @Args("data") stepIds: [string]
  // ) {
  //   await this.contentsService.updateStepsSequence(user.id, versionId, stepIds);
  //   return { success: true };
  // }

  @Query(() => ContentConnection)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async queryContents(
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
    const conditions = {
      ...query,
      deleted: false,
    } as any;
    if (conditions.name) {
      conditions.name = { contains: conditions.name };
    }
    try {
      return await findManyCursorConnection(
        (args) =>
          this.prisma.content.findMany({
            // include: { steps: { select: { id: true } } },
            where: {
              ...conditions,
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
}
