import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_CRM_SYNC } from '@/common/consts/queen';
import { deliveryBackoffStrategy, type RetryAfterCarrier } from '@/outbound/delivery-backoff';
import {
  CRM_SYNC_BACKFILL_JOB,
  type CrmBackfillJobData,
  type CrmSyncPageJobData,
  CrmSyncService,
} from './crm-sync.service';
import { HubspotRateLimitError } from './hubspot-crm-api';
import { CrmGrantRevokedError } from './crm-connection.service';

/**
 * Runs one full-sync page per job (ADR 0013 §7). Concurrency stays low:
 * HubSpot's limits are per account, and a mapping's pages are sequential by
 * construction (each page enqueues the next). A provider rate limit carries
 * its Retry-After into the shared delivery backoff ladder.
 */
@Processor(QUEUE_CRM_SYNC, {
  concurrency: 2,
  settings: { backoffStrategy: deliveryBackoffStrategy },
})
export class CrmSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CrmSyncProcessor.name);

  constructor(private readonly sync: CrmSyncService) {
    super();
  }

  async process(job: Job<CrmSyncPageJobData | CrmBackfillJobData>): Promise<void> {
    try {
      if (job.name === CRM_SYNC_BACKFILL_JOB) {
        await this.sync.backfillRecord(job.data as CrmBackfillJobData);
      } else {
        await this.sync.processPage(job.data as CrmSyncPageJobData);
      }
    } catch (error) {
      if (error instanceof HubspotRateLimitError) {
        (error as unknown as RetryAfterCarrier).retryAfterMs = error.retryAfterMs;
      }
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<CrmSyncPageJobData | CrmBackfillJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) {
      return;
    }
    // A job failed for stalling is not retried and does not bump attemptsMade,
    // so it has to count as exhausted here or the round would never close.
    const stalled = /stalled/i.test(error.message);
    const exhausted = stalled || job.attemptsMade >= (job.opts.attempts ?? 1);
    this.logger.warn(
      `CRM sync ${job.name} failed (mapping ${job.data.mappingId}, attempt ${job.attemptsMade}${
        exhausted ? ', giving up' : ''
      }): ${error.message}`,
    );
    if (error instanceof CrmGrantRevokedError) {
      // Definitive: switch the integration off now rather than after the ladder.
      await this.sync.handleGrantRevoked(job.data.mappingId);
    }
    if (
      (exhausted || error instanceof CrmGrantRevokedError) &&
      job.name !== CRM_SYNC_BACKFILL_JOB
    ) {
      await this.sync.abandonRound(job.data as CrmSyncPageJobData, error.message);
    }
  }
}
