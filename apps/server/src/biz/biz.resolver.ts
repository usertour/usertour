import { Common } from '@/auth/models/common.model';
import { AuditWeb } from '@/audit/audit.decorator';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { BizService } from './biz.service';
import { BizOrder } from './dto/biz-order.input';
import { BizQuery } from './dto/biz-query.input';
import { BizEventQuery } from './dto/biz-event-query.input';
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
import { BizConnection, BizUserConnection } from './models/biz-connection.model';
import { BizEventConnection } from './models/biz-event-connection.model';
import { Segment } from './models/segment.model';

@Resolver()
@UseGuards(PermissionGuard)
export class BizResolver {
  constructor(private service: BizService) {}

  @Query(() => BizUserConnection)
  @RequirePermission({ capability: Capability.UserRead, scope: ScopeKind.Environment })
  async queryBizUser(
    @Args() pagination: PaginationArgs,
    @Args('query') query: BizQuery,
    @Args('orderBy') orderBy: BizOrder,
  ) {
    return await this.service.queryBizUser(query, pagination, orderBy);
  }

  @Query(() => BizConnection)
  @RequirePermission({ capability: Capability.CompanyRead, scope: ScopeKind.Environment })
  async queryBizCompany(
    @Args() pagination: PaginationArgs,
    @Args('query') query: BizQuery,
    @Args('orderBy') orderBy: BizOrder,
  ) {
    return await this.service.queryBizCompany(query, pagination, orderBy);
  }

  @Query(() => BizEventConnection)
  @RequirePermission({ capability: Capability.UserRead, scope: ScopeKind.Environment })
  async queryBizUserEvents(
    @Args() pagination: PaginationArgs,
    @Args('query') query: BizEventQuery,
    @Args('orderBy') orderBy: BizOrder,
  ) {
    return await this.service.queryBizUserEvents(
      { environmentId: query.environmentId, userId: query.userId! },
      pagination,
      orderBy,
    );
  }

  @Query(() => BizEventConnection)
  @RequirePermission({ capability: Capability.CompanyRead, scope: ScopeKind.Environment })
  async queryBizCompanyEvents(
    @Args() pagination: PaginationArgs,
    @Args('query') query: BizEventQuery,
    @Args('orderBy') orderBy: BizOrder,
  ) {
    return await this.service.queryBizCompanyEvents(
      { environmentId: query.environmentId, companyId: query.companyId! },
      pagination,
      orderBy,
    );
  }

  @Mutation(() => Segment)
  @RequirePermission({ capability: Capability.SegmentCreate, scope: ScopeKind.Environment })
  @AuditWeb({
    action: 'create',
    resourceType: 'segment',
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
  })
  async createSegment(@Args('data') data: CreatSegment) {
    return await this.service.creatSegment(data);
  }

