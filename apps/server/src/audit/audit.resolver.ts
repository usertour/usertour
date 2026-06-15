import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { FeatureRequiresLicenseError } from '@/common/errors/errors';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { ProjectsService } from '@/projects/projects.service';
import { AuditService } from './audit.service';
import { AuditLogOrder } from './dto/audit-log-order.input';
import { AuditLogQuery } from './dto/audit-log-query.input';
import { AuditLogConnection } from './models/audit-log-connection.model';

/**
 * Read side of the audit log — backs the web admin Activity page. Owner-only
 * (Capability.AuditRead), project-scoped, cursor-paginated. Reading the audit log
 * is itself NOT audited (audit captures writes only).
 *
 * Viewing is a paid feature (cloud Business+, or self-host license) — capture is
 * always-on, the gate is here on the read. The web hides/locks the page too; this
 * is the independent server enforcement (don't trust the client).
 */
@Resolver()
@UseGuards(PermissionGuard)
export class AuditResolver {
  constructor(
    private readonly auditService: AuditService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Query(() => AuditLogConnection)
  @RequirePermission({ capability: Capability.AuditRead, scope: ScopeKind.Project })
  async auditLogs(
    @Args('projectId') projectId: string,
    @Args() pagination: PaginationArgs,
    @Args({ name: 'query', type: () => AuditLogQuery, nullable: true }) query: AuditLogQuery,
    @Args({ name: 'orderBy', type: () => AuditLogOrder, nullable: true }) orderBy: AuditLogOrder,
  ) {
    const config = await this.projectsService.getProjectConfig(projectId);
    if (!config.auditLogs) {
      throw new FeatureRequiresLicenseError();
    }
    // Read-window by plan: -1 = unlimited (no cutoff), N = last N days. Rows are
    // never deleted; lower tiers just can't read past the window.
    const cutoff =
      config.auditLogRetentionDays > 0
        ? new Date(Date.now() - config.auditLogRetentionDays * 24 * 60 * 60 * 1000)
        : undefined;
    return this.auditService.listAuditLogs(projectId, query, pagination, orderBy, cutoff);
  }
}
