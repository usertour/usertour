import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { INTEGRATION_TEST_TOPIC } from '@usertour/constants';
import { QUEUE_INTEGRATION_DELIVERY, QUEUE_INTEGRATION_RECONCILE } from '@/common/consts/queen';
import {
  RECONCILE_BATCH_SIZE,
  RECONCILE_ORPHAN_AFTER_MS,
  rebuildAttemptBudget,
} from '@/outbound/delivery-backoff';
import { OutboundLedgerService, maxLoggedAttempt } from '@/outbound/outbound-ledger.service';
import { IntegrationDeliveryJobData, IntegrationMessageEnvelope } from './integrations.types';

// Offset from the webhook sweep (:20) so the two hourly ledger scans don't
// land on the database in the same minute.
export const INTEGRATION_RECONCILE_CRON_PATTERN = '35 * * * *'; // hourly at :35

/**
 * The integration transport's arm of the crash-consistency backstop
 * (ADR 0011 §5): PENDING integration messages silent past the orphan
 * threshold are presumed lost with Redis and re-queued as continuation jobs.
 * Claim/budget/jobId discipline is identical to the webhook sweep — only the
 * queue and the job shape differ.
 */
@Processor(QUEUE_INTEGRATION_RECONCILE)
export class IntegrationsReconcileProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(IntegrationsReconcileProcessor.name);

  constructor(
    @InjectQueue(QUEUE_INTEGRATION_RECONCILE) private readonly reconcileQueue: Queue,
    @InjectQueue(QUEUE_INTEGRATION_DELIVERY) private readonly deliveryQueue: Queue,
    private readonly ledger: OutboundLedgerService,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      const existingJobs = await this.reconcileQueue.getJobSchedulers();
      await Promise.all(existingJobs.map((job) => this.reconcileQueue.removeJobScheduler(job.id)));
      await this.reconcileQueue.add(
        'reconcile-integration-messages',
        {},
        {
          repeat: { pattern: INTEGRATION_RECONCILE_CRON_PATTERN },
          jobId: 'reconcile-integration-messages',
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to schedule integration reconcile job: ${error}`);
    }
  }

  async process(_job: Job): Promise<void> {
    const cutoff = new Date(Date.now() - RECONCILE_ORPHAN_AFTER_MS);
    const orphans = await this.ledger.findOrphanedPendingMessages(
      'integration',
      cutoff,
      RECONCILE_BATCH_SIZE,
    );
    if (orphans.length === 0) {
      return;
    }

    let requeued = 0;
    for (const message of orphans) {
      const claimStamp = await this.ledger.claimForReconcile(message.id, message.updatedAt);
      if (!claimStamp) {
        continue; // Moved under us: job alive after all, or another sweep won.
      }
      const attemptsLogged = maxLoggedAttempt(message.deliveries);
      const jobData: IntegrationDeliveryJobData = {
        integrationId: message.integrationId as string,
        messageId: message.id,
        topic: message.topic,
        payload: message.payload as unknown as IntegrationMessageEnvelope,
        // Deliberately NOT manual — an orphan swept up later has no one
        // watching and must respect the cooldown gate like ordinary traffic.
        attemptOffset: attemptsLogged,
      };
      try {
        await this.deliveryQueue.add('deliver', jobData, {
          removeOnComplete: true,
          removeOnFail: 1000,
          attempts: rebuildAttemptBudget(
            message.topic,
            [INTEGRATION_TEST_TOPIC],
            message.deliveries,
            attemptsLogged,
          ),
          backoff: { type: 'custom' },
          // Keyed by the claim generation — an ambiguous add can't
          // double-queue within this claim.
          jobId: `reconcile-${message.id}-${claimStamp.getTime()}`,
        });
        requeued += 1;
      } catch (error) {
        // Claim stays: the row waits out one more orphan window.
        this.logger.error(`Failed to re-queue orphaned message ${message.id}`, error as Error);
      }
    }
    this.logger.log(
      `Integration reconcile sweep re-queued ${requeued}/${orphans.length} orphaned PENDING messages`,
    );
  }
}
