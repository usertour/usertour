import type { Attribute } from '@prisma/client';
import { AttributeBizType } from '@/modules/attributes/constants/attribute-biz-type.constant';
import { AttributeDataType } from '@/modules/attributes/constants/attribute-data-type.constant';
import { createdAtWhere } from '@/modules/common/utils/query-filters.util';
import {
  SegmentNotFoundError,
  ParamsError,
  UnknownError,
  ValidationError,
} from '@/modules/common/errors/errors';
import {
  createBizCompanyConditionsFilter,
  createBizUserConditionsFilter,
} from '../utils/attribute-filter.util';
import type { Pagination } from '@/modules/common/types/pagination.type';
import { AsyncLocalStorage } from 'node:async_hooks';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'nestjs-prisma';
import {
  BIZ_ENTITY_CHANGED,
  BizEntityChangedPayload,
  EntityChange,
} from '@/modules/webhooks/types/webhook.type';
import { BizCompany, BizUser, BizUserOnCompany, Prisma, Segment } from '@prisma/client';
import { SegmentBizType } from '../constants/segment-biz-type.constant';
import { SegmentDataType } from '../constants/segment-data-type.constant';
import type { BizFilter } from '../types/biz-filter.type';
import type { BizOrdering } from '../types/biz-ordering.type';
import type { NewSegment } from '../types/new-segment.type';
import type { SegmentChanges } from '../types/segment-changes.type';
import type { SegmentCompanyMembership } from '../types/segment-company-membership.type';
import type { SegmentCompanyRemoval } from '../types/segment-company-removal.type';
import type { SegmentDeletion } from '../types/segment-deletion.type';
import type { SegmentUserMembership } from '../types/segment-user-membership.type';
import type { SegmentUserRemoval } from '../types/segment-user-removal.type';
import { getDefaultColumns } from '@/modules/projects/utils/project-initialization.util';
import {
  BizAttributeTypes,
  ColumnSetting,
  CompanyAttributes,
  RejectedAttributeWrite,
  UserAttributes,
} from '@usertour/types';
import { IntegrationSource } from '@/modules/integrations/constants/integration-source.constant';
import isEqual from 'fast-deep-equal';
import {
  applyAttributeWrite,
  ATTRIBUTE_DELETE,
  attributeDataEqual,
  AttributeWrite,
  capitalizeFirstLetter,
  coerceAttributeValue,
  getAttributeType,
  humanize,
  inferWriteDataType,
  isBucketingDataType,
  isNull,
  missingBucketValues,
  parseAttributeWrite,
} from '@usertour/helpers';
import { ProjectCacheService } from '@/modules/common/services/project-cache.service';
import { ReferencesService } from '@/modules/references/services/references.service';
import { deletedDependencyRestoreError } from '@/modules/references/utils/deleted-dependency-error.util';

// Legacy data in DB may be stored as Record<string, boolean>; new shape is ColumnSetting[].
// Normalize at the service boundary so callers always see the array shape.
function normalizeSegmentColumns(raw: unknown): ColumnSetting[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter(
        (item): item is { codeName: string; visible: boolean } =>
          item != null &&
          typeof item === 'object' &&
          typeof (item as { codeName?: unknown }).codeName === 'string' &&
          typeof (item as { visible?: unknown }).visible === 'boolean',
      )
      .map((item) => ({ codeName: item.codeName, visible: item.visible }));
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'boolean')
      .map(([codeName, visible]) => ({ codeName, visible: visible as boolean }));
  }
  return [];
}

/**
 * Result of `BizService.resolveAttributeWrites`: the accepted writes, the
 * attribute-row map for downstream lookups, and a flag for cache
 * invalidation.
 */
/**
 * Options of the entity upserts. `rejected` is a sink the caller may pass to
 * learn which keys were refused (ADR 0020 §6) — the SDK acknowledgement
 * carries them back so the host is not left believing they were written.
 */
export interface UpsertAttributeOptions {
  origin?: string;
  rejected?: RejectedAttributeWrite[];
}

interface ResolvedAttributeWrites {
  /**
   * codeName → accepted write, values already coerced to the definition
   * type. Rejected writes are dropped (and logged); removals are kept.
   */
  writes: Map<string, AttributeWrite>;
  /** The keys dropped, with the reason — for the caller's acknowledgement. */
  rejected: RejectedAttributeWrite[];
  /**
   * codeName → Attribute row (existing or just-created). Lets callers
   * resolve codeName → id without a second lookup, e.g. for
   * AttributeOnEvent linking.
   */
  attrMap: Map<string, Attribute>;
  /**
   * True iff at least one Attribute row was created or restored during this
   * call. Triggers project-level Attribute cache invalidation.
   */
  catalogChanged: boolean;
}

/** Outcome of judging one write against its (possibly absent) definition. */
type AttributeWriteVerdict =
  | { ok: true; skip?: false; write: AttributeWrite; dataType: number }
  | { ok: true; skip: true }
  | { ok: false; reason: string };

/**
 * A lock order must agree across server instances, so it compares code
 * points — never the locale-dependent `localeCompare`.
 */
const compareCodePoints = (left: string, right: string): number => {
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
};

/**
 * Seed data for a NEW biz record. first/last_seen_at were historically written
 * only as a side effect of the first BizEvent landing (event-tracking's
 * isFirstEvent branch) — so a brand-new user's FIRST auto-start evaluation ran
 * before first_seen_at existed, and "new user" targeting (first_seen_at
 * less_than N) missed exactly the first pageview it exists for (the welcome
 * screen). Creation IS the first sighting: seed both at create time. Explicit
 * caller attributes still win (spread after the seed); the event path's
 * isFirstEvent check is naturally idempotent and keeps refreshing last_seen_at.
 */
const seedSeenAttributes = (attributes: Record<string, any>): Record<string, any> => {
  const now = new Date().toISOString();
  return { first_seen_at: now, last_seen_at: now, ...attributes };
};

@Injectable()
export class BizService {
  private readonly logger = new Logger(BizService.name);

  /**
   * Collects entity creations/changes made inside the current call so the
   * post-commit BIZ_ENTITY_CHANGED emit can reference them. AsyncLocalStorage
   * (same pattern as EventTrackingService's bizEvent collector): the upsert
   * chokepoints run inside caller-owned transactions, so they can't emit
   * themselves. Pushes are no-ops outside a collection scope — an unwrapped
   * caller silently doesn't notify (fail-safe: missed, never premature).
   */
  private readonly entityChanges = new AsyncLocalStorage<EntityChange[]>();

  constructor(
    private prisma: PrismaService,
    private readonly cache: ProjectCacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly references: ReferencesService,
  ) {}

  /**
   * Run an operation (containing its writes/transaction) with entity-change
   * collection, and emit BIZ_ENTITY_CHANGED after it returns — by then either
   * every collected change is committed or the operation threw (which
   * propagates before the emit).
   */
  async withEntityChangeEmit<T>(
    environmentId: string,
    operation: () => Promise<T>,
    origin?: string,
  ): Promise<T> {
    // Nesting is a programming error, not a supported composition: an inner
    // scope of its own would emit while the outer transaction is still
    // uncommitted ("premature"), and silently joining the outer scope would
    // inherit ITS environmentId — tagging one tenant's changes with
    // another's. No caller nests today (all entry points are top-level);
    // whoever first needs it should design the composition then, driven by
    // the actual requirement.
    if (this.entityChanges.getStore()) {
      throw new Error('withEntityChangeEmit must not nest — collect inside the outer scope');
    }
    const changes: EntityChange[] = [];
    const result = await this.entityChanges.run(changes, operation);

    if (changes.length > 0) {
      const payload: BizEntityChangedPayload = {
        environmentId,
        changes,
        ...(origin ? { origin } : {}),
      };
      this.eventEmitter.emit(BIZ_ENTITY_CHANGED, payload);
    }

    return result;
  }

  /** Record an entity change into the active collection scope (if any). */
  private collectEntityChange(change: EntityChange): void {
    this.entityChanges.getStore()?.push(change);
  }

  /**
   * Old values of just the keys the merge changed or removed (the common
   * payments-API `previous_attributes` convention) — captured here because only
   * the diff site has both versions in hand.
   */
  private previousAttributesOf(
    currentData: Record<string, any>,
    mergedData: Record<string, any>,
  ): Record<string, any> {
    const previous: Record<string, any> = {};
    for (const key of Object.keys(mergedData)) {
      // Own keys only: `constructor` on a plain object is Object.prototype's.
      const had = Object.prototype.hasOwnProperty.call(currentData, key);
      const before = had ? currentData[key] : undefined;
      if (!isEqual(before, mergedData[key])) {
        previous[key] = had ? before : null;
      }
    }
    for (const key of Object.keys(currentData)) {
      if (!Object.prototype.hasOwnProperty.call(mergedData, key)) {
        previous[key] = currentData[key];
      }
    }
    return previous;
  }

