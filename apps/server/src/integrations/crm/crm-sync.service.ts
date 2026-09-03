import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { IntegrationObjectMapping } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import type {
  CrmInboundField,
  CrmLocalObject,
  CrmOutboundField,
  CrmRemoteObject,
} from '@usertour/types';
import { BizService } from '@/biz/biz.service';
import { QUEUE_CRM_SYNC } from '@/common/consts/queen';
import { FeatureRequiresLicenseError, ValidationError } from '@/common/errors/errors';
import { DELIVERY_ATTEMPTS } from '@/outbound/delivery-backoff';
import { CrmConnectionService } from './crm-connection.service';
import {
  attributeBizTypeFor,
  CRM_REMOTE_GROUP,
  hubspotObjectTypeFor,
  remotePropertyDefinitionFor,
} from './crm-mapping.types';
import { localToRemoteValue, remoteToLocalValue, remoteTypeForDataType } from './crm-values';
import {
  batchUpdateHubspotObjects,
  ensureHubspotProperty,
  ensureHubspotPropertyGroup,
  type HubspotObject,
  listHubspotObjectsPage,
} from './hubspot-crm-api';

/** One provider page of a full-sync round; the job enqueues its successor. */
export interface CrmSyncPageJobData {
  mappingId: string;
  sessionId: string;
  page: number;
  after?: string;
}

export const CRM_SYNC_PAGE_JOB = 'page';

/** A round older than this with no completion is presumed dead and may be restarted. */
const ROUND_STALE_MS = 2 * 60 * 60 * 1000;
/** Scheduler cadence target for the recurring full sync (ADR 0013 §7). */
export const FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface LocalRecord {
  id: string;
  externalId: string;
  data: Record<string, unknown>;
}

interface PairedRecord {
  remote: HubspotObject;
  local: LocalRecord;
}

type MappingWithIntegration = IntegrationObjectMapping & {
  integration: {
    id: string;
    provider: string;
    enabled: boolean;
    environmentId: string;
    oauthCredentials: string | null;
    remoteState: Prisma.JsonValue;
    environment: { projectId: string };
  };
};

interface CrmRemoteStateShape {
  account?: { domain?: string };
  /** Provider properties already created for write-back, keyed by remote name. */
  properties?: Record<string, true>;
}

/**
 * Full-sync rounds (ADR 0013 §7): page the provider object, pair records
 * with local ones (link, never create), apply provider-owned fields inward
 * with the provider as write origin, and batch the write-back fields
 * outward. One round per mapping at a time; pages chain through the queue so
 * a rate-limited page backs off without holding a worker.
 */
@Injectable()
export class CrmSyncService {
  private readonly logger = new Logger(CrmSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connections: CrmConnectionService,
    private readonly biz: BizService,
    @InjectQueue(QUEUE_CRM_SYNC) private readonly queue: Queue,
  ) {}

  // ---------------------------------------------------------------------------
  // Round lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Claim a round and enqueue its first page. `manual` callers get errors
   * (dashboard feedback); the scheduler and save hooks get a quiet no-op when
   * the mapping cannot sync right now.
   */
  async startFullSync(
    mappingId: string,
    options: { manual: boolean; integrationId?: string },
  ): Promise<IntegrationObjectMapping> {
    const mapping = await this.loadMapping(mappingId);
    if (!mapping || (options.integrationId && mapping.integrationId !== options.integrationId)) {
      throw new ValidationError('Mapping not found.');
    }
    const refuse = (message: string) => {
      if (options.manual) {
        throw new ValidationError(message);
      }
      return mapping;
    };
    if (!mapping.enabled) {
      return refuse('Enable the mapping before syncing.');
    }
    if (!mapping.integration.oauthCredentials || !mapping.integration.enabled) {
      return refuse('Connect the integration before syncing.');
    }
    if (!(await this.connections.isEntitled(mapping.integration.environmentId))) {
      if (options.manual) {
        throw new FeatureRequiresLicenseError();
      }
      return mapping;
    }
    const now = new Date();
    const staleBefore = new Date(now.getTime() - ROUND_STALE_MS);
    const sessionId = randomUUID();
    // Conditional claim: a live round (stamp younger than the stale window)
    // keeps its session; a dead one is taken over.
    const claimed = await this.prisma.integrationObjectMapping.updateMany({
      where: {
        id: mappingId,
        OR: [{ fullSyncStartedAt: null }, { fullSyncStartedAt: { lt: staleBefore } }],
      },
      data: {
        fullSyncSessionId: sessionId,
        fullSyncStartedAt: now,
        matchedCount: 0,
        unresolvedCount: 0,
      },
    });
    if (claimed.count === 0) {
      return refuse('A full sync is already in progress.');
    }
    await this.enqueuePage({ mappingId, sessionId, page: 1 });
    return await this.prisma.integrationObjectMapping.findUniqueOrThrow({
      where: { id: mappingId },
    });
  }

