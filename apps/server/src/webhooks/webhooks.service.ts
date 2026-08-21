import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WEBHOOK_PREFIX_SUBSCRIPTIONS, WEBHOOK_TEST_TOPIC } from '@usertour/constants';
import { Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { QUEUE_WEBHOOK_DELIVERY } from '@/common/consts/queen';
import { assertPublicHttpUrl } from '@/common/egress/egress-guard';
import {
  FeatureRequiresLicenseError,
  ValidationError,
  WebhookMessageNotFoundError,
  WebhookNotFoundError,
} from '@/common/errors';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';
import { EncryptionService } from '@/shared/encryption.service';
import { ProjectsService } from '@/projects/projects.service';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { CreateWebhookInput, UpdateWebhookInput } from './dto/webhook.input';
import { buildWebhookMessage } from './webhook-envelope';
import { generateWebhookSecret } from './webhook-signature';
import { isValidSubscription, MAX_TOPIC_SUBSCRIPTIONS } from './webhook-topics';
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
    private readonly encryption: EncryptionService,
    @InjectQueue(QUEUE_WEBHOOK_DELIVERY) private readonly deliveryQueue: Queue,
  ) {}

  /**
   * Exposure rule: PLAINTEXT only where a consumer needs it — get (wiring),
   * create/rotate (one-time handoff). List and delete responses mask the
   * secret to '' instead: no caller reads it there, decrypting N rows per
   * list render is waste, and the GraphQL model would otherwise hand the
   * plaintext to anything selecting the field. At rest it is AES-256-GCM
   * encrypted (EncryptionService — the EnvironmentSigningSecret /
   * twoFactorSecret treatment: HMAC needs the original value, so hashing is
   * impossible and encryption bounds a DB-only leak). The processor reads
   * via Prisma directly and decrypts on its own.
   */
  private withPlaintextSecret<T extends { secret: string }>(row: T): T {
    // decrypt returns null when the value is unrecoverable (wrong
    // ENCRYPTION_KEY, legacy plaintext row). Degrade to '' instead of null:
    // the GraphQL secret field is non-null, and a throwing/null read would
    // take down the very detail page that hosts the Rotate button — the one
    // self-heal path. Empty string = "unrecoverable, rotate me".
    return { ...row, secret: this.encryption.decrypt(row.secret) ?? '' };
  }

  /**
   * See the exposure rule above: surfaces that never need the secret —
   * list, delete, update, and the test-event return — get NULL, distinct
   * from '', which only the decrypt path produces and means "stored value is
   * no longer decryptable". One value per meaning, so no consumer has to
   * know which query a row came from.
   */
  private withMaskedSecret<T extends { secret: string }>(
    row: T,
  ): Omit<T, 'secret'> & {
    secret: string | null;
  } {
    return { ...row, secret: null };
  }

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
    const rows = await this.prisma.webhook.findMany({
      where: { environmentId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.withMaskedSecret(row));
  }

  /** Relay-connection list for the v2 REST surface (shared/pagination.paginate). */
  async listWithPagination(
    environmentId: string,
    paginationArgs: { first?: number; last?: number; after?: string; before?: string },
  ) {
    const where = { environmentId };
    return findManyCursorConnection(
      async (args) => {
        const rows = await this.prisma.webhook.findMany({
          where,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          ...args,
        });
        return rows.map((row) => this.withMaskedSecret(row));
      },
      () => this.prisma.webhook.count({ where }),
      paginationArgs,
    );
  }

  async get(id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      throw new WebhookNotFoundError();
    }
    return this.withPlaintextSecret(webhook);
  }

  async create(data: CreateWebhookInput) {
    await this.assertEntitled(data.environmentId);
    this.validateUrl(data.url);
    // Normalize before validating/persisting: duplicates are harmless to the
    // matcher but junk in the column and the UI.
    const normalizedTopics = [...new Set(data.topics)];
    this.validateTopics(normalizedTopics);

    const secret = generateWebhookSecret();
    const row = await this.prisma.webhook.create({
      data: {
        environmentId: data.environmentId,
        url: data.url,
        topics: normalizedTopics,
        enabled: data.enabled ?? true,
        description: data.description ?? null,
        secret: this.encryption.encrypt(secret) as string,
      },
    });
    return { ...row, secret };
  }

  async update(data: UpdateWebhookInput) {
    const { id, url, topics, enabled, description } = data;
    const webhook = await this.get(id);
    await this.assertEntitled(webhook.environmentId);

    if (url !== undefined) {
      this.validateUrl(url);
    }
    let normalizedTopics = topics;
    if (normalizedTopics !== undefined) {
      normalizedTopics = [...new Set(normalizedTopics)];
      this.validateTopics(normalizedTopics);
    }

    // Re-enabling is a fresh start: clear the breaker state and the
    // auto-disable marker so the endpoint gets a full streak budget again.
    const reEnabling = enabled === true && !webhook.enabled;
    // A NEW target owes nothing to the old one's failure streak — without this
    // a user who fixes a dead URL keeps serving the previous cooldown (up to
    // an hour) with no hint beyond the badge. autoDisabledAt stays: it tracks
    // the enabled switch, which the reEnabling branch handles.
    const urlChanged = url !== undefined && url !== webhook.url;
    const row = await this.prisma.webhook.update({
      where: { id },
      data: {
        ...(url !== undefined ? { url } : {}),
        ...(normalizedTopics !== undefined ? { topics: normalizedTopics } : {}),
        ...(enabled !== undefined ? { enabled } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(reEnabling
          ? {
              autoDisabledAt: null,
              consecutiveFailures: 0,
              cooldownUntil: null,
              failingSince: null,
            }
          : {}),
        ...(urlChanged ? { consecutiveFailures: 0, cooldownUntil: null, failingSince: null } : {}),
      },
    });
    // Masked: nothing consumes a secret from an update response, and the
    // GraphQL surface would otherwise hand the plaintext to any owner-client
    // selecting the field (the REST mapper already strips it).
    return this.withMaskedSecret(row);
  }

  async delete(id: string) {
    await this.get(id);
    const row = await this.prisma.webhook.delete({ where: { id } });
    return this.withMaskedSecret(row);
  }

  /** Replace the signing secret. In-flight retries pick the new one up (the
   *  processor re-reads the row at send time). */
  async rotateSecret(id: string) {
    const webhook = await this.get(id);
    await this.assertEntitled(webhook.environmentId);
    const secret = generateWebhookSecret();
    const row = await this.prisma.webhook.update({
      where: { id },
      data: { secret: this.encryption.encrypt(secret) as string },
    });
    return { ...row, secret };
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

    const { messageId, payload } = buildWebhookMessage(
      WEBHOOK_TEST_TOPIC,
      webhook.environmentId,
      {},
    );
    const jobData: WebhookDeliveryJobData = {
      webhookId: webhook.id,
      messageId,
      manual: true,
      topic: WEBHOOK_TEST_TOPIC,
      payload,
    };
    const persisted = await this.ledger.createMessages([
      {
        id: messageId,
        environmentId: webhook.environmentId,
        destination: { webhookId: webhook.id },
        topic: WEBHOOK_TEST_TOPIC,
        payload: jobData.payload,
      },
    ]);
    if (!persisted.includes(messageId)) {
      // The ledger's per-row fallback swallowed the cause; recheck the FK to
      // label honestly — a concurrent delete is a 404, anything else
      // (connection blip, JSONB error) must not masquerade as one.
      const stillExists = await this.prisma.webhook.findUnique({
        where: { id: webhook.id },
        select: { id: true },
      });
      if (!stillExists) {
        throw new WebhookNotFoundError();
      }
      throw new ValidationError('Failed to record the test message — try again.');
    }
    const jobId = `test-${messageId}`;
    try {
      await this.deliveryQueue.add('deliver', jobData, { ...SINGLE_ATTEMPT_JOB_OPTIONS, jobId });
    } catch (error) {
      // Same ambiguous-outcome discipline as resendMessage: verify before
      // compensating. A verified miss must not leave the row PENDING — the
      // user just saw this fail, and 14h later the reconcile sweep would
      // deliver a test event nobody is waiting for. Settle it FAILED instead
      // (visible in the log, honest).
      let phantom = null;
      try {
        phantom = await this.deliveryQueue.getJob(jobId);
      } catch {
        // Verification unreachable — fall through to the settle.
      }
      if (!phantom) {
        await this.ledger.recordAttempt(messageId, {
          attempt: 1,
          success: false,
          error: 'Failed to enqueue the delivery job',
          final: true,
        });
        throw error;
      }
    }
    // Masked for the same reason as update(): the test-event response is an
    // ack, not a secret handoff.
    return this.withMaskedSecret(webhook);
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
      throw new WebhookMessageNotFoundError();
    }

    // CAS claim first: only a settled message (DELIVERED/FAILED) flips to
    // PENDING, so a concurrent resend — or a still-running delivery — loses
    // here instead of double-queueing. The claim stamps its own generation
    // into updatedAt; the jobId derives from that stamp, so it is unique per
    // claim even when a swallowed ledger write left the attempt count stale.
    const claimStamp = await this.ledger.claimForResend(message.id, message.updatedAt);
    if (!claimStamp) {
      throw new ValidationError('This message is still being delivered — wait for it to settle.');
    }
    const jobId = `resend-${message.id}-${claimStamp.getTime()}`;
    const jobData: WebhookDeliveryJobData = {
      webhookId,
      messageId: message.id,
      manual: true,
      topic: message.topic,
      payload: message.payload as Record<string, unknown>,
      // Continue the attempt numbering after the logged tries.
      attemptOffset: message.deliveries.length,
    };
    try {
      await this.deliveryQueue.add('deliver', jobData, { ...SINGLE_ATTEMPT_JOB_OPTIONS, jobId });
    } catch (error) {
      // add() throwing is AMBIGUOUS: the connection can drop after Redis
      // persisted the job. Verify by jobId before compensating — rolling back
      // while a phantom job exists would let a retry double-deliver (within
      // the documented at-least-once contract, but avoidable). If the job is
      // found, the enqueue actually succeeded: keep the claim and return
      // normally. Only a verified miss rolls back — and only OUR claim (the
      // stamp guard), never a successor's. If the verify itself is
      // unreachable, Redis is down for both calls and the job almost
      // certainly was never created: roll back and surface the error.
      let phantom = null;
      try {
        phantom = await this.deliveryQueue.getJob(jobId);
      } catch {
        // Verification unreachable — fall through to the rollback.
      }
      if (!phantom) {
        await this.ledger.releaseResendClaim(message.id, claimStamp, message.status);
        throw error;
      }
    }
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
    // Chokepoint cap (all surfaces are thin over this service): the column is
    // JSONB and the matcher walks the array per delivery — an unbounded or
    // duplicated list is at best waste, at worst a payload-size lever.
    if (topics.length > MAX_TOPIC_SUBSCRIPTIONS) {
      throw new ValidationError(
        `At most ${MAX_TOPIC_SUBSCRIPTIONS} topic subscriptions per endpoint.`,
      );
    }
    const invalid = topics.find((topic) => !isValidSubscription(topic));
    if (invalid !== undefined) {
      // Family names are derived so this message cannot lag the vocabulary.
      const familyNames = WEBHOOK_PREFIX_SUBSCRIPTIONS.map((prefix) => `"${prefix}"`).join(', ');
      throw new ValidationError(
        `Invalid topic subscription "${invalid}" — expected "*", a family name (${familyNames}), "event.tracked.<codeName>", or an exact topic such as "content.published" / "user.updated".`,
      );
    }
  }
}