  async creatSegment(data: NewSegment) {
    // Segments are project-level. `projectId` may be supplied directly; fall back
    // to deriving it from `environmentId` for the legacy env-first callers (the
    // segment's own environmentId column is unused — see the v2 segments API).
    let projectId = data.projectId;
    if (!projectId) {
      const environment = await this.prisma.environment.findFirst({
        where: { id: data.environmentId },
      });
      if (!environment) {
        throw new ParamsError('Environment not found');
      }
      projectId = environment.projectId;
    }

    // Set default columns if not provided
    const segmentData = { ...data, projectId };
    if (!segmentData.columns && segmentData.bizType) {
      segmentData.columns = getDefaultColumns(segmentData.bizType as SegmentBizType);
    } else if (segmentData.columns) {
      segmentData.columns = normalizeSegmentColumns(segmentData.columns);
    }

    return await this.prisma.segment.create({
      data: segmentData,
    });
  }

  async findSegmentBySource(projectId: string, source: IntegrationSource, sourceId: string) {
    return await this.prisma.segment.findFirst({
      where: { projectId, source, sourceId },
    });
  }

  /**
   * Resolve external ids to this environment's BizUsers, CREATING bare users
   * (externalId only — cohort sync never writes attributes, ADR 0012) for the
   * ones that don't exist yet. Creation is one createMany: providers hold
   * the webhook to tight response deadlines (Amplitude: 1–2s), so a
   * full-roster first sync cannot afford row-at-a-time INSERTs. Trade-off:
   * under a concurrent duplicate batch, a user the other request created can
   * appear in this side's post-create read and emit a second `user.created`
   * — rare, and logically-duplicate events are already tolerated.
   */
  async findOrCreateBizUsersByExternalIds(
    environmentId: string,
    externalIds: string[],
  ): Promise<{ id: string; externalId: string }[]> {
    // Delegation: the emit wrapper is a no-op when nothing changes, so the
    // early-return shape of the InScope core covers both callers.
    return await this.withEntityChangeEmit(environmentId, () =>
      this.findOrCreateBizUsersInScope(environmentId, externalIds),
    );
  }

  /**
   * The creation core of {@link findOrCreateBizUsersByExternalIds}, for
   * callers already INSIDE an entity-change scope (event tracking wraps one
   * around its whole operation): `user.created` collects into that scope,
   * and outside any scope the collect is a documented no-op.
   */
  async findOrCreateBizUsersInScope(
    environmentId: string,
    externalIds: string[],
    client?: Prisma.TransactionClient,
  ): Promise<{ id: string; externalId: string }[]> {
    const db = client ?? this.prisma;
    const uniqueExternalIds = [...new Set(externalIds)];
    if (!uniqueExternalIds.length) {
      return [];
    }
    const existing = await db.bizUser.findMany({
      where: { environmentId, externalId: { in: uniqueExternalIds } },
      select: { id: true, externalId: true },
    });
    const existingByExternalId = new Set(existing.map((user) => user.externalId));
    const missing = uniqueExternalIds.filter((externalId) => !existingByExternalId.has(externalId));
    if (!missing.length) {
      return existing;
    }
    return await this.createMissingBizUsers(environmentId, existing, missing, db);
  }

