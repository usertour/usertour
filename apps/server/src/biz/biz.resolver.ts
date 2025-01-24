import { Resolver, Mutation, Args, Query } from "@nestjs/graphql";
import { BizService } from "./biz.service";
import { CreateBizCompanyInput, CreateBizInput } from "./dto/biz.input";
import { BizConnection } from "./models/biz-connection.model";
import { PaginationArgs } from "@/common/pagination/pagination.args";
import { BizQuery } from "./dto/biz-query.input";
import { BizOrder } from "./dto/biz-order.input";
import { Common } from "@/auth/models/common.model";
import { Segment } from "./models/segment.model";
import {
  BizUserOrCompanyIdsInput,
  CreatSegment,
  CreateBizCompanyOnSegment,
  CreateBizUserOnSegment,
  DeleteBizCompanyOnSegment,
  DeleteBizUserOnSegment,
  DeleteSegment,
  ListSegment,
  UpdateSegment,
} from "./dto/segment.input";
import { UseGuards } from "@nestjs/common";
import { BizGuard } from "./biz.guard";
import { RolesScopeEnum, Roles } from "@/common/decorators/roles.decorator";

@Resolver()
@UseGuards(BizGuard)
export class BizResolver {
  constructor(private service: BizService) {}

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async createBizUser(@Args("data") data: CreateBizInput) {
    const ret = await this.service.upsertBizUsers(data);
    return { success: ret };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async createBizCompany(@Args("data") data: CreateBizCompanyInput) {
    const ret = await this.service.upsertBizCompany(data);
    return { success: ret };
  }

  @Query(() => BizConnection)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async queryBizUser(
    @Args() pagination: PaginationArgs,
    @Args("query") query: BizQuery,
    @Args("orderBy") orderBy: BizOrder
  ) {
    return await this.service.queryBizUser(query, pagination, orderBy);
  }

  @Query(() => BizConnection)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async queryBizCompany(
    @Args() pagination: PaginationArgs,
    @Args("query") query: BizQuery,
    @Args("orderBy") orderBy: BizOrder
  ) {
    return await this.service.queryBizCompany(query, pagination, orderBy);
  }

  @Mutation(() => Segment)
  @Roles([RolesScopeEnum.ADMIN])
  async createSegment(@Args("data") data: CreatSegment) {
    return await this.service.creatSegment(data);
  }

  @Mutation(() => Segment)
  @Roles([RolesScopeEnum.ADMIN])
  async updateSegment(@Args("data") data: UpdateSegment) {
    return await this.service.updateSegment(data);
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async deleteSegment(@Args("data") data: DeleteSegment) {
    const [, , r3] = await this.service.deleteSegment(data);
    return { success: r3.id ? true : false };
  }

  @Query(() => [Segment])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async listSegment(@Args() { environmentId }: ListSegment) {
    return await this.service.listSegment(environmentId);
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async createBizUserOnSegment(@Args("data") data: CreateBizUserOnSegment) {
    const ret = await this.service.createBizUserOnSegment(data.userOnSegment);
    return { success: ret.count > 0 ? true : false, count: ret.count };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async deleteBizUserOnSegment(@Args("data") data: DeleteBizUserOnSegment) {
    const ret = await this.service.deleteBizUserOnSegment(data);
    return { success: ret.count > 0 ? true : false, count: ret.count };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async deleteBizUser(@Args("data") data: BizUserOrCompanyIdsInput) {
    const [, , r3] = await this.service.deleteBizUser(
      data.ids,
      data.environmentId
    );
    return { success: r3.count > 0 ? true : false, count: r3.count };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async deleteBizCompany(@Args("data") data: BizUserOrCompanyIdsInput) {
    const ret = await this.service.deleteBizCompany(
      data.ids,
      data.environmentId
    );
    return { success: ret.count > 0 ? true : false, count: ret.count };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async createBizCompanyOnSegment(
    @Args("data") data: CreateBizCompanyOnSegment
  ) {
    const ret = await this.service.createBizCompanyOnSegment(
      data.companyOnSegment
    );
    return { success: ret.count > 0 ? true : false, count: ret.count };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN])
  async deleteBizCompanyOnSegment(
    @Args("data") data: DeleteBizCompanyOnSegment
  ) {
    const ret = await this.service.deleteBizCompanyOnSegment(data);
    return { success: ret.count > 0 ? true : false, count: ret.count };
  }
}
