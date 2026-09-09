import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomBytes } from 'node:crypto';
import { Queue } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { SYNC_INTEGRATION_PROVIDERS } from '@usertour/constants';
import type { SyncLocalObject, SyncOutboundField, IntegrationProvider } from '@usertour/types';
import { QUEUE_OBJECT_SYNC, QUEUE_INTEGRATION_DELIVERY } from '@/common/consts/queen';
import { DELIVERY_ATTEMPTS } from '@/outbound/delivery-backoff';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';
import {
  BIZ_ENTITY_CHANGED,
  type BizEntityChangedPayload,
  type EntityChange,
} from '@/webhooks/webhook.types';
import {
  SYNC_OBJECT_UPDATE_TOPIC,
  type SyncObjectUpdateEnvelope,
  type IntegrationDeliveryJobData,
} from '../integrations.types';
import { ProviderConnectionService } from './provider-connection.service';
import {
  SYNC_BACKFILL_JOB,
  ObjectSyncService,
  type MappingWithIntegration,
} from './object-sync.service';

const RETRY_JOB_OPTIONS = {
  removeOnComplete: true,
  removeOnFail: 1000,
  attempts: DELIVERY_ATTEMPTS,
  backoff: { type: 'custom' },
};

/**
 * Outbound incremental sync (ADR 0013 §7, §9): turns a user/company attribute
 * change into a write-back message for every object mapping whose outbound
 * fields it touched — through the shared ledger, so the integration's message
 * log shows it and retries ride the same ladder as every other delivery. A
 * change that came FROM a provider (payload.origin) never goes back out; a
 * record with no link yet is handed to the backfill instead.
 */
@Injectable()
export class ObjectSyncListener {
  private readonly logger = new Logger(ObjectSyncListener.name);

  constructor(
    @InjectQueue(QUEUE_INTEGRATION_DELIVERY) private readonly deliveryQueue: Queue,
    @InjectQueue(QUEUE_OBJECT_SYNC) private readonly syncQueue: Queue,
    private readonly ledger: OutboundLedgerService,
    private readonly connections: ProviderConnectionService,
    private readonly sync: ObjectSyncService,
  ) {}

  @OnEvent(BIZ_ENTITY_CHANGED, { async: true })
  async onBizEntityChanged(payload: BizEntityChangedPayload): Promise<void> {
    try {
      if (
        payload.origin &&
        SYNC_INTEGRATION_PROVIDERS.includes(payload.origin as IntegrationProvider)
      ) {
        return; // the provider's own inbound write — loop gate
      }
      const byObject = new Map<SyncLocalObject, MappingWithIntegration[]>();
      let entitled: boolean | null = null;
      for (const change of payload.changes) {
        if (change.action === 'deleted') {
          continue;
        }
        const localObject: SyncLocalObject = change.entity === 'user' ? 'user' : 'company';
        if (!byObject.has(localObject)) {
          byObject.set(
            localObject,
            await this.sync.activeMappingsFor(payload.environmentId, localObject),
          );
        }
        const mappings = byObject.get(localObject) as MappingWithIntegration[];
        if (mappings.length === 0) {
          continue;
        }
        if (entitled === null) {
          entitled = await this.connections.isEntitled(payload.environmentId);
        }
        if (!entitled) {
          return;
        }
        for (const mapping of mappings) {
          await this.handleChange(payload.environmentId, mapping, change);
        }
      }
    } catch (error) {
      // Side-channel: never propagate into the write path.
      this.logger.error(`Object sync (incremental) failed: ${(error as Error).message}`);
    }
  }

  private async handleChange(
    environmentId: string,
    mapping: MappingWithIntegration,
    change: EntityChange,
  ): Promise<void> {
    const changedKeys = Object.keys(change.previousAttributes ?? {});
    const outbound = mapping.outboundFields as unknown as SyncOutboundField[];
    const touchesOutbound = outbound.some((field) => changedKeys.includes(field.local));
    const matchKey = mapping.matchStrategy === 'email' ? 'email' : null;

    if (change.action === 'created') {
      await this.enqueueBackfill(mapping.id, change.bizId);
      return;
    }
    const writeBack = touchesOutbound
      ? await this.sync.buildWriteBack(mapping, change.bizId)
      : null;
    if (writeBack) {
      await this.dispatchWriteBack(environmentId, mapping.integrationId, writeBack);
      return;
    }
    // Not linked yet (or nothing to write): a record that just gained its match
    // key can be paired now instead of waiting for the next full round.
    if (matchKey && changedKeys.includes(matchKey)) {
      await this.enqueueBackfill(mapping.id, change.bizId);
    }
  }

  private async enqueueBackfill(mappingId: string, localId: string): Promise<void> {
    await this.syncQueue.add(
      SYNC_BACKFILL_JOB,
      { mappingId, localId },
      { ...RETRY_JOB_OPTIONS, jobId: `sync-backfill-${mappingId}-${localId}-${Date.now()}` },
    );
  }

  /** Ledger row first, then the job — the row is the record of intent. */
  private async dispatchWriteBack(
    environmentId: string,
    integrationId: string,
    data: SyncObjectUpdateEnvelope['data'],
  ): Promise<void> {
    const messageId = `imsg_${randomBytes(12).toString('hex')}`;
    const envelope: SyncObjectUpdateEnvelope = {
      id: messageId,
      object: 'integrationMessage',
      type: SYNC_OBJECT_UPDATE_TOPIC,
      createdAt: new Date().toISOString(),
      environmentId,
      data,
    };
    const persisted = await this.ledger.createMessages([
      {
        id: messageId,
        environmentId,
        destination: { integrationId },
        topic: SYNC_OBJECT_UPDATE_TOPIC,
        payload: envelope as unknown as Prisma.InputJsonObject,
      },
    ]);
    if (persisted.length === 0) {
      return;
    }
    const job: IntegrationDeliveryJobData = {
      integrationId,
      messageId,
      topic: SYNC_OBJECT_UPDATE_TOPIC,
      payload: envelope,
    };
    await this.deliveryQueue.add('deliver', job, RETRY_JOB_OPTIONS);
  }
}
