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
import { AuditWeb } from '@/audit/audit.decorator';
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
  // The same operation is audited on v1/v2/MCP (delete_session); the web surface
  // must not be the one path that leaves no trace of an irreversible delete.
  @AuditWeb({
    action: 'delete',
    resourceType: 'session',
    resourceId: (a) => String(a.sessionId),
  })
  async deleteSession(@Args('sessionId') sessionId: string) {
    return !!(await this.service.deleteSession(sessionId));
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.SessionManage, scope: ScopeKind.Session })
  @AuditWeb({
    action: 'update',
    resourceType: 'session',
    resourceId: (a) => String(a.sessionId),
  })
  async endSession(@Args('sessionId') sessionId: string) {
    return !!(await this.service.endSession(sessionId));
  }

  // Nullable: the underlying service filters soft-deleted sessions, so a
  // sessionId that exists but is `deleted=true` resolves to null. Same shape
  // as content.getContent — declaring `BizSession!` made Apollo surface this
  // as a generic 500 ISE for any authorized caller deep-linking into a
  // soft-deleted session. The guard already authorizes only project members,
  // so returning null leaks nothing.
  @Query(() => BizSession, { nullable: true })
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
