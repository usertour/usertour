import { PaginationArgs } from '@/common/pagination/pagination.args';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AnalyticsGuard } from './analytics.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsIdArgs } from './args/analytics-query.args';
import { AnalyticsOrder } from './dto/analytics-order.input';
import { AnalyticsQuery } from './dto/analytics-query.input';
import { Analytics } from './models/analytics';
import { BizSessionConnection } from './models/analytics-connection.model';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { BizSession } from './models/biz-session';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
@UseGuards(AnalyticsGuard)
export class AnalyticsResolver {
  constructor(private service: AnalyticsService) {}

  @Query(() => Analytics)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async queryContentAnalytics(
    @Args()
    { contentId, startDate = '', endDate = '', timezone }: AnalyticsIdArgs,
  ) {
    return await this.service.queryContentAnalytics(contentId, startDate, endDate, timezone);
  }

  @Query(() => GraphQLJSON)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async queryContentQuestionAnalytics(
    @Args()
    { contentId, startDate = '', endDate = '', timezone }: AnalyticsIdArgs,
  ) {
    return await this.service.queryContentQuestionAnalytics(
      contentId,
      startDate,
      endDate,
      timezone,
    );
  }

  @Query(() => BizSessionConnection)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async queryBizSession(
    @Args() pagination: PaginationArgs,
    @Args('query') query: AnalyticsQuery,
    @Args('orderBy') orderBy: AnalyticsOrder,
  ) {
    return await this.service.queryRecentSessions(query, pagination, orderBy);
  }

  @Mutation(() => Boolean)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteSession(@Args('sessionId') sessionId: string) {
    return !!(await this.service.deleteSession(sessionId));
  }

  @Mutation(() => Boolean)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async endSession(@Args('sessionId') sessionId: string) {
    return !!(await this.service.endSession(sessionId));
  }

  @Query(() => BizSession)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async querySessionDetail(@Args('sessionId') sessionId: string) {
    return await this.service.querySessionDetail(sessionId);
  }

  @Query(() => BizSessionConnection)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async listSessionsDetail(
    @Args() pagination: PaginationArgs,
    @Args('query') query: AnalyticsQuery,
    @Args('orderBy') orderBy: AnalyticsOrder,
  ) {
    return await this.service.listSessionsDetail(query, pagination, orderBy);
  }
}
