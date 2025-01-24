import { Resolver, Mutation, Args, Query } from "@nestjs/graphql";
import { UserEntity } from "@/common/decorators/user.decorator";
import { AnalyticsService } from "./analytics.service";
import { User } from "@/users/models/user.model";
import { Analytics } from "./models/analytics";
import { BizSessionConnection } from "./models/analytics-connection.model";
import { PaginationArgs } from "@/common/pagination/pagination.args";
import { AnalyticsQuery } from "./dto/analytics-query.input";
import { AnalyticsOrder } from "./dto/analytics-order.input";
import { AnalyticsIdArgs } from "./args/analytics-query.args";
import { UseGuards } from "@nestjs/common";
import { AnalyticsGuard } from "./analytics.guard";
import { RolesScopeEnum, Roles } from "@/common/decorators/roles.decorator";

@Resolver()
@UseGuards(AnalyticsGuard)
export class AnalyticsResolver {
  constructor(private service: AnalyticsService) {}

  @Query(() => Analytics)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async queryContentAnalytics(
    @UserEntity() user: User,
    @Args()
    { contentId, startDate = "", endDate = "", timezone }: AnalyticsIdArgs
  ) {
    return await this.service.queryContentAnalytics(
      contentId,
      startDate,
      endDate,
      timezone,
      user
    );
  }

  @Query(() => BizSessionConnection)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async queryBizSession(
    @UserEntity() user: User,
    @Args() pagination: PaginationArgs,
    @Args("query") query: AnalyticsQuery,
    @Args("orderBy") orderBy: AnalyticsOrder
  ) {
    return await this.service.queryRecentSessions(
      query,
      pagination,
      orderBy,
      user
    );
  }
}
