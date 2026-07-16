import { randomBytes } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WEBHOOK_TEST_TOPIC } from '@usertour/constants';
import { Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { ApiObjectType } from '@/api/shared/object-type';
import { QUEUE_CLEAN_WEBHOOK_DELIVERIES, QUEUE_WEBHOOK_DELIVERY } from '@/common/consts/queen';
import { assertPublicHttpUrl } from '@/common/egress/egress-guard';
import { ParamsError, ValidationError } from '@/common/errors';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { CreateWebhookInput, UpdateWebhookInput } from './dto/webhook.input';
import { generateWebhookSecret } from './webhook-signature';
import { isValidSubscription } from './webhook-topics';
import { WebhookDeliveryJobData } from './webhook.types';

@Injectable()
export class WebhooksService implements OnModuleInit {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_WEBHOOK_DELIVERY) private readonly deliveryQueue: Queue,
    @InjectQueue(QUEUE_CLEAN_WEBHOOK_DELIVERIES) private readonly cleanupQueue: Queue,
  ) {}

  // Schedule the recurring delivery-log cleanup. Mirrors the auth/subscription
  // cron pattern (BullMQ repeatable + fixed jobId so it fires once per cluster);
  // scheduling failure must not block app boot.
  async onModuleInit() {
    try {
      await this.setupCleanupJob();
    } catch (error) {
      this.logger.error(`Failed to schedule webhook delivery cleanup job: ${error}`);
    }
  }

  private async setupCleanupJob() {
    const existingJobs = await this.cleanupQueue.getJobSchedulers();
    await Promise.all(existingJobs.map((job) => this.cleanupQueue.removeJobScheduler(job.id)));

    await this.cleanupQueue.add(
      'clean-webhook-deliveries',
      {},
      {
        repeat: { pattern: '30 3 * * *' }, // daily at 03:30
        jobId: 'clean-webhook-deliveries', // fixed id dedupes across instances
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }

  async list(environmentId: string) {
    return await this.prisma.webhook.findMany({
      where: { environmentId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  /** Relay-connection list for the v2 REST surface (shared/pagination.paginate). */
  async listWithPagination(
    environmentId: string,
    paginationArgs: { first?: number; last?: number; after?: string; before?: string },
  ) {
    const where = { environmentId };
    return findManyCursorConnection(
      (args) =>
        this.prisma.webhook.findMany({
          where,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          ...args,
        }),
      () => this.prisma.webhook.count({ where }),
      paginationArgs,
    );
  }

  async get(id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      throw new ParamsError('Webhook not found');
    }
    return webhook;
  }

  async create(data: CreateWebhookInput) {
    this.validateUrl(data.url);
    this.validateTopics(data.topics);

    return await this.prisma.webhook.create({
      data: {
        environmentId: data.environmentId,
        url: data.url,
        topics: data.topics,
        enabled: data.enabled ?? true,
        description: data.description ?? null,
        secret: generateWebhookSecret(),
      },
    });
  }

  async update(data: UpdateWebhookInput) {
    const { id, url, topics, enabled, description } = data;
    await this.get(id);

    if (url !== undefined) {
      this.validateUrl(url);
    }
    if (topics !== undefined) {
      this.validateTopics(topics);
    }

    return await this.prisma.webhook.update({
      where: { id },
      data: {
        ...(url !== undefined ? { url } : {}),
        ...(topics !== undefined ? { topics } : {}),
        ...(enabled !== undefined ? { enabled } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });
  }

  async delete(id: string) {
    await this.get(id);
    return await this.prisma.webhook.delete({ where: { id } });
  }

  /** Replace the signing secret. In-flight retries pick the new one up (the
   *  processor re-reads the row at send time). */
  async rotateSecret(id: string) {
    await this.get(id);
    return await this.prisma.webhook.update({
      where: { id },
      data: { secret: generateWebhookSecret() },
    });
  }

  /**
   * Enqueue a test message addressed directly to this endpoint (no topic
   * matching). Single attempt — the point is fast feedback in the delivery
   * log, not durable delivery.
   */
  async sendTestEvent(id: string) {
    const webhook = await this.get(id);
    if (!webhook.enabled) {
      throw new ValidationError('Enable the webhook before sending a test event.');
    }

    const messageId = `whmsg_${randomBytes(16).toString('hex')}`;
    const jobData: WebhookDeliveryJobData = {
      webhookId: webhook.id,
      messageId,
      topic: WEBHOOK_TEST_TOPIC,
      payload: {
        id: messageId,
        object: ApiObjectType.WEBHOOK_MESSAGE,
        type: WEBHOOK_TEST_TOPIC,
        createdAt: new Date().toISOString(),
        environmentId: webhook.environmentId,
        data: {},
      },
    };
    await this.deliveryQueue.add('deliver', jobData, {
      removeOnComplete: true,
      removeOnFail: 1000,
      attempts: 1,
    });
    return webhook;
  }

  async listDeliveries(webhookId: string, pagination: PaginationArgs) {
    const { first, last, before, after } = pagination ?? {};
    const where = { webhookId };
    return findManyCursorConnection(
      (args) =>
        this.prisma.webhookDelivery.findMany({
          where,
          // Secondary `id` sort: stable tiebreak for rows sharing a createdAt.
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...args,
        }),
      () => this.prisma.webhookDelivery.count({ where }),
      { first, last, before, after },
    );
  }

  /** Scope-resolver lookup: webhook id -> environmentId (null when absent). */
  async getEnvironmentId(id: string): Promise<string | null> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
      select: { environmentId: true },
    });
    return webhook?.environmentId ?? null;
  }

  private validateUrl(url: string): void {
    assertPublicHttpUrl(url, {
      allowPrivateNetwork: !!this.configService.get('globalConfig.allowPrivateNetworkEgress'),
    });
  }

  private validateTopics(topics: string[]): void {
    if (!Array.isArray(topics) || topics.length === 0) {
      throw new ValidationError('At least one topic subscription is required.');
    }
    const invalid = topics.find((topic) => !isValidSubscription(topic));
    if (invalid !== undefined) {
      throw new ValidationError(
        `Invalid topic subscription "${invalid}" — expected "*", "event.tracked", or "event.tracked.<codeName>".`,
      );
    }
  }
}
