import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { WEBHOOK_CONTENT_PUBLISHED_TOPIC } from '@usertour/constants';
import { QUEUE_WEBHOOK_DELIVERY } from '@/common/consts/queen';
import { mapCompany } from '@/api/companies/companies.mapper';
import { mapEvent } from '@/api/events/event.mapper';
import { mapUser } from '@/api/users/users.mapper';
import { DELIVERY_ATTEMPTS } from './webhook-backoff';
import { buildWebhookMessage } from './webhook-envelope';
import {
  buildEntityTopic,
  buildEventTopic,
  matchesSubscription,
  matchesTopic,
  subscribesToEventTopics,
} from './webhook-topics';
import {
  BIZ_ENTITY_CHANGED,
  BIZ_EVENT_TRACKED,
  BizEntityChangedPayload,
  BizEventTrackedPayload,
  CONTENT_PUBLISHED,
  ContentPublishedPayload,
  EntityChange,
  WebhookDeliveryJobData,
} from './webhook.types';
import { WebhooksService } from './webhooks.service';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';

type DeliveryJob = { name: string; data: WebhookDeliveryJobData; opts: Record<string, any> };

const RETRY_JOB_OPTIONS = {
  removeOnComplete: true,
  removeOnFail: 1000,
  attempts: DELIVERY_ATTEMPTS,
  // The worker's backoffStrategy applies the ~24h ladder (webhook-backoff.ts).
  backoff: { type: 'custom' },
};

/**
 * Fans tracked BizEvents out to the environment's webhook endpoints: re-reads
 * the rows (the domain event carries ids only), filters by each endpoint's
 * topic subscriptions, and enqueues one delivery job per (webhook x event).
 * Payloads are assembled HERE so every retry of a job signs and sends the
 * exact same message (stable messageId = receiver's idempotency key).
 */
@Injectable()
export class WebhooksListener {
  private readonly logger = new Logger(WebhooksListener.name);

  constructor(
    @InjectQueue(QUEUE_WEBHOOK_DELIVERY) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly webhooksService: WebhooksService,
    private readonly ledger: OutboundLedgerService,
  ) {}

  /**
   * Persist the message rows, THEN enqueue. The ledger row is the record of
   * intent — it exists even if the queue never runs the job — and the job
   * carries the same payload as its working copy for the retry sequence.
   */
  private async dispatch(jobs: DeliveryJob[]): Promise<void> {
    if (jobs.length === 0) {
      return;
    }
    const persisted = new Set(
      await this.ledger.createMessages(
        jobs.map((job) => ({
          id: job.data.messageId,
          environmentId: job.data.payload.environmentId as string,
          destination: { webhookId: job.data.webhookId },
          topic: job.data.topic,
          payload: job.data.payload,
        })),
      ),
    );
    // Only jobs whose ledger row exists get enqueued: a webhook deleted
    // between the read and the write drops ITS rows (logged in the ledger
    // service), never the other endpoints' — and a job without a row would
    // only produce unrecordable attempts anyway.
    const enqueueable = jobs.filter((job) => persisted.has(job.data.messageId));
    if (enqueueable.length > 0) {
      await this.queue.addBulk(enqueueable);
    }
  }

  /**
   * The environment's enabled endpoints, or [] when there are none OR the
   * project's plan no longer includes webhooks (a lapsed plan stops firing;
   * see the gate note in WebhooksService). Ordered so the entitlement lookup —
   * memoized per request scope, but still two rows — is only paid by
   * environments that actually have endpoints.
   */
  private async activeWebhooksFor(environmentId: string) {
    // Only SUBSCRIPTION gates live here (enabled, entitlement): a disabled
    // endpoint or a lapsed plan means "this subscription is off", so no
    // message exists. AVAILABILITY gates (the circuit-breaker cooldown) are
    // the processor's business: cooling endpoints still get their ledger rows
    // and jobs — the processor defers the attempts until the window passes,
    // so a receiver outage delays deliveries instead of erasing them.
    const webhooks = await this.prisma.webhook.findMany({
      where: { environmentId, enabled: true },
      // Hot path: id + topics is all matching/enqueueing needs — no point
      // hauling the encrypted secret and breaker columns per tracked event.
      select: { id: true, topics: true },
    });
    if (webhooks.length === 0) {
      return [];
    }
    if (!(await this.webhooksService.isEntitled(environmentId))) {
      return [];
    }
    return webhooks;
  }

