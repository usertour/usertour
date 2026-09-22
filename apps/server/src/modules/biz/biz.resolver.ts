import { CommonDTO } from '@/modules/auth/dtos/common.dto';
import { AuditWeb } from '@/modules/audit/decorators/audit.decorator';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { RequirePermission } from '@/modules/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/modules/auth/permission/scope-resolver.registry';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { BizService } from './services/biz.service';
import { BizOrder } from './dtos/biz-order.input';
import { BizQuery } from './dtos/biz-query.input';
import { BizEventQuery } from './dtos/biz-event-query.input';
import { BizUserOrCompanyIdsInput } from './dtos/biz-user-or-company-ids.input';
import { CreateBizCompanyOnSegment } from './dtos/create-biz-company-on-segment.input';
import { CreateBizUserOnSegment } from './dtos/create-biz-user-on-segment.input';
import { CreatSegment } from './dtos/create-segment.input';
import { DeleteBizCompanyOnSegment } from './dtos/delete-biz-company-on-segment.input';
import { DeleteBizUserOnSegment } from './dtos/delete-biz-user-on-segment.input';
import { DeleteSegment } from './dtos/delete-segment.input';
import { ListSegment } from './dtos/list-segment.input';
import { UpdateSegment } from './dtos/update-segment.input';
import { BizConnectionDTO } from './dtos/biz-connection.dto';
import { BizUserConnectionDTO } from './dtos/biz-user-connection.dto';
import { BizEventConnectionDTO } from './dtos/biz-event-connection.dto';
import { SegmentDTO } from './dtos/segment.dto';

@Resolver()
@UseGuards(PermissionGuard)
export class BizResolver {
  constructor(private service: BizService) {}

  @Query(() => BizUserConnectionDTO)
  @RequirePermission({ capability: Capability.UserRead, scope: ScopeKind.Environment })
  async queryBizUser(
    @Args() pagination: PaginationArgs,
    @Args('query') query: BizQuery,
    @Args('orderBy') orderBy: BizOrder,
  ) {
    return await this.service.queryBizUser(query, pagination, orderBy);
  }

  @Query(() => BizConnectionDTO)
  @RequirePermission({ capability: Capability.CompanyRead, scope: ScopeKind.Environment })
  async queryBizCompany(
    @Args() pagination: PaginationArgs,
    @Args('query') query: BizQuery,
    @Args('orderBy') orderBy: BizOrder,
  ) {
    return await this.service.queryBizCompany(query, pagination, orderBy);
  }

  @Query(() => BizEventConnectionDTO)
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

  @Query(() => BizEventConnectionDTO)
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

  @Mutation(() => SegmentDTO)
  @RequirePermission({ capability: Capability.SegmentCreate, scope: ScopeKind.Environment })
  @AuditWeb({
    action: 'create',
    resourceType: 'segment',
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
  })
  async createSegment(@Args('data') data: CreatSegment) {
    return await this.service.creatSegment(data);
  }

  @Mutation(() => SegmentDTO)
  @RequirePermission({ capability: Capability.SegmentUpdate, scope: ScopeKind.Segment })
  @AuditWeb({
    action: 'update',
    resourceType: 'segment',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async updateSegment(@Args('data') data: UpdateSegment) {
    return await this.service.updateSegment(data);
  }

  @Mutation(() => CommonDTO)
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

  @Query(() => [SegmentDTO])
  @RequirePermission({ capability: Capability.SegmentRead, scope: ScopeKind.Environment })
  async listSegment(@Args() { environmentId }: ListSegment) {
    return await this.service.listSegment(environmentId);
  }

  @Mutation(() => CommonDTO)
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

  @Mutation(() => CommonDTO)
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

  @Mutation(() => CommonDTO)
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

  @Mutation(() => CommonDTO)
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

  @Mutation(() => CommonDTO)
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

  @Mutation(() => CommonDTO)
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
