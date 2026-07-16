import { randomBytes } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { QUEUE_WEBHOOK_DELIVERY } from '@/common/consts/queen';
import { ApiObjectType } from '@/api/shared/object-type';
import { mapEvent } from '@/api/events/event.mapper';
import { buildEventTopic, matchesSubscription } from './webhook-topics';
import { BIZ_EVENT_TRACKED, BizEventTrackedPayload, WebhookDeliveryJobData } from './webhook.types';

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
  ) {}

  @OnEvent(BIZ_EVENT_TRACKED, { async: true })
  async onBizEventTracked(payload: BizEventTrackedPayload): Promise<void> {
    try {
      const webhooks = await this.prisma.webhook.findMany({
        where: { environmentId: payload.environmentId, enabled: true },
      });
      if (webhooks.length === 0) {
        return;
      }

      const bizEvents = await this.prisma.bizEvent.findMany({
        where: { id: { in: payload.bizEventIds } },
        include: { event: true, bizUser: true, bizCompany: true, bizSession: true },
      });

      const jobs: { name: string; data: WebhookDeliveryJobData; opts: Record<string, any> }[] = [];
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
          const messageId = `whmsg_${randomBytes(16).toString('hex')}`;
          jobs.push({
            name: 'deliver',
            data: {
              webhookId: webhook.id,
              messageId,
              topic,
              payload: {
                id: messageId,
                object: ApiObjectType.WEBHOOK_MESSAGE,
                type: topic,
                createdAt: bizEvent.createdAt.toISOString(),
                environmentId: payload.environmentId,
                data: { event: eventObject },
              },
            },
            opts: {
              removeOnComplete: true,
              removeOnFail: 1000,
              attempts: 5,
              backoff: { type: 'exponential', delay: 1000 },
            },
          });
        }
      }

      if (jobs.length > 0) {
        await this.queue.addBulk(jobs);
      }
    } catch (error) {
      // Side-channel: a failure to enqueue must not propagate to the tracking path.
      this.logger.error('Failed to enqueue webhook deliveries', error as Error);
    }
  }
}