  @Mutation(() => Segment)
  @RequirePermission({ capability: Capability.SegmentUpdate, scope: ScopeKind.Segment })
  @AuditWeb({
    action: 'update',
    resourceType: 'segment',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async updateSegment(@Args('data') data: UpdateSegment) {
    return await this.service.updateSegment(data);
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.SegmentDelete, scope: ScopeKind.Segment })
  @AuditWeb({
    action: 'delete',
    resourceType: 'segment',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async deleteSegment(@Args('data') data: DeleteSegment) {
    const [, , r3] = await this.service.deleteSegment(data);
    return { success: !!r3.id };
  }

  @Query(() => [Segment])
  @RequirePermission({ capability: Capability.SegmentRead, scope: ScopeKind.Environment })
  async listSegment(@Args() { environmentId }: ListSegment) {
    return await this.service.listSegment(environmentId);
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.SegmentUpdate, scope: ScopeKind.Segment })
  // Membership changes what the segment TARGETS — recorded on the segment, one
  // entry per call (a call = one add action, possibly many members).
  @AuditWeb({
    action: 'update',
    resourceType: 'segment',
    resourceId: (a) =>
      String(
        (a.data as { userOnSegment?: { segmentId?: string }[] })?.userOnSegment?.[0]?.segmentId ??
          '',
      ),
    capture: (a, r) => {
      const items =
        (a.data as { userOnSegment?: { segmentId?: string; bizUserId?: string }[] })
          ?.userOnSegment ?? [];
      return {
        segmentId: items[0]?.segmentId,
        addedBizUserIds: items.map((i) => i.bizUserId),
        count: (r as { count?: number })?.count ?? items.length,
      };
    },
  })
  async createBizUserOnSegment(@Args('data') data: CreateBizUserOnSegment) {
    const ret = await this.service.createBizUserOnSegment(data.userOnSegment);
    return { success: ret.count > 0, count: ret.count };
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.SegmentUpdate, scope: ScopeKind.Segment })
  @AuditWeb({
    action: 'update',
    resourceType: 'segment',
    resourceId: (a) => String((a.data as { segmentId?: string })?.segmentId ?? ''),
    capture: (a, r) => {
      const d = a.data as { segmentId?: string; bizUserIds?: string[] };
      return {
        segmentId: d?.segmentId,
        removedBizUserIds: d?.bizUserIds ?? [],
        count: (r as { count?: number })?.count ?? d?.bizUserIds?.length ?? 0,
      };
    },
  })
  async deleteBizUserOnSegment(@Args('data') data: DeleteBizUserOnSegment) {
    const ret = await this.service.deleteBizUserOnSegment(data);
    return { success: ret.count > 0, count: ret.count };
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.UserDelete, scope: ScopeKind.Environment })
  // Irreversible bulk hard delete — the ids live in the args (the result is only a
  // count), so capture them; one entry per call.
  @AuditWeb({
    action: 'delete',
    resourceType: 'user',
    resourceId: (a) => {
      const ids = (a.data as { ids?: string[] })?.ids ?? [];
      return ids.length === 1 ? ids[0] : `${ids.length} users`;
    },
    environmentId: (a) => (a.data as { environmentId?: string })?.environmentId,
    capture: (a, r) => {
      const d = a.data as { ids?: string[]; environmentId?: string };
      return {
        deletedBizUserIds: d?.ids ?? [],
        count: (r as { count?: number })?.count ?? d?.ids?.length ?? 0,
      };
    },
  })
  async deleteBizUser(@Args('data') data: BizUserOrCompanyIdsInput) {
    const result = await this.service.deleteBizUser(data.ids, data.environmentId);
    return {
      success: result?.count > 0,
      count: result?.count || 0,
    };
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.CompanyDelete, scope: ScopeKind.Environment })
  @AuditWeb({
    action: 'delete',
    resourceType: 'company',
    resourceId: (a) => {
      const ids = (a.data as { ids?: string[] })?.ids ?? [];
      return ids.length === 1 ? ids[0] : `${ids.length} companies`;
    },
    environmentId: (a) => (a.data as { environmentId?: string })?.environmentId,
    capture: (a, r) => {
      const d = a.data as { ids?: string[]; environmentId?: string };
      return {
        deletedBizCompanyIds: d?.ids ?? [],
        count: (r as { count?: number })?.count ?? d?.ids?.length ?? 0,
      };
    },
  })
  async deleteBizCompany(@Args('data') data: BizUserOrCompanyIdsInput) {
    const ret = await this.service.deleteBizCompany(data.ids, data.environmentId);
    return { success: ret.count > 0, count: ret.count };
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.SegmentUpdate, scope: ScopeKind.Segment })
  @AuditWeb({
    action: 'update',
    resourceType: 'segment',
    resourceId: (a) =>
      String(
        (a.data as { companyOnSegment?: { segmentId?: string }[] })?.companyOnSegment?.[0]
          ?.segmentId ?? '',
      ),
    capture: (a, r) => {
      const items =
        (a.data as { companyOnSegment?: { segmentId?: string; bizCompanyId?: string }[] })
          ?.companyOnSegment ?? [];
      return {
        segmentId: items[0]?.segmentId,
        addedBizCompanyIds: items.map((i) => i.bizCompanyId),
        count: (r as { count?: number })?.count ?? items.length,
      };
    },
  })
  async createBizCompanyOnSegment(@Args('data') data: CreateBizCompanyOnSegment) {
    const ret = await this.service.createBizCompanyOnSegment(data.companyOnSegment);
    return { success: ret.count > 0, count: ret.count };
  }

  @Mutation(() => Common)
  @RequirePermission({ capability: Capability.SegmentUpdate, scope: ScopeKind.Segment })
  @AuditWeb({
    action: 'update',
    resourceType: 'segment',
    resourceId: (a) => String((a.data as { segmentId?: string })?.segmentId ?? ''),
    capture: (a, r) => {
      const d = a.data as { segmentId?: string; bizCompanyIds?: string[] };
      return {
        segmentId: d?.segmentId,
        removedBizCompanyIds: d?.bizCompanyIds ?? [],
        count: (r as { count?: number })?.count ?? d?.bizCompanyIds?.length ?? 0,
      };
    },
  })
  async deleteBizCompanyOnSegment(@Args('data') data: DeleteBizCompanyOnSegment) {
    const ret = await this.service.deleteBizCompanyOnSegment(data);
    return { success: ret.count > 0, count: ret.count };
  }
}
