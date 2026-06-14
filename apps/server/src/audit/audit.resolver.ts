import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { AuditService } from './audit.service';
import { AuditLogOrder } from './dto/audit-log-order.input';
import { AuditLogQuery } from './dto/audit-log-query.input';
import { AuditLogConnection } from './models/audit-log-connection.model';

/**
 * Read side of the audit log — backs the web admin Activity page. Owner-only
 * (Capability.AuditRead), project-scoped, cursor-paginated. Reading the audit log
 * is itself NOT audited (audit captures writes only).
 */
@Resolver()
@UseGuards(PermissionGuard)
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  @Query(() => AuditLogConnection)
  @RequirePermission({ capability: Capability.AuditRead, scope: ScopeKind.Project })
  async auditLogs(
    @Args('projectId') projectId: string,
    @Args() pagination: PaginationArgs,
    @Args({ name: 'query', type: () => AuditLogQuery, nullable: true }) query: AuditLogQuery,
    @Args({ name: 'orderBy', type: () => AuditLogOrder, nullable: true }) orderBy: AuditLogOrder,
  ) {
    return this.auditService.listAuditLogs(projectId, query, pagination, orderBy);
  }
}