  @OnEvent(BIZ_EVENT_TRACKED, { async: true })
  async onBizEventTracked(payload: BizEventTrackedPayload): Promise<void> {
    try {
      const webhooks = await this.activeWebhooksFor(payload.environmentId);
      if (webhooks.length === 0) {
        return;
      }
      // Cheap in-memory prefilter before the 4-include bizEvent read: an
      // environment whose endpoints only subscribe to entity/content topics
      // must not pay a five-table join just to discard every row.
      const anyEventSubscriber = webhooks.some((webhook) =>
        subscribesToEventTopics((webhook.topics as string[]) ?? []),
      );
      if (!anyEventSubscriber) {
        return;
      }

      const bizEvents = await this.prisma.bizEvent.findMany({
        where: { id: { in: payload.bizEventIds } },
        include: { event: true, bizUser: true, bizCompany: true, bizSession: true },
      });

      const jobs: DeliveryJob[] = [];
      for (const bizEvent of bizEvents) {
        const codeName = bizEvent.event.codeName;
        const matching = webhooks.filter((webhook) =>
          matchesSubscription((webhook.topics as string[]) ?? [], codeName),
        );
        if (matching.length === 0) {
          continue;
        }

        const topic = buildEventTopic(codeName);
        const eventObject = mapEvent(bizEvent);
        for (const webhook of matching) {
          const { messageId, payload: body } = buildWebhookMessage(
            topic,
            payload.environmentId,
            { event: eventObject },
            bizEvent.createdAt,
          );
          jobs.push({
            name: 'deliver',
            data: { webhookId: webhook.id, messageId, topic, payload: body },
            opts: RETRY_JOB_OPTIONS,
          });
        }
      }

      await this.dispatch(jobs);
    } catch (error) {
      // Side-channel: a failure to enqueue must not propagate to the tracking path.
      this.logger.error('Failed to enqueue webhook deliveries', error as Error);
    }
  }

  @OnEvent(BIZ_ENTITY_CHANGED, { async: true })
  async onEntityChanged(payload: BizEntityChangedPayload): Promise<void> {
    try {
      const webhooks = await this.activeWebhooksFor(payload.environmentId);
      if (webhooks.length === 0) {
        return;
      }

      const jobs: DeliveryJob[] = [];
      for (const change of payload.changes) {
        // Everything per-change is contained to THIS change — the vocabulary
        // tripwire (buildEntityTopic throws on an entity missing from
        // WEBHOOK_ENTITY_TOPICS) AND the snapshot re-read: a transient DB
        // error on one change must not take its batch siblings' deliveries
        // down through the handler-level catch.
        try {
          const topic = buildEntityTopic(change.entity, change.action);
          const matching = webhooks.filter((webhook) =>
            matchesTopic((webhook.topics as string[]) ?? [], topic),
          );
          if (matching.length === 0) {
            continue;
          }

          // Re-read for the freshest public snapshot (previousAttributes was
          // captured at diff time inside the transaction).
          const entityObject = await this.mapChangedEntity(change);
          if (!entityObject) {
            continue;
          }

          for (const webhook of matching) {
            const { messageId, payload: body } = buildWebhookMessage(topic, payload.environmentId, {
              [change.entity]: entityObject,
              ...(change.previousAttributes
                ? { previousAttributes: change.previousAttributes }
                : {}),
            });
            jobs.push({
              name: 'deliver',
              data: { webhookId: webhook.id, messageId, topic, payload: body },
              opts: RETRY_JOB_OPTIONS,
            });
          }
        } catch (error) {
          this.logger.error(`Skipping entity change ${change.entity}.${change.action}: ${error}`);
        }
      }

      await this.dispatch(jobs);
    } catch (error) {
      // Side-channel: a failure to enqueue must not propagate to the write path.
      this.logger.error('Failed to enqueue entity-change webhook deliveries', error as Error);
    }
  }

  /**
   * The v2 public object for a changed row, or null if it vanished meanwhile.
   * A deletion maps the snapshot the producer captured (nothing to re-read).
   */
  private async mapChangedEntity(change: EntityChange): Promise<Record<string, any> | null> {
    if (change.action === 'deleted') {
      if (!change.deletedRow) {
        return null;
      }
      return change.entity === 'user' ? mapUser(change.deletedRow) : mapCompany(change.deletedRow);
    }
    if (change.entity === 'user') {
      const bizUser = await this.prisma.bizUser.findUnique({ where: { id: change.bizId } });
      return bizUser ? mapUser(bizUser) : null;
    }
    const bizCompany = await this.prisma.bizCompany.findUnique({ where: { id: change.bizId } });
    return bizCompany ? mapCompany(bizCompany) : null;
  }

  @OnEvent(CONTENT_PUBLISHED, { async: true })
  async onContentPublished(payload: ContentPublishedPayload): Promise<void> {
    try {
      const webhooks = await this.activeWebhooksFor(payload.environmentId);
      const matching = webhooks.filter((webhook) =>
        matchesTopic((webhook.topics as string[]) ?? [], WEBHOOK_CONTENT_PUBLISHED_TOPIC),
      );
      if (matching.length === 0) {
        return;
      }

      // Thin payload: ids resolve directly against the v2 content endpoints.
      const jobs: DeliveryJob[] = matching.map((webhook) => {
        const { messageId, payload: body } = buildWebhookMessage(
          WEBHOOK_CONTENT_PUBLISHED_TOPIC,
          payload.environmentId,
          { contentId: payload.contentId, versionId: payload.versionId },
        );
        return {
          name: 'deliver',
          data: {
            webhookId: webhook.id,
            messageId,
            topic: WEBHOOK_CONTENT_PUBLISHED_TOPIC,
            payload: body,
          },
          opts: RETRY_JOB_OPTIONS,
        };
      });
      await this.dispatch(jobs);
    } catch (error) {
      // Side-channel: a failure to enqueue must not propagate to the publish path.
      this.logger.error('Failed to enqueue content.published webhook deliveries', error as Error);
    }
  }
}
