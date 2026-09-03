import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_CRM_SYNC } from '@/common/consts/queen';
import { deliveryBackoffStrategy, type RetryAfterCarrier } from '@/outbound/delivery-backoff';
import { CrmSyncPageJobData, CrmSyncService } from './crm-sync.service';
import { HubspotRateLimitError } from './hubspot-crm-api';

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

  async process(job: Job<CrmSyncPageJobData>): Promise<void> {
    try {
      await this.sync.processPage(job.data);
    } catch (error) {
      if (error instanceof HubspotRateLimitError) {
        (error as unknown as RetryAfterCarrier).retryAfterMs = error.retryAfterMs;
      }
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<CrmSyncPageJobData> | undefined, error: Error): Promise<void> {
    if (!job) {
      return;
    }
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    this.logger.warn(
      `CRM sync page failed (mapping ${job.data.mappingId}, page ${job.data.page}, attempt ${job.attemptsMade}${
        exhausted ? ', giving up' : ''
      }): ${error.message}`,
    );
    if (exhausted) {
      await this.sync.abandonRound(job.data);
    }
  }
}
