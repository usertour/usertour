import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import type { PaginationArgs } from '@/common/pagination/pagination.args';
import { redactSnapshot } from './audit.redaction';
import type { AuditLogOrder } from './dto/audit-log-order.input';
import type { AuditLogQuery } from './dto/audit-log-query.input';
import { type AuditEntry, RESOURCE_CHANGED_EVENT } from './audit.types';

/**
 * Entry point for recording an audited change. Capture points (the MCP dispatch
 * wrapper, the API interceptor) call {@link record}; it redacts the snapshots,
 * enforces the actor invariant, and emits the domain event. Persistence is a
 * downstream concern (an `@OnEvent` listener enqueues to Bull) so a slow or
 * failing audit write never touches the business path.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Record one change. Never throws — auditing is a side-channel and must not
   * break or roll back the business write.
   */
  record(entry: AuditEntry): void {
    try {
      if (entry.source !== 'system' && !entry.actorUserId && !entry.actorTokenId) {
        // Invariant: every non-system row must identify its actor. Don't drop the
        // row (an incomplete audit beats none) — surface the bug instead.
        this.logger.error(
          `Audit entry without an actor: ${entry.operation} ${entry.resourceType}/${entry.resourceId}`,
        );
      }
      const redacted: AuditEntry = {
        ...entry,
        before: redactSnapshot(entry.resourceType, entry.before),
        after: redactSnapshot(entry.resourceType, entry.after),
      };
      this.eventEmitter.emit(RESOURCE_CHANGED_EVENT, redacted);
    } catch (error) {
      this.logger.error('Failed to emit audit event', error as Error);
    }
  }

  /**
   * Read side: list a project's audit log (cursor-paginated). Project-scoped via
   * the explicit `projectId`; the resolver gates it behind Capability.AuditRead.
   */
  async listAuditLogs(
    projectId: string,
    query: AuditLogQuery | undefined,
    pagination: PaginationArgs | undefined,
    orderBy: AuditLogOrder | undefined,
  ) {
    const { first, last, before, after } = pagination ?? {};
    const where: Prisma.AuditLogWhereInput = { projectId };
    if (query?.resourceType) where.resourceType = query.resourceType;
    if (query?.resourceId) where.resourceId = query.resourceId;
    if (query?.action) where.action = query.action;
    if (query?.source) where.source = query.source;
    if (query?.environmentId) where.environmentId = query.environmentId;
    if (query?.actorUserId) where.actorUserId = query.actorUserId;

    return findManyCursorConnection(
      (args) =>
        this.prisma.auditLog.findMany({
          where,
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : { createdAt: 'desc' },
          ...args,
        }),
      () => this.prisma.auditLog.count({ where }),
      { first, last, before, after },
    );
  }
}
