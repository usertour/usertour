import { PrismaService } from "nestjs-prisma";
import {
  Resolver,
  Query,
  Parent,
  Mutation,
  Args,
  ResolveField,
} from "@nestjs/graphql";
import { BadRequestException, UseGuards } from "@nestjs/common";
import { UserEntity } from "@/common/decorators/user.decorator";
import { ContentsService } from "./contents.service";
import { Content } from "./models/content.model";
import { User } from "@/users/models/user.model";
import { ContentInput, ContentVersionInput } from "./dto/content.input";
import { PaginationArgs } from "@/common/pagination/pagination.args";
import { findManyCursorConnection } from "@devoxa/prisma-relay-cursor-connection";
import { ContentConnection } from "./models/content-connection.model";
import { ContentOrder } from "./dto/content-order.input";
import { ContentStepsInput } from "./dto/content-steps.input";
import {
  ContentDuplicateInput,
  ContentIdInput,
  ContentUpdateInput,
} from "./dto/content-update.input";
import { ContentIdArgs } from "./args/content-id.args";
import { Common } from "@/auth/models/common.model";
import { ContentQuery } from "./dto/content-query.input";
import { Version } from "./models/version.model";
import { VersionIdArgs } from "./args/version-id.args";
import { VersionUpdateInput } from "./dto/version-update.input";
import {
  VersionIdInput,
  VersionUpdateLocalizationInput,
} from "./dto/version.input";
import { CreateStepInput, UpdateStepInput } from "./dto/step.input";
import { Step } from "./models/step.model";
import { ContentsGuard } from "./contents.guard";
import { RolesScopeEnum, Roles } from "@/common/decorators/roles.decorator";
import { VersionOnLocalization } from "./models/version-on-localization.model";

@Resolver(() => Content)
@UseGuards(ContentsGuard)
export class ContentsResolver {
  constructor(
    private contentsService: ContentsService,
    private prisma: PrismaService
  ) {}

  @Mutation(() => Content)
  @Roles([RolesScopeEnum.ADMIN])
  async createContent(@Args("data") data: ContentInput) {
    return await this.contentsService.createContent(data);
  }

  @Mutation(() => Content)
  @Roles([RolesScopeEnum.ADMIN])
  async updateContent(@Args("data") data: ContentUpdateInput) {
    return await this.contentsService.updateContent(
      data.contentId,
      data.content
    );
  }

  @Mutation(() => Content)
  @Roles([RolesScopeEnum.ADMIN])
  async duplicateContent(@Args("data") data: ContentDuplicateInput) {
    return await this.contentsService.duplicateContent(
      data.contentId,
      data.name
    );
  }

  @Query(() => Content)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async getContent(@Args() { contentId }: ContentIdArgs) {
    return await this.contentsService.getContentById(contentId);
  }

  @Mutation(() => Version)
  @Roles([RolesScopeEnum.ADMIN])
  async createContentVersion(@Args("data") data: ContentVersionInput) {
    return await this.contentsService.createContentVersion(data);
  }

  @Query(() => Version)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async getContentVersion(@Args() { versionId }: VersionIdArgs) {
    return await this.contentsService.getContentVersionById(versionId);
  }

  @Mutation(() => Version)
  @Roles([RolesScopeEnum.ADMIN])
  async updateContentVersion(@Args("data") input: VersionUpdateInput) {
    return await this.contentsService.updateContentVersion(input);
  }

  @Mutation(() => Version)
  @Roles([RolesScopeEnum.ADMIN])
  async restoreContentVersion(@Args("data") { versionId }: VersionIdInput) {
    return await this.contentsService.restoreContentVersion(versionId);
  }

  @Mutation(() => Version)
  @Roles([RolesScopeEnum.ADMIN])
  async publishedContentVersion(@Args("data") { versionId }: VersionIdInput) {
    return await this.contentsService.publishedContentVersion(versionId);
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async unpublishedContentVersion(@Args("data") { contentId }: ContentIdInput) {
    await this.contentsService.unpublishedContentVersion(contentId);
    return { success: true };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async deleteContent(@Args("data") { contentId }: ContentIdInput) {
    await this.contentsService.deleteContent(contentId);
    return { success: true };
  }

  @Query(() => [Version])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async listContentVersions(@Args() { contentId }: ContentIdArgs) {
    return await this.contentsService.listContentVersions(contentId);
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async addContentSteps(@Args("data") contentStepsInput: ContentStepsInput) {
    await this.contentsService.addContentSteps(contentStepsInput);
    return { success: true };
  }

  @Mutation(() => Step)
  @Roles([RolesScopeEnum.ADMIN])
  async addContentStep(@Args("data") step: CreateStepInput) {
    return await this.contentsService.addContentStep(step);
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async updateContentStep(
    @Args("stepId") stepId: string,
    @Args("data") step: UpdateStepInput
  ) {
    await this.contentsService.updateContentStep(stepId, step);
    return { success: true };
  }

  @Query(() => [VersionOnLocalization])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async findManyVersionLocations(@Args() { versionId }: VersionIdArgs) {
    return await this.contentsService.findManyVersionLocations(versionId);
  }

  @Mutation(() => VersionOnLocalization)
  @Roles([RolesScopeEnum.ADMIN])
  async updateVersionLocationData(
    @Args("data") input: VersionUpdateLocalizationInput
  ) {
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
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async queryContents(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: "query", type: () => ContentQuery, nullable: true })
    query: ContentQuery,
    @Args({
      name: "orderBy",
      type: () => ContentOrder,
      nullable: true,
    })
    orderBy: ContentOrder
  ) {
    const conditions = {
      ...query,
      deleted: false,
    } as any;
    if (conditions.name) {
      conditions.name = { contains: conditions.name };
    }
    try {
      const a = await findManyCursorConnection(
        (args) =>
          this.prisma.content.findMany({
            // include: { steps: { select: { id: true } } },
            where: {
              ...conditions,
            },
            orderBy: orderBy
              ? { [orderBy.field]: orderBy.direction }
              : undefined,
            ...args,
          }),
        () =>
          this.prisma.content.count({
            where: {
              ...conditions,
            },
          }),
        { first, last, before, after }
      );
      console.log(a);
      return a;
    } catch (error) {
      console.log(error);
    }
  }

  @ResolveField("steps")
  steps(@Parent() content: Content) {
    return this.prisma.step.findMany({
      where: { versionId: content.editedVersionId },
      orderBy: { sequence: "asc" },
    });
  }
}