  /** Release a round whose page job exhausted its attempts, so a later start is not blocked for the stale window. */
  async abandonRound(data: CrmSyncPageJobData): Promise<void> {
    await this.prisma.integrationObjectMapping.updateMany({
      where: { id: data.mappingId, fullSyncSessionId: data.sessionId },
      data: { fullSyncStartedAt: null },
    });
    this.logger.warn(
      `CRM full sync abandoned: mapping ${data.mappingId} session ${data.sessionId} page ${data.page}`,
    );
  }

  private async enqueuePage(data: CrmSyncPageJobData): Promise<void> {
    await this.queue.add(CRM_SYNC_PAGE_JOB, data, {
      jobId: `crm-${data.mappingId}-${data.sessionId}-${data.page}`,
      attempts: DELIVERY_ATTEMPTS,
      backoff: { type: 'custom' },
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  }

  // ---------------------------------------------------------------------------
  // One page
  // ---------------------------------------------------------------------------

  async processPage(data: CrmSyncPageJobData): Promise<void> {
    const mapping = await this.loadMapping(data.mappingId);
    if (!mapping || mapping.fullSyncSessionId !== data.sessionId) {
      return; // deleted, or superseded by a newer round
    }
    if (!mapping.enabled || !mapping.integration.oauthCredentials) {
      await this.abandonRound(data);
      return;
    }
    const remoteObject = mapping.remoteObject as CrmRemoteObject;
    const localObject = mapping.localObject as CrmLocalObject;
    const inbound = mapping.inboundFields as unknown as CrmInboundField[];
    const outbound = mapping.outboundFields as unknown as CrmOutboundField[];
    const matchField =
      mapping.matchStrategy === 'email' ? 'email' : (mapping.matchRemoteField as string);
    const properties = Array.from(new Set([matchField, ...inbound.map((field) => field.remote)]));
    const objectType = hubspotObjectTypeFor(remoteObject);
    const token = await this.connections.getAccessToken(mapping.integrationId);

    const page = await listHubspotObjectsPage(token, objectType, { properties, after: data.after });
    const pairs = await this.pairRecords(mapping, page.results, matchField);
    await this.upsertLinks(mapping.id, pairs, mapping.matchStrategy);

    const { environmentId } = mapping.integration;
    const { projectId } = mapping.integration.environment;
    const bizType = attributeBizTypeFor(localObject);
    const attributeCodeNames = [
      ...inbound.map((field) => field.local),
      ...outbound.map((field) => field.local),
    ];
    const attributes = attributeCodeNames.length
      ? await this.prisma.attribute.findMany({
          where: { projectId, bizType, codeName: { in: attributeCodeNames } },
        })
      : [];
    const attributeByCode = new Map(attributes.map((attribute) => [attribute.codeName, attribute]));

    if (inbound.length > 0 && pairs.length > 0) {
      await this.applyInbound(mapping, pairs, inbound, attributeByCode);
    }
    if (outbound.length > 0 && pairs.length > 0) {
      await this.applyOutbound(mapping, token, pairs, outbound, attributeByCode);
    }

    await this.prisma.integrationObjectMapping.updateMany({
      where: { id: mapping.id, fullSyncSessionId: data.sessionId },
      data: {
        matchedCount: { increment: pairs.length },
        unresolvedCount: { increment: page.results.length - pairs.length },
      },
    });

    const after = page.paging?.next?.after;
    if (after) {
      await this.enqueuePage({ ...data, page: data.page + 1, after });
      return;
    }
    await this.prisma.integrationObjectMapping.updateMany({
      where: { id: mapping.id, fullSyncSessionId: data.sessionId },
      data: { fullSyncStartedAt: null, lastFullSyncAt: new Date() },
    });
    this.logger.log(
      `CRM full sync complete: mapping ${mapping.id} (${remoteObject} ↔ ${localObject}), ${data.page} page(s), env ${environmentId}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Pairing (ADR 0013 §5): link, never create
  // ---------------------------------------------------------------------------

  private async pairRecords(
    mapping: MappingWithIntegration,
    remotes: HubspotObject[],
    matchField: string,
  ): Promise<PairedRecord[]> {
    const byEmail = mapping.matchStrategy === 'email';
    const remoteByKey = new Map<string, HubspotObject>();
    for (const remote of remotes) {
      const raw = remote.properties[matchField];
      if (!raw) {
        continue;
      }
      const key = byEmail ? raw.trim().toLowerCase() : raw.trim();
      // Two remote records with the same key: the first one keeps the pairing.
      if (key && !remoteByKey.has(key)) {
        remoteByKey.set(key, remote);
      }
    }
    if (remoteByKey.size === 0) {
      return [];
    }
    const keys = Array.from(remoteByKey.keys());
    const locals = byEmail
      ? await this.findUsersByEmail(mapping.integration.environmentId, keys)
      : await this.findByExternalId(
          mapping.localObject as CrmLocalObject,
          mapping.integration.environmentId,
          keys,
        );
    const pairs: PairedRecord[] = [];
    const seenRemote = new Set<string>();
    for (const { key, local } of locals) {
      const remote = remoteByKey.get(key);
      if (remote && !seenRemote.has(remote.id)) {
        seenRemote.add(remote.id);
        pairs.push({ remote, local });
      }
    }
    return pairs;
  }

  /** Users by lowercased email attribute; the first-created user wins a duplicate email. */
  private async findUsersByEmail(
    environmentId: string,
    emails: string[],
  ): Promise<Array<{ key: string; local: LocalRecord }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; externalId: string; data: Record<string, unknown> | null; email: string }>
    >(Prisma.sql`
      SELECT "id", "externalId", "data", lower("data"->>'email') AS "email"
      FROM "BizUser"
      WHERE "environmentId" = ${environmentId}
        AND "deleted" = false
        AND lower("data"->>'email') IN (${Prisma.join(emails)})
      ORDER BY "createdAt" ASC
    `);
    const seen = new Set<string>();
    const result: Array<{ key: string; local: LocalRecord }> = [];
    for (const row of rows) {
      if (seen.has(row.email)) {
        continue;
      }
      seen.add(row.email);
      result.push({
        key: row.email,
        local: { id: row.id, externalId: row.externalId, data: row.data ?? {} },
      });
    }
    return result;
  }

  private async findByExternalId(
    localObject: CrmLocalObject,
    environmentId: string,
    externalIds: string[],
  ): Promise<Array<{ key: string; local: LocalRecord }>> {
    const where = { environmentId, deleted: false, externalId: { in: externalIds } };
    const select = { id: true, externalId: true, data: true };
    const rows =
      localObject === 'user'
        ? await this.prisma.bizUser.findMany({ where, select })
        : await this.prisma.bizCompany.findMany({ where, select });
    return rows.map((row) => ({
      key: row.externalId,
      local: {
        id: row.id,
        externalId: row.externalId,
        data: (row.data as Record<string, unknown>) ?? {},
      },
    }));
  }

  /** Links follow the current match: a remote record re-paired elsewhere moves its link. */
  private async upsertLinks(
    mappingId: string,
    pairs: PairedRecord[],
    matchedBy: string,
  ): Promise<void> {
    const now = new Date();
    for (const pair of pairs) {
      const write = () =>
        this.prisma.integrationObjectLink.upsert({
          where: { mappingId_localId: { mappingId, localId: pair.local.id } },
          create: {
            mappingId,
            localId: pair.local.id,
            remoteId: pair.remote.id,
            matchedBy,
            lastSyncedAt: now,
          },
          update: { remoteId: pair.remote.id, matchedBy, lastSyncedAt: now },
        });
      try {
        await write();
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002') {
          throw error;
        }
        // The remote id is held by another local record: that pairing is stale.
        await this.prisma.integrationObjectLink.deleteMany({
          where: { mappingId, remoteId: pair.remote.id },
        });
        await write();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Field application
  // ---------------------------------------------------------------------------

  /** Inbound fields, written through the canonical attribute path with the provider as origin. */
  private async applyInbound(
    mapping: MappingWithIntegration,
    pairs: PairedRecord[],
    inbound: CrmInboundField[],
    attributeByCode: Map<string, { dataType: number }>,
  ): Promise<void> {
    const { provider, environmentId } = mapping.integration;
    const { projectId } = mapping.integration.environment;
    const isUser = mapping.localObject === 'user';
    // One collection scope for the page: writes commit individually, the
    // entity-change emit fires once afterwards, tagged with the provider.
    await this.biz.withEntityChangeEmit(
      environmentId,
      async () => {
        for (const pair of pairs) {
          const values: Record<string, unknown> = {};
          for (const field of inbound) {
            const dataType = attributeByCode.get(field.local)?.dataType;
            if (dataType === undefined) {
              continue; // definition vanished; the mapping save path recreates it
            }
            values[field.local] = remoteToLocalValue(
              pair.remote.properties[field.remote],
              dataType,
            );
          }
          if (isUser) {
            await this.biz.upsertBizUsers(
              this.prisma,
              pair.local.externalId,
              values,
              environmentId,
              {
                origin: provider,
              },
            );
          } else {
            await this.biz.upsertBizCompanyAttributes(
              this.prisma,
              projectId,
              environmentId,
              pair.local.externalId,
              values,
              { origin: provider },
            );
          }
        }
      },
      provider,
    );
  }

  /** Outbound fields, batched to the provider; write-back properties are created on first use. */
  private async applyOutbound(
    mapping: MappingWithIntegration,
    token: string,
    pairs: PairedRecord[],
    outbound: CrmOutboundField[],
    attributeByCode: Map<string, { codeName: string; displayName: string; dataType: number }>,
  ): Promise<void> {
    const objectType = hubspotObjectTypeFor(mapping.remoteObject as CrmRemoteObject);
    await this.ensureRemoteProperties(mapping, token, outbound, attributeByCode);
    const inputs = pairs.map((pair) => ({
      id: pair.remote.id,
      properties: Object.fromEntries(
        outbound.map((field) => {
          const dataType = attributeByCode.get(field.local)?.dataType ?? 0;
          // An empty string clears a HubSpot property; null is rejected by the API.
          return [
            field.remote,
            localToRemoteValue(pair.local.data[field.local], remoteTypeForDataType(dataType)) ?? '',
          ];
        }),
      ),
    }));
    await batchUpdateHubspotObjects(token, objectType, inputs);
  }

  /** Create the write-back group and properties once; remember them on the integration row. */
  private async ensureRemoteProperties(
    mapping: MappingWithIntegration,
    token: string,
    outbound: CrmOutboundField[],
    attributeByCode: Map<string, { codeName: string; displayName: string; dataType: number }>,
  ): Promise<void> {
    const state = ((mapping.integration.remoteState as CrmRemoteStateShape | null) ??
      {}) as CrmRemoteStateShape;
    const known = state.properties ?? {};
    const missing = outbound.filter(
      (field) => !known[field.remote] && attributeByCode.has(field.local),
    );
    if (missing.length === 0) {
      return;
    }
    const objectType = hubspotObjectTypeFor(mapping.remoteObject as CrmRemoteObject);
    await ensureHubspotPropertyGroup(token, objectType, CRM_REMOTE_GROUP);
    for (const field of missing) {
      const attribute = attributeByCode.get(field.local) as {
        codeName: string;
        displayName: string;
        dataType: number;
      };
      await ensureHubspotProperty(
        token,
        objectType,
        remotePropertyDefinitionFor(mapping.localObject as CrmLocalObject, attribute),
      );
      known[field.remote] = true;
    }
    const nextState: CrmRemoteStateShape = { ...state, properties: known };
    await this.prisma.integration.update({
      where: { id: mapping.integrationId },
      data: { remoteState: nextState as Prisma.InputJsonObject },
    });
    mapping.integration.remoteState = nextState as Prisma.JsonValue;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async loadMapping(mappingId: string): Promise<MappingWithIntegration | null> {
    return (await this.prisma.integrationObjectMapping.findUnique({
      where: { id: mappingId },
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
            enabled: true,
            environmentId: true,
            oauthCredentials: true,
            remoteState: true,
            environment: { select: { projectId: true } },
          },
        },
      },
    })) as MappingWithIntegration | null;
  }
}