  private async createMissingBizUsers(
    environmentId: string,
    existing: { id: string; externalId: string }[],
    missing: string[],
    client?: Prisma.TransactionClient,
  ): Promise<{ id: string; externalId: string }[]> {
    const db = client ?? this.prisma;
    // Bucketing values are born with the row (ADR 0020 §3); one definition
    // query serves the whole batch.
    const environment = await db.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true },
    });
    const bucketingDefinitions = environment
      ? await db.attribute.findMany({
          where: {
            projectId: environment.projectId,
            bizType: AttributeBizType.USER,
            deleted: false,
            dataType: { in: [BizAttributeTypes.RandomAB, BizAttributeTypes.RandomNumber] },
          },
          select: { id: true, codeName: true, dataType: true, randomMax: true },
        })
      : [];
    await db.bizUser.createMany({
      data: missing.map((externalId) => ({
        environmentId,
        externalId,
        data: missingBucketValues(bucketingDefinitions, externalId, {}),
      })),
      skipDuplicates: true,
    });
    const created = await db.bizUser.findMany({
      where: { environmentId, externalId: { in: missing } },
      select: { id: true, externalId: true },
    });
    for (const row of created) {
      this.collectEntityChange({ entity: 'user', action: 'created', bizId: row.id });
    }
    return [...existing, ...created];
  }

  async createUserSegmentWithSource(
    projectId: string,
    name: string,
    source: string,
    sourceId: string,
  ) {
    return await this.prisma.segment.create({
      data: {
        projectId,
        name,
        bizType: SegmentBizType.USER,
        dataType: SegmentDataType.MANUAL,
        source,
        sourceId,
        columns: getDefaultColumns(SegmentBizType.USER),
      },
    });
  }

  async getSegment(id: string) {
    const segment = await this.prisma.segment.findUnique({
      where: { id },
    });
    if (!segment) return null;
    return { ...segment, columns: normalizeSegmentColumns(segment.columns) };
  }

  /**
   * Synced segments (ADR 0012) mirror a provider-side cohort: their name and
   * membership are managed by the sync engine and are read-only here. Column
   * layout stays editable — it is display configuration, not data.
   */
  private async assertSegmentNotSynced(segmentId: string, action: string): Promise<void> {
    // Any mapping makes the segment synced — several may feed it, one per
    // environment's integration (project-wide convergence, ADR 0012).
    const mapping = await this.prisma.integrationSyncedSegment.findFirst({
      where: { segmentId },
      select: { id: true },
    });
    if (mapping) {
      throw new ParamsError(
        `This segment is synced from an integration; ${action} is managed by the sync.`,
      );
    }
  }

  async updateSegment({ id, ...updates }: SegmentChanges) {
    if (updates.name !== undefined || updates.data !== undefined) {
      await this.assertSegmentNotSynced(id, 'editing it');
    }
    const data: Record<string, unknown> = { ...updates };
    if (updates.columns !== undefined) {
      data.columns = normalizeSegmentColumns(updates.columns);
    }
    return await this.prisma.segment.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete (ADR 0016). Memberships stay, so a restored manual segment comes
   * back with its members; the sync mappings go, as the cascade removed them
   * before, so no integration keeps writing into a deleted segment. Refused
   * while a live surface (content conditions, theme variations) uses it.
   */
  async deleteSegment(data: SegmentDeletion) {
    const segment = await this.prisma.segment.findFirst({
      where: { id: data.id, deleted: false },
    });
    if (!segment) {
      throw new SegmentNotFoundError();
    }
    await this.references.assertUnreferenced(segment.projectId, 'segment', segment.id);
    const [, deleted] = await this.prisma.$transaction([
      this.prisma.integrationSyncedSegment.deleteMany({ where: { segmentId: segment.id } }),
      this.prisma.segment.update({ where: { id: segment.id }, data: { deleted: true } }),
    ]);
    return deleted;
  }

  /**
   * Bring a soft-deleted segment back with its members. Idempotent on a live
   * one. Refused while its conditions use deleted definitions (ADR 0016 §5).
   */
  async restoreSegment(id: string) {
    const segment = await this.prisma.segment.findUnique({ where: { id } });
    if (!segment) {
      throw new SegmentNotFoundError();
    }
    if (segment.deleted) {
      const dependencies = await this.references.findDeletedConditionReferences(
        segment.projectId,
        segment.data,
      );
      if (dependencies.length > 0) {
        throw deletedDependencyRestoreError('segment', dependencies);
      }
    }
    const restored = segment.deleted
      ? await this.prisma.segment.update({ where: { id }, data: { deleted: false } })
      : segment;
    return { ...restored, columns: normalizeSegmentColumns(restored.columns) };
  }

  /** Membership writes only touch live segments. */
  private async assertSegmentLive(segmentId: string): Promise<void> {
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId, deleted: false },
      select: { id: true },
    });
    if (!segment) {
      throw new ParamsError('Segment not found');
    }
  }

  async listSegment(environmentId: string) {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId },
    });
    if (!environment) {
      throw new ParamsError('Environment not found');
    }
    const segments = await this.prisma.segment.findMany({
      where: { projectId: environment.projectId, deleted: false },
      orderBy: { createdAt: 'asc' },
    });
    return segments.map((segment) => ({
      ...segment,
      columns: normalizeSegmentColumns(segment.columns),
    }));
  }

  async createBizUserOnSegment(data: SegmentUserMembership[]) {
    // Validate input data
    if (!data?.length) {
      throw new ParamsError('No data provided');
    }

    // Extract and validate first item
    const firstItem = data[0];
    await this.assertSegmentNotSynced(firstItem.segmentId, 'its membership');

    // Validate all items have the same segmentId
    const segmentIds = new Set(data.map((item) => item.segmentId));
    if (segmentIds.size > 1) {
      throw new ParamsError('All items must have the same segmentId');
    }

    // Get segment and validate
    const segment = await this.getSegment(firstItem.segmentId);
    if (!segment || segment.deleted) {
      throw new ParamsError('Segment not found');
    }

    // Batch check all users exist and have the same environmentId
    const existingUsers = await this.prisma.bizUser.findMany({
      where: {
        id: { in: data.map((item) => item.bizUserId) },
      },
      select: { id: true, environmentId: true },
    });

    const environmentIds = new Set(existingUsers.map((user) => user.environmentId));
    if (environmentIds.size > 1) {
      throw new ParamsError('All users must have the same environmentId');
    }

    // Map items for insertion
    const inserts = data.map((item) => ({
      bizUserId: item.bizUserId,
      segmentId: item.segmentId,
      data: item.data || {},
    }));

    return await this.prisma.bizUserOnSegment.createMany({
      data: inserts,
      skipDuplicates: true, // Skip duplicate records based on unique constraint
    });
  }

  async deleteBizUserOnSegment(data: SegmentUserRemoval) {
    await this.assertSegmentLive(data.segmentId);
    await this.assertSegmentNotSynced(data.segmentId, 'its membership');
    return await this.prisma.bizUserOnSegment.deleteMany({
      where: {
        segmentId: data.segmentId,
        bizUserId: { in: data.bizUserIds },
      },
    });
  }

  async createBizCompanyOnSegment(data: SegmentCompanyMembership[]) {
    // Validate input data
    if (!data?.length) {
      throw new ParamsError('No data provided');
    }

    // Extract and validate first item
    const firstItem = data[0];

    // Validate all items have the same segmentId
    const segmentIds = new Set(data.map((item) => item.segmentId));
    if (segmentIds.size > 1) {
      throw new ParamsError('All items must have the same segmentId');
    }

    // Get segment and validate
    const segment = await this.getSegment(firstItem.segmentId);
    if (!segment || segment.deleted) {
      throw new ParamsError('Segment not found');
    }

    // Batch check all companies exist and have the same environmentId
    const existingCompanies = await this.prisma.bizCompany.findMany({
      where: {
        id: { in: data.map((item) => item.bizCompanyId) },
      },
      select: { id: true, environmentId: true },
    });

    const environmentIds = new Set(existingCompanies.map((company) => company.environmentId));
    if (environmentIds.size > 1) {
      throw new ParamsError('All companies must have the same environmentId');
    }

    // Map items for insertion
    const inserts = data.map((item) => ({
      bizCompanyId: item.bizCompanyId,
      segmentId: item.segmentId,
      data: item.data || {},
    }));

    return await this.prisma.bizCompanyOnSegment.createMany({
      data: inserts,
      skipDuplicates: true, // Skip duplicate records based on unique constraint
    });
  }

  async deleteBizCompanyOnSegment(data: SegmentCompanyRemoval) {
    await this.assertSegmentLive(data.segmentId);
    return await this.prisma.bizCompanyOnSegment.deleteMany({
      where: {
        segmentId: data.segmentId,
        bizCompanyId: { in: data.bizCompanyIds },
      },
    });
  }

  private async executeDeleteUserRelationsTransaction(
    tx: Prisma.TransactionClient,
    deleteIds: string[],
  ) {
    // Delete user-company relationships
    await tx.bizUserOnCompany.deleteMany({
      where: { bizUserId: { in: deleteIds } },
    });

    // Delete user-segment relationships
    await tx.bizUserOnSegment.deleteMany({
      where: { bizUserId: { in: deleteIds } },
    });

    // Delete user answers
    await tx.bizAnswer.deleteMany({
      where: { bizUserId: { in: deleteIds } },
    });

    // Delete user events
    await tx.bizEvent.deleteMany({
      where: { bizUserId: { in: deleteIds } },
    });

    // Delete user sessions
    await tx.bizSession.deleteMany({
      where: { bizUserId: { in: deleteIds } },
    });

    // Delete announcement read-state. Its FK is ON DELETE RESTRICT, so without
    // this the bizUser delete below hits P2003 and the whole transaction rolls
    // back — any user who opened the announcement feed once becomes undeletable.
    await tx.bizAnnouncementSeen.deleteMany({
      where: { bizUserId: { in: deleteIds } },
    });
  }

  /**
   * Delete users (every surface — dashboard, REST, legacy API — funnels here).
   * `user.deleted` carries the object as it was — sourced from the DELETE's
   * RETURNING rows, the last state before removal and the only per-row
   * attribution under concurrent deletes.
   */
  async deleteBizUser(ids: string[], environmentId: string) {
    if (!ids?.length) {
      throw new ParamsError('User IDs are required');
    }

    return await this.withEntityChangeEmit(environmentId, () =>
      this.prisma.$transaction(async (tx) => {
        // Resolve the target ids INSIDE the transaction and emit only for
        // rows the final DELETE actually returned: a pre-transaction read
        // would emit `user.deleted` for rows this transaction never removed
        // — a double-click or REST retry would then produce two logically-
        // duplicate events with DIFFERENT message ids, which receivers
        // cannot deduplicate. ids only: the deleted-row data comes from
        // RETURNING below — full rows here would be read and discarded.
        const bizUsers = await tx.bizUser.findMany({
          where: { id: { in: ids }, environmentId },
          select: { id: true },
        });
        if (!bizUsers.length) {
          throw new ParamsError('No users found to delete');
        }
        const deleteIds = bizUsers.map((bizUser) => bizUser.id);
        await this.executeDeleteUserRelationsTransaction(tx, deleteIds);
        // RETURNING is the per-row attribution deleteMany cannot give: under
        // a concurrent overlapping delete, only the rows THIS statement
        // removed come back, so each event is emitted exactly once cluster-wide.
        const deletedRows = await tx.$queryRaw<BizUser[]>`
          DELETE FROM "BizUser" WHERE id = ANY(${deleteIds}) RETURNING *`;
        for (const bizUser of deletedRows) {
          this.collectEntityChange({
            entity: 'user',
            action: 'deleted',
            bizId: bizUser.id,
            deletedRow: bizUser,
          });
        }
        return { count: deletedRows.length };
      }),
    );
  }

  /** Delete companies — same funnel/notification shape as deleteBizUser. */
  async deleteBizCompany(ids: string[], environmentId: string) {
    return await this.withEntityChangeEmit(environmentId, () =>
      this.prisma.$transaction(async (tx) => {
        // See deleteBizUser: resolve ids in-transaction, emit from RETURNING.
        const bizCompanies = await tx.bizCompany.findMany({
          where: { id: { in: ids }, environmentId },
          select: { id: true },
        });
        if (!bizCompanies.length) {
          return { count: 0 };
        }
        const deleteIds = bizCompanies.map((bizCompany) => bizCompany.id);
        await tx.bizUserOnCompany.deleteMany({
          where: { bizCompanyId: { in: deleteIds } },
        });
        await tx.bizCompanyOnSegment.deleteMany({
          where: { bizCompanyId: { in: deleteIds } },
        });
        const deletedRows = await tx.$queryRaw<BizCompany[]>`
          DELETE FROM "BizCompany" WHERE id = ANY(${deleteIds}) RETURNING *`;
        for (const bizCompany of deletedRows) {
          this.collectEntityChange({
            entity: 'company',
            action: 'deleted',
            bizId: bizCompany.id,
            deletedRow: bizCompany,
          });
        }
        return { count: deletedRows.length };
      }),
    );
  }

  private createSearchConditions(
    search: string,
    attributes: Attribute[],
    bizType: AttributeBizType,
  ) {
    const conditions: any[] = [
      // Search in externalId field
      { externalId: { contains: search } },
    ];

    // Add search conditions for all string attributes
    if (attributes && attributes.length > 0) {
      for (const attr of attributes) {
        if (attr.bizType === bizType && attr.dataType === AttributeDataType.String) {
          // String type - use contains search
          conditions.push({
            data: { path: [attr.codeName], string_contains: search },
          });
        } else if (attr.bizType === bizType && attr.dataType === AttributeDataType.Number) {
          // Number type - try to convert search to number and use equals
          const numValue = Number(search);
          if (!Number.isNaN(numValue)) {
            conditions.push({
              data: { path: [attr.codeName], equals: numValue },
            });
          }
        } else if (attr.bizType === bizType && attr.dataType === AttributeDataType.Boolean) {
          // Boolean type — only match when the search term is explicitly boolean-like.
          // Otherwise any non-bool search (e.g. "lisa") would implicitly resolve to `false`
          // and match every record whose boolean attribute happens to be false.
          const normalized = search.toLowerCase();
          const isTrueLiteral = normalized === 'true' || search === '1';
          const isFalseLiteral = normalized === 'false' || search === '0';
          if (isTrueLiteral || isFalseLiteral) {
            conditions.push({
              data: { path: [attr.codeName], equals: isTrueLiteral },
            });
          }
        }
      }
    }

    return conditions;
  }

  async queryBizUser(query: BizFilter, pagination: Pagination, orderBy: BizOrdering) {
    const { first, last, before, after } = pagination;
    const { environmentId, segmentId, data, userId, search, companyId } = query;
    try {
      const environmenet = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      if (!environmenet) {
        return false;
      }
      const projectId = environmenet.projectId;
      let conditions: any = data ? data : {};
      let segment: Segment;
      if (segmentId) {
        // A deleted segment keeps its memberships (ADR 0016) but is not found here,
        // as over REST.
        segment = await this.prisma.segment.findFirst({
          where: { id: segmentId, projectId, deleted: false },
        });
        if (!segment) {
          throw new SegmentNotFoundError();
        }
        if (!data && segment.dataType === SegmentDataType.CONDITION) {
          conditions = segment.data;
        }
      }
      const attributes = await this.prisma.attribute.findMany({
        where: {
          projectId,
          bizType: {
            in: [AttributeBizType.USER, AttributeBizType.COMPANY, AttributeBizType.MEMBERSHIP],
          },
        },
      });
      const filter = createBizUserConditionsFilter(conditions, attributes);
      // The compiled filter and the search conditions can each carry top-level
      // OR / bizUsersOnCompany keys, so they are combined as AND members
      // instead of being spread into one object where the keys would collide.
      const andFilters: Record<string, any>[] = filter ? [filter] : [];
      const where: Record<string, any> = {};
      if (segment && segment.dataType === SegmentDataType.MANUAL) {
        where.bizUsersOnSegment = {
          some: {
            segment: {
              id: segment.id,
            },
          },
        };
      }
      if (userId) {
        where.id = userId;
      }
      if (search) {
        // Support searching across multiple fields
        andFilters.push({
          OR: this.createSearchConditions(search, attributes, AttributeBizType.USER),
        });
      }
      if (companyId) {
        where.bizUsersOnCompany = {
          some: {
            bizCompanyId: companyId,
          },
        };
      }
      if (andFilters.length > 0) {
        where.AND = andFilters;
      }
      const resp = await findManyCursorConnection(
        (args) =>
          this.prisma.bizUser.findMany({
            where: {
              environmentId,
              ...where,
            },
            include: {
              bizUsersOnCompany: {
                include: {
                  bizCompany: true,
                },
              },
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
            ...args,
          }),
        () =>
          this.prisma.bizUser.count({
            where: {
              environmentId,
              ...where,
            },
          }),
        { first, last, before, after },
      );
      return resp;
    } catch (error) {
      if (error instanceof SegmentNotFoundError) {
        throw error;
      }
      throw new UnknownError(error);
    }
  }

  async queryBizCompany(query: BizFilter, pagination: Pagination, orderBy: BizOrdering) {
    const { first, last, before, after } = pagination;
    const { environmentId, segmentId, data, companyId, search } = query;
    try {
      const environmenet = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      if (!environmenet) {
        return false;
      }
      const projectId = environmenet.projectId;
      let conditions: any = data ? data : {};
      let segment: Segment;
      if (segmentId) {
        // A deleted segment keeps its memberships (ADR 0016) but is not found here,
        // as over REST.
        segment = await this.prisma.segment.findFirst({
          where: { id: segmentId, projectId, deleted: false },
        });
        if (!segment) {
          throw new SegmentNotFoundError();
        }
        if (!data && segment.dataType === SegmentDataType.CONDITION) {
          conditions = segment.data;
        }
      }
      const attributes = await this.prisma.attribute.findMany({
        where: {
          projectId: environmenet.projectId,
          bizType: {
            in: [AttributeBizType.USER, AttributeBizType.COMPANY, AttributeBizType.MEMBERSHIP],
          },
        },
      });
      const filter = createBizCompanyConditionsFilter(conditions, attributes);
      // The compiled filter and the search conditions can each carry top-level
      // OR / bizUsersOnCompany keys, so they are combined as AND members
      // instead of being spread into one object where the keys would collide.
      const andFilters: Record<string, any>[] = filter ? [filter] : [];
      const where: Record<string, any> = {};
      if (segment && segment.dataType === SegmentDataType.MANUAL) {
        where.bizCompaniesOnSegment = {
          some: {
            segment: {
              id: segment.id,
            },
          },
        };
      }
      if (companyId) {
        where.id = companyId;
      }
      if (search) {
        // Support searching across multiple fields for companies
        andFilters.push({
          OR: this.createSearchConditions(search, attributes, AttributeBizType.COMPANY),
        });
      }
      if (andFilters.length > 0) {
        where.AND = andFilters;
      }
      const resp = await findManyCursorConnection(
        (args) =>
          this.prisma.bizCompany.findMany({
            where: {
              environmentId,
              deleted: false,
              ...where,
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
            ...args,
          }),
        () =>
          this.prisma.bizCompany.count({
            where: {
              environmentId,
              deleted: false,
              ...where,
            },
          }),
        { first, last, before, after },
      );
      return resp;
    } catch (error) {
      if (error instanceof SegmentNotFoundError) {
        throw error;
      }
      throw new UnknownError(error);
    }
  }

  /**
   * Must run inside a transaction: the BizUser row is taken FOR NO KEY UPDATE
   * so the read-merge-write cannot lose a concurrent write (ADR 0017 §4).
   * Every write locks — an unlocked literal write would read the whole jsonb
   * and write it back over a concurrent `add`. NO KEY, because the row's key
   * never changes here and an insert of a membership or an event takes KEY
   * SHARE on it through the foreign key: FOR UPDATE would block that insert,
   * and two writers locking user and company in opposite orders deadlocked.
   */
  async upsertBizUsers(
    tx: Prisma.TransactionClient,
    externalUserId: string,
    attributes: Record<string, any>,
    environmentId: string,
    options?: UpsertAttributeOptions,
  ): Promise<BizUser | null> {
    const environment = await tx.environment.findFirst({
      where: { id: environmentId },
    });
    if (!environment) {
      return null;
    }
    const externalId = String(externalUserId);
    const { writes, rejected } = await this.resolveEntityAttributeWrites(
      tx,
      environment.projectId,
      AttributeBizType.USER,
      attributes,
      options?.origin,
    );
    options?.rejected?.push(...rejected);

    await tx.$queryRaw`SELECT id FROM "BizUser" WHERE "environmentId" = ${environmentId} AND "externalId" = ${externalId} FOR NO KEY UPDATE`;
    const user = await tx.bizUser.findFirst({
      where: { externalId, environmentId },
    });
    if (!user) {
      const created = await tx.bizUser.create({
        data: {
          externalId,
          environmentId,
          // Writes apply first; the seen-at seed only fills what they left
          // empty, so a `set_once` first_seen_at is the first value the row
          // ever has and a null removes nothing the row was about to get.
          // A null never reaches the row (it would only manufacture a
          // spurious `<entity>.updated` diff on the next identify). Bucketing
          // values are born with the row (ADR 0020 §3).
          data: seedSeenAttributes(
            this.applyAttributeWrites(
              await this.bucketingSeed(
                tx,
                environment.projectId,
                AttributeBizType.USER,
                externalId,
              ),
              writes,
            ),
          ),
        },
      });
      this.collectEntityChange({ entity: 'user', action: 'created', bizId: created.id });
      return created;
    }
    const currentData = (user.data as Record<string, any>) || {};
    const nextData = this.applyAttributeWrites(currentData, writes);

    // Only update if data has actually changed
    if (attributeDataEqual(currentData, nextData)) {
      return user;
    }

    const updated = await tx.bizUser.update({
      where: {
        id: user.id,
      },
      data: {
        data: nextData,
      },
    });
    this.collectEntityChange({
      entity: 'user',
      action: 'updated',
      bizId: user.id,
      previousAttributes: this.previousAttributesOf(currentData, nextData),
    });
    return updated;
  }

  async upsertBizCompanies(
    tx: Prisma.TransactionClient,
    externalCompanyId: string,
    externalUserId: string,
    attributes: Record<string, any>,
    environmentId: string,
    membership: Record<string, any>,
    options?: UpsertAttributeOptions,
  ): Promise<BizCompany | null> {
    const environmenet = await tx.environment.findFirst({
      where: { id: environmentId },
    });
    if (!environmenet) {
      return null;
    }
    const user = await tx.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    if (!user) {
      return null;
    }

    const projectId = environmenet.projectId;
    const company = await this.upsertBizCompanyAttributes(
      tx,
      projectId,
      environmentId,
      externalCompanyId,
      attributes,
      options,
    );
    if (!company) {
      return null;
    }
    await this.upsertBizMembership(tx, projectId, company.id, user.id, membership || {}, options);

    return company;
  }

  async upsertBizCompany(
    projectId: string,
    environmentId: string,
    companyId: string,
    attributes: Record<string, any>,
  ): Promise<BizCompany | null> {
    return await this.withEntityChangeEmit(environmentId, () =>
      // A real transaction: upsertBizCompanyAttributes takes the row FOR NO KEY UPDATE.
      this.prisma.$transaction((tx) =>
        this.upsertBizCompanyAttributes(tx, projectId, environmentId, companyId, attributes),
      ),
    );
  }

  /** Must run inside a transaction — see upsertBizUsers. */
  async upsertBizCompanyAttributes(
    tx: Prisma.TransactionClient,
    projectId: string,
    environmentId: string,
    externalCompanyId: string,
    attributes: Record<string, any>,
    options?: UpsertAttributeOptions,
  ): Promise<BizCompany | null> {
    const externalId = String(externalCompanyId);
    const { writes, rejected } = await this.resolveEntityAttributeWrites(
      tx,
      projectId,
      AttributeBizType.COMPANY,
      attributes,
      options?.origin,
    );
    options?.rejected?.push(...rejected);

    // Every member's page load calls group() on the same company row, and
    // most of those calls change nothing. Read without the lock first and
    // return when the writes would leave the row as it is — a no-op
    // linearises at the moment of that read — so the row is only locked by a
    // write that changes something, which re-reads under the lock.
    const unlocked = await tx.bizCompany.findFirst({
      where: { externalId, environmentId },
    });
    if (unlocked) {
      const unlockedData = (unlocked.data as Record<string, any>) || {};
      if (attributeDataEqual(unlockedData, this.applyAttributeWrites(unlockedData, writes))) {
        return unlocked;
      }
    }

    await tx.$queryRaw`SELECT id FROM "BizCompany" WHERE "environmentId" = ${environmentId} AND "externalId" = ${externalId} FOR NO KEY UPDATE`;
    const company = await tx.bizCompany.findFirst({
      where: { externalId, environmentId },
    });

    if (company) {
      const currentData = (company.data as Record<string, any>) || {};
      const nextData = this.applyAttributeWrites(currentData, writes);

      // Only update if data has actually changed
      if (attributeDataEqual(currentData, nextData)) {
        return company;
      }

      const updated = await tx.bizCompany.update({
        where: {
          id: company.id,
        },
        data: {
          data: nextData,
        },
      });
      this.collectEntityChange({
        entity: 'company',
        action: 'updated',
        bizId: company.id,
        previousAttributes: this.previousAttributesOf(currentData, nextData),
      });
      return updated;
    }

    const created = await tx.bizCompany.create({
      data: {
        externalId,
        environmentId,
        // Same seeding rule as users: writes first, the seen-at seed fills
        // the rest, nulls never reach the row, bucketing values are born
        // with the row.
        data: seedSeenAttributes(
          this.applyAttributeWrites(
            await this.bucketingSeed(tx, projectId, AttributeBizType.COMPANY, externalId),
            writes,
          ),
        ),
      },
    });
    this.collectEntityChange({ entity: 'company', action: 'created', bizId: created.id });
    return created;
  }

  /** Must run inside a transaction — see upsertBizUsers. */
  async upsertBizMembership(
    tx: Prisma.TransactionClient,
    projectId: string,
    bizCompanyId: string,
    bizUserId: string,
    membership: Record<string, any>,
    options?: UpsertAttributeOptions,
  ): Promise<BizUserOnCompany> {
    const { writes, rejected } = await this.resolveEntityAttributeWrites(
      tx,
      projectId,
      AttributeBizType.MEMBERSHIP,
      membership,
      options?.origin,
    );
    options?.rejected?.push(...rejected);

    await tx.$queryRaw`SELECT id FROM "BizUserOnCompany" WHERE "bizCompanyId" = ${bizCompanyId} AND "bizUserId" = ${bizUserId} FOR NO KEY UPDATE`;
    const relation = await tx.bizUserOnCompany.findFirst({
      where: { bizCompanyId, bizUserId },
    });

    if (relation) {
      const currentData = (relation.data as Record<string, any>) || {};
      const nextData = this.applyAttributeWrites(currentData, writes);

      // Only update if data has actually changed
      if (attributeDataEqual(currentData, nextData)) {
        return relation;
      }

      return await tx.bizUserOnCompany.update({
        where: {
          id: relation.id,
        },
        data: {
          data: nextData,
        },
      });
    }
    return await tx.bizUserOnCompany.create({
      data: {
        bizUserId,
        bizCompanyId,
        // A null must not be stored on creation either: a JSON null would make
        // set_once see a value where there is none.
        data: this.applyAttributeWrites({}, writes),
      },
    });
  }

  /**
   * Resolve a User/Company/Membership attribute payload into per-codeName
   * writes (ADR 0017): parse each value (literal / null / operation object),
   * drop writes to provider-owned attributes, auto-create definitions for
   * unknown codeNames, coerce values to the definition type, and invalidate
   * the project's Attribute cache when the catalog changed. A rejected value
   * is dropped and logged — the SDK contract is per key, never whole-message.
   */
  async resolveEntityAttributeWrites(
    tx: Prisma.TransactionClient,
    projectId: string,
    bizType: AttributeBizType,
    attributes: Record<string, any>,
    origin?: string,
  ): Promise<{ writes: Map<string, AttributeWrite>; rejected: RejectedAttributeWrite[] }> {
    const { writes, rejected, catalogChanged } = await this.resolveAttributeWrites(
      tx,
      projectId,
      bizType,
      await this.withoutForeignOwnedAttributes(tx, projectId, bizType, attributes, origin),
    );
    if (catalogChanged) {
      await this.cache.invalidateDeferred(this.cache.keys.attrs(projectId));
    }
    return { writes, rejected };
  }

  /**
   * Values of the project's bucketing definitions for an entity about to be
   * born (ADR 0020 §3): derived, so seeding them at creation costs one small
   * query and guarantees every row carries them from its first read.
   */
  private async bucketingSeed(
    tx: Prisma.TransactionClient,
    projectId: string,
    bizType: AttributeBizType,
    externalId: string,
  ): Promise<Record<string, string | number>> {
    const definitions = await tx.attribute.findMany({
      where: {
        projectId,
        bizType,
        deleted: false,
        dataType: { in: [BizAttributeTypes.RandomAB, BizAttributeTypes.RandomNumber] },
      },
      select: { id: true, codeName: true, dataType: true, randomMax: true },
    });
    return missingBucketValues(definitions, externalId, {});
  }

  /**
   * Apply resolved writes to the stored attribute object. A legacy JSON null
   * counts as absent so set_once / add / union start from nothing.
   */
  private applyAttributeWrites(
    current: Record<string, any>,
    writes: Map<string, AttributeWrite>,
  ): Record<string, any> {
    const next: Record<string, any> = { ...current };
    for (const [codeName, write] of writes) {
      // Own keys only: a codeName such as `constructor` or `toString` would
      // otherwise read Object.prototype's member as the stored value.
      const own = Object.prototype.hasOwnProperty.call(next, codeName) ? next[codeName] : undefined;
      const stored = isNull(own) ? undefined : own;
      const value = applyAttributeWrite(stored, write);
      if (value === ATTRIBUTE_DELETE) {
        delete next[codeName];
      } else {
        next[codeName] = value;
      }
    }
    return next;
  }

  /**
   * Stamp last_seen_at — and first_seen_at when the row has none — on a user
   * or company as one jsonb merge. The statement touches only its own two
   * keys, so an attribute write that landed between the caller's read of the
   * row and this write is never overwritten, and no lock is needed for it.
   * An event path that instead wrote the row's data back whole lost such
   * writes (ADR 0017 §4).
   */
  async touchSeenAttributes(
    tx: Prisma.TransactionClient,
    entity: 'user' | 'company',
    id: string,
    at: string,
  ): Promise<void> {
    const firstSeenKey =
      entity === 'user' ? UserAttributes.FIRST_SEEN_AT : CompanyAttributes.FIRST_SEEN_AT;
    const lastSeenKey =
      entity === 'user' ? UserAttributes.LAST_SEEN_AT : CompanyAttributes.LAST_SEEN_AT;
    const lastSeen = JSON.stringify({ [lastSeenKey]: at });
    const firstSeen = JSON.stringify({ [firstSeenKey]: at });
    if (entity === 'user') {
      await tx.$executeRaw`UPDATE "BizUser" SET data = COALESCE(data, '{}'::jsonb) || ${lastSeen}::jsonb || CASE WHEN NULLIF(COALESCE(data, '{}'::jsonb) ->> ${firstSeenKey}, '') IS NULL THEN ${firstSeen}::jsonb ELSE '{}'::jsonb END, "updatedAt" = NOW() WHERE id = ${id}`;
      return;
    }
    await tx.$executeRaw`UPDATE "BizCompany" SET data = COALESCE(data, '{}'::jsonb) || ${lastSeen}::jsonb || CASE WHEN NULLIF(COALESCE(data, '{}'::jsonb) ->> ${firstSeenKey}, '') IS NULL THEN ${firstSeen}::jsonb ELSE '{}'::jsonb END, "updatedAt" = NOW() WHERE id = ${id}`;
  }

  /**
   * Resolve EVENT-typed attribute payload and link the validated attributes
   * to the given Event row. trackEvent uses this to keep AttributeOnEvent
   * bookkeeping out of the websocket layer.
   */
  async resolveAndLinkEventAttributes(
    tx: Prisma.TransactionClient,
    projectId: string,
    eventId: string,
    attributes: Record<string, any>,
  ): Promise<Record<string, any>> {
    const { writes, attrMap, catalogChanged } = await this.resolveAttributeWrites(
      tx,
      projectId,
      AttributeBizType.EVENT,
      attributes,
    );

    // An event has no prior value: every write lands on an empty slot, and a
    // null stays a null on the event row (there is nothing to remove).
    const outputData: Record<string, any> = {};
    for (const [codeName, write] of writes) {
      const value = applyAttributeWrite(undefined, write);
      outputData[codeName] = value === ATTRIBUTE_DELETE ? null : value;
    }

    // Link only attributes that ended up with a non-null value.
    const linkIds = Object.keys(outputData)
      .filter((codeName) => outputData[codeName] != null)
      .map((codeName) => attrMap.get(codeName)?.id)
      .filter((id): id is string => !!id);
    await this.linkAttributesToEvent(tx, eventId, linkIds);

    if (catalogChanged) {
      await this.cache.invalidateDeferred(this.cache.keys.attrs(projectId));
    }
    return outputData;
  }

  /**
   * Provider-owned attributes (ADR 0013 §6) accept writes only from their
   * provider's own sync: an SDK/API write to one is dropped and logged, so a
   * stale client value can never overwrite the CRM's. `origin` is the
   * provider id of the writer (absent for SDK/API/dashboard writes).
   */
  private async withoutForeignOwnedAttributes(
    tx: Prisma.TransactionClient,
    projectId: string,
    bizType: AttributeBizType,
    attributes: Record<string, any>,
    origin: string | undefined,
  ): Promise<Record<string, any>> {
    const codeNames = Object.keys(attributes);
    if (codeNames.length === 0) {
      return attributes;
    }
    const owned = await tx.attribute.findMany({
      where: { projectId, bizType, codeName: { in: codeNames }, source: { not: 'internal' } },
      select: { codeName: true, source: true },
    });
    const foreign = owned.filter((attr) => attr.source !== origin);
    if (foreign.length === 0) {
      return attributes;
    }
    const result = { ...attributes };
    for (const attr of foreign) {
      delete result[attr.codeName];
      this.logger.warn(
        `Dropped write to "${attr.codeName}": the attribute is owned by ${attr.source} (writer: ${
          origin ?? 'sdk/api'
        }).`,
      );
    }
    return result;
  }

  /**
   * Parse every value, find-or-create Attribute rows for the codeNames that
   * need one (one batched findMany + one createMany for the misses), and
   * judge each write against its definition. Returns the accepted writes,
   * the attribute map so callers (e.g. AttributeOnEvent linking) can resolve
   * codeName → id without a second round trip, and whether the catalog
   * changed. Rejected writes are dropped and logged.
   */
  private async resolveAttributeWrites(
    tx: Prisma.TransactionClient,
    projectId: string,
    bizType: AttributeBizType,
    attributes: Record<string, any>,
  ): Promise<ResolvedAttributeWrites> {
    const writes = new Map<string, AttributeWrite>();
    const attrMap = new Map<string, Attribute>();
    const rejected: RejectedAttributeWrite[] = [];
    const pending = new Map<string, AttributeWrite>();
    for (const codeName in attributes) {
      // On a plain object `__proto__` is the prototype setter, not a property:
      // assigning it would silently change the object instead of storing a
      // value. Only the lenient SDK path can carry it (v2 validates names).
      if (codeName === '__proto__') {
        this.logger.warn(`Dropped attribute "${codeName}": not a valid attribute name.`);
        rejected.push({ codeName, reason: 'not a valid attribute name' });
        continue;
      }
      const parsed = parseAttributeWrite(attributes[codeName]);
      if (parsed.ok === false) {
        this.logger.warn(`Dropped attribute "${codeName}": ${parsed.reason}.`);
        rejected.push({ codeName, reason: parsed.reason });
        continue;
      }
      // A removal needs no definition: an unknown codeName has nothing to
      // remove, a known one is removed regardless of its type.
      if (parsed.write.kind === 'delete') {
        writes.set(codeName, parsed.write);
        continue;
      }
      pending.set(codeName, parsed.write);
    }
    if (pending.size === 0) {
      return { writes, attrMap, rejected, catalogChanged: false };
    }

    const existing = await tx.attribute.findMany({
      where: { projectId, bizType, codeName: { in: [...pending.keys()] } },
    });
    for (const attr of existing) {
      attrMap.set(attr.codeName, attr);
    }

    const displayName = bizType === AttributeBizType.EVENT ? humanize : capitalizeFirstLetter;
    let catalogChanged = false;
    // First pass: restore soft-deleted definitions and collect the missing ones.
    const creations: Prisma.AttributeCreateManyInput[] = [];
    for (const [codeName, write] of pending) {
      const attr = attrMap.get(codeName);
      // Data still arriving under a soft-deleted codeName means the attribute is
      // not dead: restore it (ADR 0016), keeping its data type — values that do
      // not fit it are dropped below like for any attribute.
      if (attr?.deleted) {
        attrMap.set(
          codeName,
          await tx.attribute.update({ where: { id: attr.id }, data: { deleted: false } }),
        );
        catalogChanged = true;
        continue;
      }
      if (attr) {
        continue;
      }
      const verdict = this.judgeAttributeWrite(bizType, undefined, write);
      if (verdict.ok === false) {
        this.logger.warn(`Dropped attribute "${codeName}": ${verdict.reason}.`);
        rejected.push({ codeName, reason: verdict.reason });
        pending.delete(codeName);
        continue;
      }
      if (verdict.skip === true) {
        pending.delete(codeName);
        continue;
      }
      creations.push({
        codeName,
        dataType: verdict.dataType,
        displayName: displayName(codeName),
        projectId,
        bizType,
      });
    }
    if (creations.length > 0) {
      // Two writes can carry the same new codeName at once. Insert with
      // skipDuplicates, in codeName order, so the loser neither aborts its
      // transaction on the unique index nor deadlocks with the winner, then
      // read back what exists: the winner's type is what every write is
      // judged against.
      creations.sort((left, right) => compareCodePoints(left.codeName, right.codeName));
      await tx.attribute.createMany({ data: creations, skipDuplicates: true });
      const created = await tx.attribute.findMany({
        where: {
          projectId,
          bizType,
          codeName: { in: creations.map((creation) => creation.codeName) },
        },
      });
      for (const attr of created) {
        attrMap.set(attr.codeName, attr);
      }
      catalogChanged = true;
    }
    // Second pass: judge every write against the definition it now has.
    for (const [codeName, write] of pending) {
      const verdict = this.judgeAttributeWrite(bizType, attrMap.get(codeName), write);
      if (verdict.ok === false) {
        this.logger.warn(`Dropped attribute "${codeName}": ${verdict.reason}.`);
        rejected.push({ codeName, reason: verdict.reason });
        continue;
      }
      if (verdict.skip === true) {
        continue;
      }
      writes.set(codeName, verdict.write);
    }

    return { writes, attrMap, rejected, catalogChanged };
  }

  /**
   * The one place the ADR 0017 acceptance rules live, shared by the lenient
   * (drop + log) and the strict (throw) paths so they can never diverge:
   * - events take literals or `{set, data_type}` only;
   * - `add` needs a Number definition, `union` / `remove` a List one;
   * - `remove` on an undefined attribute is a no-op that defines nothing;
   * - `data_type` decides the type of a definition being created and never
   *   retypes an existing one — a conflicting `data_type` is a mismatch;
   * - a literal / `set` / `set_once` value must fit the target type without
   *   loss (coerceAttributeValue), the target being the definition's type or,
   *   for a definition about to be created, the write's own.
   */
  private judgeAttributeWrite(
    bizType: AttributeBizType,
    attr: Attribute | undefined,
    write: AttributeWrite,
  ): AttributeWriteVerdict {
    if (bizType === AttributeBizType.EVENT && write.kind !== 'literal' && write.kind !== 'set') {
      return {
        ok: false,
        reason: 'event attributes take a literal value or {set, data_type} only',
      };
    }
    const target = attr ? attr.dataType : inferWriteDataType(write);
    const targetName = BizAttributeTypes[target] ?? String(target);
    // A bucketing attribute's value is derived by the system (ADR 0020 §5):
    // the definition can be created, its values cannot be written.
    if (attr && isBucketingDataType(attr.dataType)) {
      return {
        ok: false,
        reason: `system-generated attribute (${targetName}); its value cannot be set — use another attribute name`,
      };
    }
    if (
      attr &&
      (write.kind === 'set' || write.kind === 'set_once') &&
      write.dataType !== undefined &&
      write.dataType !== attr.dataType
    ) {
      return {
        ok: false,
        reason: `type mismatch: defined as ${targetName}; data_type only applies when an attribute is first created — change the type in the attribute settings`,
      };
    }
    switch (write.kind) {
      case 'add':
        if (target !== BizAttributeTypes.Number) {
          return {
            ok: false,
            reason: `type mismatch: add needs a Number attribute, defined as ${targetName}`,
          };
        }
        return { ok: true, write, dataType: target };
      case 'union':
      case 'remove':
        if (!attr && write.kind === 'remove') {
          return { ok: true, skip: true };
        }
        if (target !== BizAttributeTypes.List) {
          return {
            ok: false,
            reason: `type mismatch: ${write.kind} needs a List attribute, defined as ${targetName}`,
          };
        }
        return { ok: true, write, dataType: target };
      case 'literal':
      case 'set':
      case 'set_once': {
        if (target === BizAttributeTypes.Nil) {
          return { ok: false, reason: 'unsupported value' };
        }
        const coerced = coerceAttributeValue(write.value, target);
        if (!coerced.ok) {
          return { ok: false, reason: `type mismatch: expected ${targetName}` };
        }
        return { ok: true, write: { ...write, value: coerced.value }, dataType: target };
      }
      default:
        return { ok: false, reason: 'unsupported write' };
    }
  }

  /**
   * Strict pre-check for the v2 REST / MCP write path (NOT the SDK identify
   * path): every value must parse and fit, or the request is refused. The SDK
   * ingestion path stays lenient — resolveAttributeWrites drops + logs a bad
   * value so a high-volume identify call never fails on one messy field. The
   * public API has no UI to constrain types and no human to notice a dropped
   * value, so here a rejection throws (per the v2 principle: fulfill exactly
   * or refuse — never silently discard). Same rules, same judge, as the
   * lenient path.
   */
  async assertAttributeValueTypes(
    environmentId: string,
    bizType: AttributeBizType,
    attributes: Record<string, any> | undefined,
  ): Promise<void> {
    if (!attributes) return;
    const codeNames = Object.keys(attributes);
    if (codeNames.length === 0) return;
    const env = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true },
    });
    if (!env) return; // environment validity is enforced by the auth/guard layer
    const defined = await this.prisma.attribute.findMany({
      where: { projectId: env.projectId, bizType, codeName: { in: codeNames } },
    });
    // A null aimed at a provider-owned attribute is a write to it too: refused
    // like any other value, not silently dropped.
    const owned = defined.filter((attr) => attr.source !== 'internal');
    if (owned.length > 0) {
      throw new ValidationError(
        `Attribute${owned.length > 1 ? 's' : ''} ${owned
          .map((attr) => `"${attr.codeName}" (owned by ${attr.source})`)
          .join(
            ', ',
          )} ${owned.length > 1 ? 'are' : 'is'} synced from an integration and cannot be written through the API.`,
      );
    }
    const byCodeName = new Map(defined.map((attr) => [attr.codeName, attr]));
    const failures: string[] = [];
    for (const codeName of codeNames) {
      const parsed = parseAttributeWrite(attributes[codeName]);
      if (parsed.ok === false) {
        failures.push(`"${codeName}" (${parsed.reason})`);
        continue;
      }
      if (parsed.write.kind === 'delete') {
        continue;
      }
      const verdict = this.judgeAttributeWrite(bizType, byCodeName.get(codeName), parsed.write);
      if (verdict.ok === false) {
        failures.push(`"${codeName}" (${verdict.reason})`);
      }
    }
    if (failures.length > 0) {
      throw new ValidationError(
        `Attribute write${failures.length > 1 ? 's' : ''} rejected: ${failures.join(', ')}.`,
      );
    }
  }

  // A retype is safe only if every stored value already validates as the new
  // type — bounded to avoid an unbounded scan on a large project.
  private static readonly RETYPE_SCAN_CAP = 10000;

  /**
   * Guard an attribute `dataType` change: throw unless every stored value in the
   * attribute's scope (across the project) already fits the new type. Lets a
   * wrong type — e.g. inferred from a first mistyped upsert — be corrected while
   * it is still safe, without silently invalidating existing data.
   */
  async assertStoredValuesFitDataType(
    projectId: string,
    bizType: AttributeBizType,
    codeName: string,
    newDataType: number,
  ): Promise<void> {
    const cap = BizService.RETYPE_SCAN_CAP;
    // Only NON-NULL stored values matter (a null is not a value); AnyNull excludes
    // both JSON-null and absent keys.
    const where = { data: { path: [codeName], not: Prisma.AnyNull } };
    let rows: { data: Prisma.JsonValue | null }[];
    if (bizType === AttributeBizType.USER) {
      rows = await this.prisma.bizUser.findMany({
        where: { environment: { projectId }, ...where },
        select: { data: true },
        take: cap + 1,
      });
    } else if (bizType === AttributeBizType.COMPANY) {
      rows = await this.prisma.bizCompany.findMany({
        where: { environment: { projectId }, ...where },
        select: { data: true },
        take: cap + 1,
      });
    } else if (bizType === AttributeBizType.MEMBERSHIP) {
      rows = await this.prisma.bizUserOnCompany.findMany({
        where: { bizCompany: { environment: { projectId } }, ...where },
        select: { data: true },
        take: cap + 1,
      });
    } else {
      return; // event-scoped attributes have no stored end-user values
    }
    if (rows.length > cap) {
      throw new ValidationError(
        `"${codeName}" has too many stored values to safely re-type. Clear its values, or delete and recreate the attribute with the intended type.`,
      );
    }
    // Shape fit, not coercion: a retype rewrites no stored value, so each one
    // must already be what readers of the new type expect. Any string is a
    // String — a stored ISO date-time included; every other type must match
    // exactly.
    const fits = (value: unknown): boolean => {
      if (newDataType === BizAttributeTypes.String) {
        return typeof value === 'string';
      }
      return getAttributeType(value) === newDataType;
    };
    const conflicts = rows.filter(
      (r) => !fits((r.data as Record<string, unknown>)?.[codeName]),
    ).length;
    if (conflicts > 0) {
      const expected = BizAttributeTypes[newDataType] ?? String(newDataType);
      throw new ValidationError(
        `Cannot change the type of "${codeName}" to ${expected}: ${conflicts} stored value(s) do not fit. Fix or clear those values, or delete and recreate the attribute.`,
      );
    }
  }

  private async linkAttributesToEvent(
    tx: Prisma.TransactionClient,
    eventId: string,
    attributeIds: string[],
  ): Promise<void> {
    if (attributeIds.length === 0) {
      return;
    }
    const existing = await tx.attributeOnEvent.findMany({
      where: { eventId, attributeId: { in: attributeIds } },
      select: { attributeId: true },
    });
    const linked = new Set(existing.map((link) => link.attributeId));
    const toLink = attributeIds.filter((id) => !linked.has(id));
    if (toLink.length === 0) {
      return;
    }
    await tx.attributeOnEvent.createMany({
      data: toLink.map((attributeId) => ({ eventId, attributeId })),
      skipDuplicates: true,
    });
  }

  async getBizUser(id: string, environmentId: string, include?: Prisma.BizUserInclude) {
    return await this.prisma.bizUser.findFirst({
      where: {
        externalId: id,
        environmentId,
      },
      include,
    });
  }

  /**
   * Ensure a user exists by external ID, creating if necessary
   * Used during socket connection to guarantee user exists
   * Does not handle attributes - use upsertBizUsers for that
   * Note: Caller must validate environmentId exists before calling
   */
  async ensureBizUser(externalUserId: string, environmentId: string): Promise<BizUser> {
    const existing = await this.prisma.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    if (existing) return existing;

    // The socket-connect creation IS the user's birth — notify user.created
    // here (empty attributes) so the later identify upsert reads as an update.
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true },
    });
    return await this.withEntityChangeEmit(environmentId, async () => {
      const created = await this.prisma.bizUser.create({
        data: {
          externalId: String(externalUserId),
          environmentId,
          data: seedSeenAttributes(
            environment
              ? await this.bucketingSeed(
                  this.prisma,
                  environment.projectId,
                  AttributeBizType.USER,
                  String(externalUserId),
                )
              : {},
          ),
        },
      });
      this.collectEntityChange({ entity: 'user', action: 'created', bizId: created.id });
      return created;
    });
  }

  async upsertUser(
    externalUserId: string,
    environmentId: string,
    attributes?: Record<string, any>,
    companies?: Array<{ id: string; attributes?: Record<string, any> }>,
    memberships?: Array<{
      company: { id: string; attributes?: Record<string, any> };
      attributes?: Record<string, any>;
    }>,
  ) {
    // No runInScope wrap: the only cache write inside this $transaction is
    // `invalidateDeferred(attrs(projectId))`, fired by resolveEntityAttributeWrites
    // when the SDK upsert payload introduces a previously-unseen attribute
    // codeName. A mid-tx invalidate races with concurrent cross-pod readers
    // that could fill the cache from pre-commit DB state — but the freshly
    // created Attribute has no existing condition referencing it (admin
    // couldn't have configured a rule against a codeName that didn't
    // exist yet), so an `attrs` cache slice missing this row produces no
    // observable effect on toggleContents output. The 5-minute TTL self-
    // heals before any new admin-configured rule could reference it.
    return await this.withEntityChangeEmit(environmentId, () =>
      this.prisma.$transaction(async (tx) => {
        // First upsert the user with attributes
        const user = await this.upsertBizUsers(tx, externalUserId, attributes || {}, environmentId);

        if (!user) {
          throw new UnknownError('Failed to upsert user');
        }

        // Companies and memberships in one order by company id: two requests
        // locking the same company rows in different orders would deadlock.
        // The sort is stable, so a company listed under both keeps its
        // company-then-membership sequence.
        const steps = [
          ...(companies ?? []).map((company) => ({
            companyId: company.id,
            attributes: company.attributes || {},
            membership: {},
          })),
          ...(memberships ?? []).map((membership) => ({
            companyId: membership.company.id,
            attributes: membership.company.attributes || {},
            membership: membership.attributes || {},
          })),
        ].sort((left, right) => compareCodePoints(left.companyId, right.companyId));
        for (const step of steps) {
          await this.upsertBizCompanies(
            tx,
            step.companyId,
            externalUserId,
            step.attributes,
            environmentId,
            step.membership,
          );
        }

        return user;
      }),
    );
  }

  async getBizCompany(
    id: string,
    environmentId: string,
    include?: Prisma.BizCompanyInclude,
  ): Promise<BizCompany | null> {
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: {
        externalId: id,
        environmentId,
      },
      include,
    });

    if (!bizCompany) {
      return null;
    }

    return bizCompany;
  }

  /**
   * Assert a `segmentId` used as a list filter belongs to the given project, so a
   * caller can't pass another tenant's segment id (which would otherwise be an
   * existence/type oracle and apply a foreign segment's rules). Mirrors the
   * ownership check in ApiSegmentsService.requireSegment.
   */
  async assertSegmentInProject(segmentId: string, projectId: string): Promise<void> {
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId, projectId, deleted: false },
      select: { id: true },
    });
    if (!segment) {
      throw new SegmentNotFoundError();
    }
  }

  async listBizCompanies(
    environmentId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    include?: Prisma.BizCompanyInclude,
    orderBy?: Prisma.BizCompanyOrderByWithRelationInput[],
    segmentId?: string,
    createdAfter?: string,
    createdBefore?: string,
  ) {
    let where: Prisma.BizCompanyWhereInput = {
      environmentId,
      deleted: false,
      ...createdAtWhere(createdAfter, createdBefore),
    };

    if (segmentId) {
      const segment = await this.prisma.segment.findFirst({ where: { id: segmentId } });
      if (segment && segment.dataType !== SegmentDataType.ALL) {
        if (segment.dataType === SegmentDataType.MANUAL) {
          where.bizCompaniesOnSegment = { some: { segmentId } };
        }
        if (segment.dataType === SegmentDataType.CONDITION) {
          const environment = await this.prisma.environment.findFirst({
            where: { id: environmentId },
          });
          // A company segment may reference user / membership attributes
          // (cross-entity), so load all three attribute types and compile with the
          // cross-entity company filter — mirrors listBizUsers so the API/MCP
          // "list companies by segment" evaluates the SAME rules the web builder
          // authored (a company-attributes-only compile would silently mis-count).
          const attributes = await this.prisma.attribute.findMany({
            where: {
              projectId: environment?.projectId,
              bizType: {
                in: [AttributeBizType.USER, AttributeBizType.COMPANY, AttributeBizType.MEMBERSHIP],
              },
            },
          });
          const filter = createBizCompanyConditionsFilter(segment.data, attributes);
          if (filter) {
            // Nested under AND so the filter's own bizUsersOnCompany / OR keys
            // cannot collide with the base where.
            where = { ...where, AND: [filter] };
          }
        }
      }
    }

    return await findManyCursorConnection(
      (args) => this.prisma.bizCompany.findMany({ where, include, orderBy, ...args }),
      () => this.prisma.bizCompany.count({ where }),
      paginationArgs,
    );
  }

  async getBizCompanyMembership(userId: string, companyId: string, environmentId: string) {
    const membership = await this.prisma.bizUserOnCompany.findFirst({
      where: {
        bizUser: {
          externalId: userId,
          environmentId,
        },
        bizCompany: {
          externalId: companyId,
          environmentId,
        },
      },
    });

    return membership;
  }

  async deleteBizCompanyMembership(membershipId: string) {
    return await this.prisma.bizUserOnCompany.delete({
      where: {
        id: membershipId,
      },
    });
  }

  /**
   * Upsert a single membership (user<->company link) by their already-resolved
   * internal rows, wrapping the shared {@link upsertBizMembership} in a tx. The
   * caller resolves the BizUser/BizCompany first (so it can 404 the right one).
   */
  async upsertBizCompanyMembership(
    projectId: string,
    bizCompanyId: string,
    bizUserId: string,
    attributes: Record<string, any>,
  ): Promise<BizUserOnCompany> {
    return await this.prisma.$transaction((tx) =>
      this.upsertBizMembership(tx, projectId, bizCompanyId, bizUserId, attributes),
    );
  }

  async listBizUsersWithRelations(
    environmentId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    include?: Prisma.BizUserInclude,
    orderBy?: Prisma.BizUserOrderByWithRelationInput[],
    email?: string,
    companyId?: string,
    segmentId?: string,
    createdAfter?: string,
    createdBefore?: string,
  ) {
    const project = await this.prisma.environment.findFirst({
      where: { id: environmentId },
    });
    const projectId = project?.projectId;

    let where: Prisma.BizUserWhereInput = {
      environmentId,
      ...createdAtWhere(createdAfter, createdBefore),
      ...(email && {
        data: {
          path: ['email'],
          equals: email,
        },
      }),
      ...(companyId && {
        bizUsersOnCompany: {
          some: {
            bizCompany: {
              externalId: companyId,
            },
          },
        },
      }),
    };

    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId },
    });

    if (segment && segment.dataType !== SegmentDataType.ALL) {
      const attributes = await this.prisma.attribute.findMany({
        where: {
          projectId,
          bizType: {
            in: [AttributeBizType.USER, AttributeBizType.COMPANY, AttributeBizType.MEMBERSHIP],
          },
        },
      });
      if (segment.dataType === SegmentDataType.MANUAL) {
        where.bizUsersOnSegment = {
          some: {
            segmentId,
          },
        };
      }
      if (segment.dataType === SegmentDataType.CONDITION) {
        const filter = createBizUserConditionsFilter(segment.data, attributes);
        if (filter) {
          // Nested under AND so the filter's own bizUsersOnCompany / OR keys
          // cannot collide with the companyId shortcut applied above.
          where = {
            ...where,
            AND: [filter],
          };
        }
      }
    }

    const baseQuery: Prisma.BizUserFindManyArgs = {
      where,
      include,
      orderBy,
    };

    return await findManyCursorConnection(
      (args) => this.prisma.bizUser.findMany({ ...baseQuery, ...args }),
      () => this.prisma.bizUser.count({ where: baseQuery.where }),
      paginationArgs,
    );
  }

  async queryBizUserEvents(
    query: { environmentId: string; userId: string },
    pagination: Pagination,
    orderBy: BizOrdering,
  ) {
    const { first, last, before, after } = pagination;
    const { environmentId, userId } = query;
    try {
      const where: Prisma.BizEventWhereInput = {
        bizUserId: userId,
        bizUser: { environmentId },
      };

      return await findManyCursorConnection(
        (args) =>
          this.prisma.bizEvent.findMany({
            where,
            include: {
              event: true,
              bizCompany: true,
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : { createdAt: 'desc' },
            ...args,
          }),
        () => this.prisma.bizEvent.count({ where }),
        { first, last, before, after },
      );
    } catch (error) {
      throw new UnknownError(error);
    }
  }

  async queryBizCompanyEvents(
    query: { environmentId: string; companyId: string },
    pagination: Pagination,
    orderBy: BizOrdering,
  ) {
    const { first, last, before, after } = pagination;
    const { environmentId, companyId } = query;
    try {
      // Events reach a company two ways: stamped with its id at creation, or
      // (rows from before stamping) through a session that belongs to it.
      // Both branches must be plain column conditions: an OR over a relation
      // subquery cannot use either index and sequentially scans BizEvent —
      // hundreds of milliseconds per page and per count on a large table. So
      // the environment check and the session lookup happen once, up front,
      // each on its own index, and the planner bitmap-ORs the two branches.
      const company = await this.prisma.bizCompany.findFirst({
        where: { id: companyId, environmentId },
        select: { id: true },
      });
      const sessions = company
        ? await this.prisma.bizSession.findMany({
            where: { bizCompanyId: companyId, environmentId },
            select: { id: true },
          })
        : [];
      const where: Prisma.BizEventWhereInput = company
        ? {
            OR: [
              { bizCompanyId: companyId },
              ...(sessions.length > 0
                ? [{ bizSessionId: { in: sessions.map((session) => session.id) } }]
                : []),
            ],
          }
        : { id: { in: [] } }; // not this environment's company: nothing to show

      return await findManyCursorConnection(
        (args) =>
          this.prisma.bizEvent.findMany({
            where,
            include: {
              event: true,
              bizCompany: true,
              bizUser: true,
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : { createdAt: 'desc' },
            ...args,
          }),
        () => this.prisma.bizEvent.count({ where }),
        { first, last, before, after },
      );
    } catch (error) {
      throw new UnknownError(error);
    }
  }
}
