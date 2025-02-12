import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { UserEntity } from '@/common/decorators/user.decorator';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { User } from '@/users/models/user.model';
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AnalyticsGuard } from './analytics.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsIdArgs } from './args/analytics-query.args';
import { AnalyticsOrder } from './dto/analytics-order.input';
import { AnalyticsQuery } from './dto/analytics-query.input';
import { Analytics } from './models/analytics';
import { BizSessionConnection } from './models/analytics-connection.model';

@Resolver()
@UseGuards(AnalyticsGuard)
export class AnalyticsResolver {
  constructor(private service: AnalyticsService) {}

  @Query(() => Analytics)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async queryContentAnalytics(
    @UserEntity() user: User,
    @Args()
    { contentId, startDate = '', endDate = '', timezone }: AnalyticsIdArgs,
  ) {
    return await this.service.queryContentAnalytics(contentId, startDate, endDate, timezone, user);
  }

  @Query(() => BizSessionConnection)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async queryBizSession(
    @UserEntity() user: User,
    @Args() pagination: PaginationArgs,
    @Args('query') query: AnalyticsQuery,
    @Args('orderBy') orderBy: AnalyticsOrder,
  ) {
    return await this.service.queryRecentSessions(query, pagination, orderBy, user);
  }
}
