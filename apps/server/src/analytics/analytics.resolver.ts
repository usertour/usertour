import { PaginationArgs } from '@/common/pagination/pagination.args';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AnalyticsService } from './analytics.service';
import { AnalyticsIdArgs } from './args/analytics-query.args';
import { AnalyticsOrder } from './dto/analytics-order.input';
import { AnalyticsQuery } from './dto/analytics-query.input';
import { SessionQuery } from './dto/session-query.input';
import { TooltipTargetMissingQuery } from './dto/tooltip-target-missing-query.input';
import { Analytics } from './models/analytics';
import { BizSessionConnection, TrackerUserConnection } from './models/analytics-connection.model';
import { TooltipTargetMissingResponse } from './models/tooltip-target-missing-response';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { Capability } from '@usertour/types';
import { BizSession } from './models/biz-session';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
@UseGuards(PermissionGuard)
export class AnalyticsResolver {
  constructor(private service: AnalyticsService) {}

  @Query(() => Analytics)
  @RequirePermission({ capability: Capability.AnalyticsRead, scope: ScopeKind.Content })
  async queryContentAnalytics(
    @Args()
    { contentId, startDate = '', endDate = '', timezone, environmentId }: AnalyticsIdArgs,
  ) {
    return await this.service.queryContentAnalytics(
      environmentId,
      contentId,
      startDate,
      endDate,
      timezone,
    );
  }

  @Query(() => GraphQLJSON)
  @RequirePermission({ capability: Capability.AnalyticsRead, scope: ScopeKind.Content })
  async queryContentQuestionAnalytics(
    @Args()
    { environmentId, contentId, startDate = '', endDate = '', timezone }: AnalyticsIdArgs,
  ) {
    return await this.service.queryContentQuestionAnalytics(
      environmentId,
      contentId,
      startDate,
      endDate,
      timezone,
    );
  }

  @Query(() => BizSessionConnection)
  @RequirePermission({ capability: Capability.AnalyticsRead, scope: ScopeKind.Environment })
  async queryBizSession(
    @Args() pagination: PaginationArgs,
    @Args('query') query: AnalyticsQuery,
    @Args('orderBy') orderBy: AnalyticsOrder,
  ) {
    return await this.service.queryRecentSessions(query, pagination, orderBy);
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.SessionManage, scope: ScopeKind.Session })
  async deleteSession(@Args('sessionId') sessionId: string) {
    return !!(await this.service.deleteSession(sessionId));
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.SessionManage, scope: ScopeKind.Session })
  async endSession(@Args('sessionId') sessionId: string) {
    return !!(await this.service.endSession(sessionId));
  }

  @Query(() => BizSession)
  @RequirePermission({ capability: Capability.AnalyticsRead, scope: ScopeKind.Session })
  async querySessionDetail(@Args('sessionId') sessionId: string) {
    return await this.service.querySessionDetail(sessionId);
  }

  @Query(() => BizSessionConnection)
  @RequirePermission({ capability: Capability.AnalyticsRead, scope: ScopeKind.Environment })
  async listSessionsDetail(
    @Args() pagination: PaginationArgs,
    @Args('query') query: AnalyticsQuery,
    @Args('orderBy') orderBy: AnalyticsOrder,
  ) {
    return await this.service.listSessionsDetail(query, pagination, orderBy);
  }

  @Query(() => BizSessionConnection)
  @RequirePermission({ capability: Capability.AnalyticsRead, scope: ScopeKind.Environment })
  async querySessionsByExternalId(
    @Args() pagination: PaginationArgs,
    @Args('query') query: SessionQuery,
    @Args('orderBy') orderBy: AnalyticsOrder,
  ) {
    return await this.service.querySessionsByExternalId(query, pagination, orderBy);
  }

  @Query(() => TooltipTargetMissingResponse)
  @RequirePermission({ capability: Capability.AnalyticsRead, scope: ScopeKind.Environment })
  async queryTooltipTargetMissingSessions(
    @Args() pagination: PaginationArgs,
    @Args('query') query: TooltipTargetMissingQuery,
    @Args('orderBy') orderBy: AnalyticsOrder,
  ) {
    return await this.service.queryTooltipTargetMissingSessions(query, pagination, orderBy);
  }

  @Query(() => TrackerUserConnection)
  @RequirePermission({ capability: Capability.AnalyticsRead, scope: ScopeKind.Environment })
  async queryTrackerUsers(
    @Args() pagination: PaginationArgs,
    @Args('query') query: AnalyticsQuery,
    @Args('orderBy') orderBy: AnalyticsOrder,
  ) {
    return await this.service.queryTrackerUsers(query, pagination, orderBy);
  }
}
