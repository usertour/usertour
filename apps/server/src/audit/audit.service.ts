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
    createdAtCutoff?: Date,
  ) {
    const { first, last, before, after } = pagination ?? {};
    const where: Prisma.AuditLogWhereInput = { projectId };
    if (query?.resourceType) where.resourceType = query.resourceType;
    if (query?.resourceId) where.resourceId = query.resourceId;
    if (query?.action) where.action = query.action;
    if (query?.source) where.source = query.source;
    if (query?.environmentId) where.environmentId = query.environmentId;
    if (query?.actorUserId) where.actorUserId = query.actorUserId;
    // Plan read-window: only rows newer than the cutoff are visible.
    if (createdAtCutoff) where.createdAt = { gte: createdAtCutoff };

    return findManyCursorConnection(
      async (args) => {
        const rows = await this.prisma.auditLog.findMany({
          where,
          // Secondary `id` sort: a stable tiebreak so cursor pages don't skip/dupe
          // rows that share a `createdAt` (default: newest first).
          orderBy: orderBy
            ? [{ [orderBy.field]: orderBy.direction }, { id: orderBy.direction }]
            : [{ createdAt: 'desc' }, { id: 'desc' }],
          ...args,
        });
        return this.enrichAuditLogs(rows);
      },
      () => this.prisma.auditLog.count({ where }),
      { first, last, before, after },
    );
  }

  /**
   * Best-effort, read-time resolution of the opaque ids into human-friendly
   * labels for display (the stored row stays just ids — an audit row must outlive
   * the user/token it references, so this is a lookup, not a join/denormalization).
   * Batched per page; a deleted actor/resource simply falls back to null (the
   * frontend then shows the id).
   */
  private async enrichAuditLogs<
    T extends {
      actorUserId: string | null;
      actorTokenId: string | null;
      resourceType: string;
      resourceId: string;
      before: Prisma.JsonValue;
      after: Prisma.JsonValue;
    },
  >(
    rows: T[],
  ): Promise<
    (T & {
      actorUserName: string | null;
      actorTokenName: string | null;
      resourceName: string | null;
    })[]
  > {
    const userIds = [...new Set(rows.map((r) => r.actorUserId).filter((id): id is string => !!id))];
    const tokenIds = [
      ...new Set(rows.map((r) => r.actorTokenId).filter((id): id is string => !!id)),
    ];
    // content / environment carry no snapshot (policy 'none') — resolve their name
    // by id so the row isn't just an opaque id. Both are soft-deleted, so the
    // lookup still resolves after deletion.
    const idsOfType = (type: string) => [
      ...new Set(
        rows
          .filter((r) => r.resourceType === type)
          .map((r) => r.resourceId)
          .filter(Boolean),
      ),
    ];
    const contentIds = idsOfType('content');
    const environmentIds = idsOfType('environment');

    const [users, apiTokens, accessTokens, contents, environments] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      // actorTokenId is polymorphic: a user ApiToken (utp_) or a v1 env AccessToken (ak_).
      tokenIds.length
        ? this.prisma.apiToken.findMany({
            where: { id: { in: tokenIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      tokenIds.length
        ? this.prisma.accessToken.findMany({
            where: { id: { in: tokenIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      contentIds.length
        ? this.prisma.content.findMany({
            where: { id: { in: contentIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      environmentIds.length
        ? this.prisma.environment.findMany({
            where: { id: { in: environmentIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const userName = new Map(users.map((u) => [u.id, u.name ?? u.email ?? null]));
    const tokenName = new Map<string, string>();
    for (const t of accessTokens) tokenName.set(t.id, t.name);
    for (const t of apiTokens) tokenName.set(t.id, t.name);
    const resourceNameById = new Map<string, string>();
    for (const c of contents) if (c.name) resourceNameById.set(c.id, c.name);
    for (const e of environments) if (e.name) resourceNameById.set(e.id, e.name);

    return rows.map((r) => ({
      ...r,
      actorUserName: r.actorUserId ? (userName.get(r.actorUserId) ?? null) : null,
      actorTokenName: r.actorTokenId ? (tokenName.get(r.actorTokenId) ?? null) : null,
      resourceName:
        pickResourceName(r.after) ??
        pickResourceName(r.before) ??
        resourceNameById.get(r.resourceId) ??
        null,
    }));
  }
}

/** Pull a display name out of a before/after snapshot (config resources carry `name`/`title`). */
function pickResourceName(snapshot: Prisma.JsonValue): string | null {
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    const record = snapshot as Record<string, unknown>;
    for (const key of ['name', 'title']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }
  return null;
}
