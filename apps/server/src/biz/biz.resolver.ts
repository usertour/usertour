import { Common } from '@/auth/models/common.model';
import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BizGuard } from './biz.guard';
import { BizService } from './biz.service';
import { BizOrder } from './dto/biz-order.input';
import { BizQuery } from './dto/biz-query.input';
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
} from './dto/segment.input';
import { BizConnection } from './models/biz-connection.model';
import { Segment } from './models/segment.model';

@Resolver()
@UseGuards(BizGuard)
export class BizResolver {
  constructor(private service: BizService) {}

  @Query(() => BizConnection)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async queryBizUser(
    @Args() pagination: PaginationArgs,
    @Args('query') query: BizQuery,
    @Args('orderBy') orderBy: BizOrder,
  ) {
    return await this.service.queryBizUser(query, pagination, orderBy);
  }

  @Query(() => BizConnection)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async queryBizCompany(
    @Args() pagination: PaginationArgs,
    @Args('query') query: BizQuery,
    @Args('orderBy') orderBy: BizOrder,
  ) {
    return await this.service.queryBizCompany(query, pagination, orderBy);
  }

  @Mutation(() => Segment)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async createSegment(@Args('data') data: CreatSegment) {
    return await this.service.creatSegment(data);
  }

  @Mutation(() => Segment)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async updateSegment(@Args('data') data: UpdateSegment) {
    return await this.service.updateSegment(data);
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteSegment(@Args('data') data: DeleteSegment) {
    const [, , r3] = await this.service.deleteSegment(data);
    return { success: !!r3.id };
  }

  @Query(() => [Segment])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async listSegment(@Args() { environmentId }: ListSegment) {
    return await this.service.listSegment(environmentId);
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async createBizUserOnSegment(@Args('data') data: CreateBizUserOnSegment) {
    const ret = await this.service.createBizUserOnSegment(data.userOnSegment);
    return { success: ret.count > 0, count: ret.count };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteBizUserOnSegment(@Args('data') data: DeleteBizUserOnSegment) {
    const ret = await this.service.deleteBizUserOnSegment(data);
    return { success: ret.count > 0, count: ret.count };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteBizUser(@Args('data') data: BizUserOrCompanyIdsInput) {
    const result = await this.service.deleteBizUser(data.ids, data.environmentId);
    return {
      success: result?.count > 0,
      count: result?.count || 0,
    };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteBizCompany(@Args('data') data: BizUserOrCompanyIdsInput) {
    const ret = await this.service.deleteBizCompany(data.ids, data.environmentId);
    return { success: ret.count > 0, count: ret.count };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async createBizCompanyOnSegment(@Args('data') data: CreateBizCompanyOnSegment) {
    const ret = await this.service.createBizCompanyOnSegment(data.companyOnSegment);
    return { success: ret.count > 0, count: ret.count };
  }

  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteBizCompanyOnSegment(@Args('data') data: DeleteBizCompanyOnSegment) {
    const ret = await this.service.deleteBizCompanyOnSegment(data);
    return { success: ret.count > 0, count: ret.count };
  }
}
