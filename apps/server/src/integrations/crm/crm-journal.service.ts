import { Injectable, Logger } from '@nestjs/common';
import type { Integration, Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import type { CrmInboundField, CrmRemoteObject } from '@usertour/types';
import { RedisService } from '@/shared/redis.service';
import { CrmConnectionService } from './crm-connection.service';
import { hubspotObjectTypeFor, matchRemotePropertyFor } from './crm-mapping.types';
import { CrmSyncService, type MappingWithIntegration } from './crm-sync.service';
import { batchReadHubspotObjects } from './hubspot-crm-api';
import {
  createJournalSubscription,
  deleteJournalSubscription,
  deletePortalJournalSubscriptions,
  fetchJournalPage,
  HUBSPOT_OBJECT_TYPE_IDS,
  type HubspotJournalEvent,
  type HubspotJournalSubscription,
  journalLatest,
  journalNext,
  listJournalSubscriptions,
} from './hubspot-journal-api';

const PROVIDER = 'hubspot';
const OFFSET_KEY = 'crm:hubspot:journal:offset';
/** Redis TTL for the stored offset — the journal itself keeps 3 days. */
const OFFSET_TTL_SECONDS = 3 * 24 * 60 * 60;
/** Pages drained per poll; the rest waits for the next tick. */
const MAX_PAGES_PER_POLL = 20;
const SUBSCRIBED_ACTIONS = ['CREATE', 'UPDATE', 'MERGE'];

const OBJECT_TYPE_FOR_ID: Record<string, CrmRemoteObject> = {
  [HUBSPOT_OBJECT_TYPE_IDS.contact]: 'contact',
  [HUBSPOT_OBJECT_TYPE_IDS.company]: 'company',
};

interface JournalRemoteState {
  journal?: { subscriptions?: Record<string, number> };
}

/**
 * Inbound incremental sync over the provider's change journal (ADR 0013 §7).
 * Subscriptions are kept in step with the mappings (one per account and
 * object type, filtered to the union of match and inbound fields); a poller
 * drains the app-wide journal from the last stored offset and applies each
 * touched record through the same pairing path a full-sync page uses. Pull
 * model: no public inbound URL, so self-hosted instances on private networks
 * sync incrementally too.
 */
@Injectable()
export class CrmJournalService {
  private readonly logger = new Logger(CrmJournalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly connections: CrmConnectionService,
    private readonly sync: CrmSyncService,
  ) {}

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  /** Reconcile the account's subscriptions with its enabled mappings. Best-effort for callers. */
  async syncSubscriptions(integrationId: string): Promise<void> {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
      include: { objectMappings: { where: { enabled: true } } },
    });
    if (!integration || integration.provider !== PROVIDER || !integration.remoteAccountId) {
      return;
    }
    const portalId = Number(integration.remoteAccountId);
    const wanted = new Map<string, string[]>();
    for (const mapping of integration.objectMappings) {
      const objectTypeId = HUBSPOT_OBJECT_TYPE_IDS[mapping.remoteObject as CrmRemoteObject];
      const matchField = matchRemotePropertyFor(mapping);
      const fields = new Set(wanted.get(objectTypeId) ?? []);
      if (matchField) {
        fields.add(matchField);
      }
      for (const field of mapping.inboundFields as unknown as CrmInboundField[]) {
        fields.add(field.remote);
      }
      wanted.set(objectTypeId, Array.from(fields).sort());
    }

    const token = await this.connections.getAppAccessToken(PROVIDER);
    const existing = (await listJournalSubscriptions(token)).filter(
      (subscription) => subscription.portalId === portalId,
    );
    const stored: Record<string, number> = {};
    for (const [objectTypeId, properties] of wanted) {
      const current = existing.find((subscription) => subscription.objectTypeId === objectTypeId);
      if (current && this.sameSubscription(current, properties)) {
        stored[objectTypeId] = current.id;
        continue;
      }
      if (current) {
        await deleteJournalSubscription(token, current.id);
      }
      const created = await createJournalSubscription(token, {
        portalId,
        objectTypeId,
        actions: SUBSCRIBED_ACTIONS,
        properties,
      });
      stored[objectTypeId] = created.id;
    }
    // Object types no longer mapped lose their subscription.
    for (const subscription of existing) {
      if (!wanted.has(subscription.objectTypeId)) {
        await deleteJournalSubscription(token, subscription.id);
      }
    }
    await this.rememberSubscriptions(integration, stored);
  }

  /** Drop every subscription for the account (disconnect). Best-effort for callers. */
  async removeSubscriptions(
    integration: Pick<Integration, 'id' | 'provider' | 'remoteAccountId'>,
  ): Promise<void> {
    if (integration.provider !== PROVIDER || !integration.remoteAccountId) {
      return;
    }
    const token = await this.connections.getAppAccessToken(PROVIDER);
    await deletePortalJournalSubscriptions(token, Number(integration.remoteAccountId));
    await this.rememberSubscriptions(integration, {});
  }

  private sameSubscription(
    subscription: HubspotJournalSubscription,
    properties: string[],
  ): boolean {
    const have = [...subscription.properties].sort();
    return (
      have.length === properties.length &&
      have.every((name, index) => name === properties[index]) &&
      SUBSCRIBED_ACTIONS.every((action) => subscription.actions.includes(action))
    );
  }

  private async rememberSubscriptions(
    integration: Pick<Integration, 'id'>,
    subscriptions: Record<string, number>,
  ): Promise<void> {
    const row = await this.prisma.integration.findUnique({
      where: { id: integration.id },
      select: { remoteState: true },
    });
    const state = ((row?.remoteState as JournalRemoteState | null) ?? {}) as JournalRemoteState &
      Record<string, unknown>;
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { remoteState: { ...state, journal: { subscriptions } } as Prisma.InputJsonObject },
    });
  }

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------

  /**
   * Drain new journal pages since the stored offset. With no stored offset the
   * poller starts at the latest page (history is the full sync's job). Returns
   * the number of events applied.
   */
  async poll(): Promise<number> {
    if (!this.connections.isProviderConfigured(PROVIDER)) {
      return 0;
    }
    const token = await this.connections.getAppAccessToken(PROVIDER);
    let offset = await this.redis.get(OFFSET_KEY);
    let applied = 0;
    for (let pages = 0; pages < MAX_PAGES_PER_POLL; pages++) {
      const ref = offset ? await journalNext(token, offset) : await journalLatest(token);
      if (!ref) {
        break;
      }
      const page = await fetchJournalPage(ref.url);
      applied += await this.applyEvents(page.journalEvents ?? []);
      offset = page.offset || ref.currentOffset;
      await this.redis.setex(OFFSET_KEY, OFFSET_TTL_SECONDS, offset);
    }
    return applied;
  }

  /** Group events by account and object type, re-read the touched records, and pair/apply them. */
  private async applyEvents(events: HubspotJournalEvent[]): Promise<number> {
    const buckets = new Map<
      string,
      { portalId: number; remoteObject: CrmRemoteObject; ids: Set<string> }
    >();
    for (const event of events) {
      const remoteObject = OBJECT_TYPE_FOR_ID[event.objectTypeId];
      if (!remoteObject || event.type !== 'crmObject') {
        continue;
      }
      const key = `${event.portalId}:${remoteObject}`;
      const bucket = buckets.get(key) ?? {
        portalId: event.portalId,
        remoteObject,
        ids: new Set<string>(),
      };
      bucket.ids.add(String(event.objectId));
      buckets.set(key, bucket);
    }
    if (buckets.size === 0) {
      return 0;
    }
    const portalIds = Array.from(
      new Set(Array.from(buckets.values()).map((b) => String(b.portalId))),
    );
    const integrations = await this.prisma.integration.findMany({
      where: {
        provider: PROVIDER,
        enabled: true,
        remoteAccountId: { in: portalIds },
        oauthCredentials: { not: null },
      },
      select: { id: true, environmentId: true, remoteAccountId: true },
    });
    let applied = 0;
    for (const integration of integrations) {
      if (!(await this.connections.isEntitled(integration.environmentId))) {
        continue;
      }
      for (const bucket of buckets.values()) {
        if (String(bucket.portalId) !== integration.remoteAccountId) {
          continue;
        }
        const mappings = (
          await this.sync.activeMappingsFor(
            integration.environmentId,
            bucket.remoteObject === 'contact' ? 'user' : 'company',
          )
        ).filter((mapping) => mapping.integrationId === integration.id);
        for (const mapping of mappings) {
          applied += await this.applyBucket(mapping, Array.from(bucket.ids));
        }
      }
    }
    return applied;
  }

  private async applyBucket(mapping: MappingWithIntegration, ids: string[]): Promise<number> {
    const inbound = mapping.inboundFields as unknown as CrmInboundField[];
    const matchField = matchRemotePropertyFor(mapping);
    const properties = Array.from(new Set([matchField, ...inbound.map((field) => field.remote)]));
    const token = await this.connections.getAccessToken(mapping.integrationId);
    const objectType = hubspotObjectTypeFor(mapping.remoteObject as CrmRemoteObject);
    let applied = 0;
    for (let start = 0; start < ids.length; start += 100) {
      const remotes = await batchReadHubspotObjects(
        token,
        objectType,
        ids.slice(start, start + 100),
        properties,
      );
      const pairs = await this.sync.applyRecords(mapping, token, remotes);
      applied += pairs.length;
    }
    this.logger.debug(
      `Journal: mapping ${mapping.id} applied ${applied}/${ids.length} changed records`,
    );
    return applied;
  }
}
