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
    // Read-window by plan, tri-state: -1 = unlimited (no cutoff), 0 = none, N =
    // last N days. Rows are never deleted; the window just gates reads. `0` must
    // read NOTHING — a far-future cutoff excludes every row (the listAuditLogs
    // lower bound is max(cutoff, user `createdAtFrom`), so it can't be widened).
    // Guarding only `> 0` would lump `0` into the unlimited branch and leak the
    // whole history (reachable when a cloud overridePlan enables auditLogs on a
    // base plan whose retentionDays is 0).
    const days = config.auditLogRetentionDays;
    const cutoff =
      days === 0
        ? new Date(8_640_000_000_000_000) // "none": exclude everything
        : days > 0
          ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          : undefined; // -1 = unlimited
    return this.auditService.listAuditLogs(projectId, query, pagination, orderBy, cutoff);
  }
}
