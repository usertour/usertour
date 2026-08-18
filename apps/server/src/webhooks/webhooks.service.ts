import { randomBytes } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WEBHOOK_TEST_TOPIC } from '@usertour/constants';
import { Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { ApiObjectType } from '@/api/shared/object-type';
import { QUEUE_WEBHOOK_DELIVERY } from '@/common/consts/queen';
import { assertPublicHttpUrl } from '@/common/egress/egress-guard';
import { FeatureRequiresLicenseError, ParamsError, ValidationError } from '@/common/errors';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';
import { ProjectsService } from '@/projects/projects.service';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { CreateWebhookInput, UpdateWebhookInput } from './dto/webhook.input';
import { generateWebhookSecret } from './webhook-signature';
import { isValidSubscription } from './webhook-topics';
import { WebhookDeliveryJobData } from './webhook.types';

/** Job options for a one-shot, user-triggered send (test event, resend). */
const SINGLE_ATTEMPT_JOB_OPTIONS = { removeOnComplete: true, removeOnFail: 1000, attempts: 1 };

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly ledger: OutboundLedgerService,
    @InjectQueue(QUEUE_WEBHOOK_DELIVERY) private readonly deliveryQueue: Queue,
  ) {}

  // ---------------------------------------------------------------------------
  // Plan gate
  // ---------------------------------------------------------------------------
  //
  // Outbound webhooks are a paid feature on cloud (Starter+); self-hosted is
  // never gated (getProjectConfig forces the flag on). The gate covers every
  // surface at once because REST and MCP are thin over this service:
  //   - writes and actions (create / update / rotateSecret / sendTestEvent)
  //     throw FeatureRequiresLicenseError
  //   - delivery consults isEntitled() before enqueueing, so a lapsed plan stops
  //     firing instead of keeping trial-era endpoints alive forever
  //   - reads and delete stay open so a downgraded project can still see and
  //     clean up what it configured

  /** Whether the project owning this environment may use webhooks right now. */
  async isEntitled(environmentId: string): Promise<boolean> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true },
    });
    if (!environment) {
      return false;
    }
    const config = await this.projectsService.getProjectConfig(environment.projectId);
    return config.webhooks;
  }

  private async assertEntitled(environmentId: string): Promise<void> {
    if (!(await this.isEntitled(environmentId))) {
      throw new FeatureRequiresLicenseError();
    }
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
    await this.assertEntitled(data.environmentId);
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
    const webhook = await this.get(id);
    await this.assertEntitled(webhook.environmentId);

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
    const webhook = await this.get(id);
    await this.assertEntitled(webhook.environmentId);
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
    await this.assertEntitled(webhook.environmentId);
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
    await this.ledger.createMessages([
      {
        id: messageId,
        environmentId: webhook.environmentId,
        destination: { webhookId: webhook.id },
        topic: WEBHOOK_TEST_TOPIC,
        payload: jobData.payload,
      },
    ]);
    await this.deliveryQueue.add('deliver', jobData, SINGLE_ATTEMPT_JOB_OPTIONS);
    return webhook;
  }

  /** The endpoint's message log (newest first), each with its attempts. */
  async listMessages(webhookId: string, pagination: PaginationArgs) {
    const { first, last, before, after } = pagination ?? {};
    return this.ledger.listMessages({ webhookId }, { first, last, before, after });
  }

  /**
   * Re-send a logged message from its stored payload: same message id (the
   * receiver's idempotency key), single attempt, next attempt number in the
   * sequence. Gated like every other action; the endpoint must be enabled.
   */
  async resendMessage(webhookId: string, messageId: string) {
    const webhook = await this.get(webhookId);
    await this.assertEntitled(webhook.environmentId);
    if (!webhook.enabled) {
      throw new ValidationError('Enable the webhook before re-sending a message.');
    }
    const message = await this.ledger.getMessage(messageId);
    if (!message || message.webhookId !== webhookId) {
      throw new ParamsError('Webhook message not found');
    }

    await this.ledger.markPending(message.id);
    const jobData: WebhookDeliveryJobData = {
      webhookId,
      messageId: message.id,
      topic: message.topic,
      payload: message.payload as Record<string, unknown>,
      // Continue the attempt numbering after the logged tries.
      attemptOffset: message.deliveries.length,
    };
    await this.deliveryQueue.add('deliver', jobData, SINGLE_ATTEMPT_JOB_OPTIONS);
    return { ...message, status: 'PENDING' };
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
