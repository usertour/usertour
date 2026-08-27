import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { WEBHOOK_EVENT_TOPIC_PREFIX } from '@usertour/constants';
import { QUEUE_INTEGRATION_DELIVERY } from '@/common/consts/queen';
import { mapEvent } from '@/api/events/event.mapper';
import { DELIVERY_ATTEMPTS } from '@/outbound/delivery-backoff';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';
import { BIZ_EVENT_TRACKED, BizEventTrackedPayload } from '@/webhooks/webhook.types';
import { buildIntegrationMessage } from './integration-envelope';
import { IntegrationDeliveryJobData } from './integrations.types';
import { IntegrationsService } from './integrations.service';

type DeliveryJob = { name: string; data: IntegrationDeliveryJobData; opts: Record<string, any> };

const RETRY_JOB_OPTIONS = {
  removeOnComplete: true,
  removeOnFail: 1000,
  attempts: DELIVERY_ATTEMPTS,
  // The worker's backoffStrategy applies the ~24h ladder (delivery-backoff.ts).
  backoff: { type: 'custom' },
};

/**
 * Fans tracked BizEvents out to the environment's enabled integrations —
 * the second subscriber to the BIZ_EVENT_TRACKED domain event (ADR 0011 §3).
 * No topic matching: an enabled integration receives the full event stream
 * (the analytics-destination contract), so the fan-out is simply
 * (event × enabled integration). Payloads are assembled HERE so every retry
 * delivers the same canonical envelope (stable message id = the provider-side
 * dedup key).
 */
@Injectable()
export class IntegrationsListener {
  private readonly logger = new Logger(IntegrationsListener.name);

  constructor(
    @InjectQueue(QUEUE_INTEGRATION_DELIVERY) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly integrationsService: IntegrationsService,
    private readonly ledger: OutboundLedgerService,
  ) {}

  /**
   * Persist the message rows, THEN enqueue — same discipline as the webhook
   * listener: the ledger row is the record of intent, and only jobs whose row
   * exists get enqueued (a concurrently deleted integration drops ITS rows,
   * never the other destinations').
   */
  private async dispatch(jobs: DeliveryJob[]): Promise<void> {
    if (jobs.length === 0) {
      return;
    }
    const persisted = new Set(
      await this.ledger.createMessages(
        jobs.map((job) => ({
          id: job.data.messageId,
          environmentId: job.data.payload.environmentId,
          destination: { integrationId: job.data.integrationId },
          topic: job.data.topic,
          payload: job.data.payload as any,
        })),
      ),
    );
    const enqueueable = jobs.filter((job) => persisted.has(job.data.messageId));
    if (enqueueable.length > 0) {
      await this.queue.addBulk(enqueueable);
    }
  }

  /**
   * The environment's enabled integrations, or [] when there are none OR the
   * project's plan no longer includes integrations. Only SUBSCRIPTION gates
   * live here (enabled, entitlement); AVAILABILITY gates (cooldown) are the
   * processor's business — cooling destinations still get their ledger rows
   * and jobs (ADR 0010 §11 applied to this transport).
   */
  private async activeIntegrationsFor(environmentId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: { environmentId, enabled: true },
      // Hot path: the fan-out only needs ids — key/config are read at
      // delivery time so credential/region fixes apply to retries.
      select: { id: true },
    });
    if (integrations.length === 0) {
      return [];
    }
    if (!(await this.integrationsService.isEntitled(environmentId))) {
      return [];
    }
    return integrations;
  }

  @OnEvent(BIZ_EVENT_TRACKED, { async: true })
  async onBizEventTracked(payload: BizEventTrackedPayload): Promise<void> {
    try {
      const integrations = await this.activeIntegrationsFor(payload.environmentId);
      if (integrations.length === 0) {
        return;
      }

      const bizEvents = await this.prisma.bizEvent.findMany({
        where: { id: { in: payload.bizEventIds } },
        include: { event: true, bizUser: true, bizCompany: true, bizSession: true },
      });

      const jobs: DeliveryJob[] = [];
      for (const bizEvent of bizEvents) {
        const topic = `${WEBHOOK_EVENT_TOPIC_PREFIX}.${bizEvent.event.codeName}`;
        const eventObject = mapEvent(bizEvent);
        for (const integration of integrations) {
          const { messageId, payload: envelope } = buildIntegrationMessage(
            topic,
            payload.environmentId,
            eventObject,
            bizEvent.createdAt,
          );
          jobs.push({
            name: 'deliver',
            data: { integrationId: integration.id, messageId, topic, payload: envelope },
            opts: RETRY_JOB_OPTIONS,
          });
        }
      }

      await this.dispatch(jobs);
    } catch (error) {
      // Side-channel: a failure to enqueue must not propagate to the tracking path.
      this.logger.error('Failed to enqueue integration deliveries', error as Error);
    }
  }
}
