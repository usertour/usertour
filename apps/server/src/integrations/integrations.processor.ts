import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DelayedError, Job } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import type { IntegrationConfig } from '@usertour/types';
import { QUEUE_INTEGRATION_DELIVERY } from '@/common/consts/queen';
import compileEmailTemplate from '@/common/email/compile-email-template';
import { EmailService } from '@/shared/email.service';
import { EncryptionService } from '@/shared/encryption.service';
import { AuditService } from '@/audit/audit.service';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';
import {
  RetryAfterCarrier,
  deliveryBackoffStrategy,
  parseRetryAfter,
} from '@/outbound/delivery-backoff';
import { buildProviderRequest } from './integration-adapters';
import { IntegrationDeliveryJobData } from './integrations.types';

const DELIVERY_TIMEOUT_MS = 10_000;
// Providers answer with small acks; the cap is a memory safety valve for the
// ledger excerpt, same rationale as the webhook processor's.
const RESPONSE_MAX_BYTES = 256 * 1024;
// Circuit breaker — identical thresholds and semantics to the webhook
// transport (ADR 0010 §11 via ADR 0011 §5): attempt-level streak, cooldown
// defers (never drops), sustained failure auto-disables.
const COOLDOWN_THRESHOLD = 10;
const COOLDOWN_BASE_MS = 60_000; // 1 minute
const COOLDOWN_MAX_MS = 60 * 60_000; // capped at 1 hour
const COOLDOWN_RELEASE_JITTER_MS = 30_000;
const AUTO_DISABLE_AFTER_MS = 7 * 24 * 60 * 60_000; // 7 days
const DELIVERY_CONCURRENCY = 10;

/**
 * Delivers one integration message per job. The integration row is re-read at
 * send time so a rotated key or a region fix applies to in-flight retries,
 * and a disabled or deleted integration drops them. Non-2xx / network
 * failures rethrow so BullMQ retries per the ladder — every attempt is
 * recorded in the outbound ledger either way.
 *
 * No egress guard here on purpose: every destination is a fixed public HTTPS
 * host baked into the adapter registry — there is no user-supplied URL to
 * vet (ADR 0011 §6 carries the rule for when custom hosts arrive).
 */
@Processor(QUEUE_INTEGRATION_DELIVERY, {
  concurrency: DELIVERY_CONCURRENCY,
  settings: {
    // The ~24h ladder (delivery-backoff.ts), raised to a 429's Retry-After,
    // positioned by the message-lifecycle attempt count.
    backoffStrategy: deliveryBackoffStrategy,
  },
})
export class IntegrationsProcessor extends WorkerHost {
  private readonly logger = new Logger(IntegrationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ledger: OutboundLedgerService,
    private readonly emailService: EmailService,
    private readonly audit: AuditService,
    private readonly encryption: EncryptionService,
  ) {
    super();
  }

  async process(job: Job<IntegrationDeliveryJobData>, token?: string): Promise<void> {
    const { integrationId, messageId, payload } = job.data;
    const attemptOffset = job.data.attemptOffset ?? 0;

    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) {
      // Deleted between enqueue and delivery: the message rows cascaded away
      // with it — nothing left to record to. Silent return is the honest move.
      return;
    }
    const attempt = attemptOffset + job.attemptsMade + 1;
    if (!integration.enabled) {
      // Disabled between enqueue and delivery. Record the drop as a final
      // failed attempt so the message settles instead of sitting PENDING.
      await this.ledger.recordAttempt(messageId, {
        attempt,
        success: false,
        error: 'Integration disabled at delivery time',
        final: true,
      });
      return;
    }

    if (
      job.data.manual !== true &&
      integration.cooldownUntil &&
      integration.cooldownUntil.getTime() > Date.now()
    ) {
      // Breaker layer 1: defer — never drop (webhook processor semantics).
      // Manual sends pass through: the user IS the half-open probe.
      const resumeAt =
        integration.cooldownUntil.getTime() +
        Math.floor(Math.random() * COOLDOWN_RELEASE_JITTER_MS);
      // Heartbeat for the reconcile sweep — a defer records no attempt.
      await this.ledger.touch(messageId);
      await job.moveToDelayed(resumeAt, token);
      throw new DelayedError();
    }

    // The key is AES-256-GCM encrypted at rest; this processor decrypts on
    // its own read (the domain service is the plaintext boundary for every
    // other consumer). decrypt returns NULL on failure (wrong
    // ENCRYPTION_KEY) — a deterministic final failure keeps the ladder from
    // burning through ghost attempts, and the eventual auto-disable email is
    // how the owner learns to re-enter the key.
    const key = this.encryption.decrypt(integration.key);
    if (!key) {
      await this.ledger.recordAttempt(messageId, {
        attempt,
        success: false,
        error: 'API key cannot be decrypted — re-enter the integration key',
        final: true,
      });
      await this.recordFailedAttempt(integrationId, integration.key);
      return;
    }

    const request = buildProviderRequest(
      integration.provider,
      payload,
      key,
      (integration.config ?? {}) as IntegrationConfig,
    );
    if (!request) {
      // A provider value with no adapter (row written by a different code
      // version): fail loudly and finally — retrying cannot fix it.
      await this.ledger.recordAttempt(messageId, {
        attempt,
        success: false,
        error: `No adapter for provider "${integration.provider}"`,
        final: true,
      });
      return;
    }

    const startedAt = Date.now();
    const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    try {
      const response = await axios.post(request.url, request.body, {
        headers: { 'Content-Type': 'application/json', ...(request.headers ?? {}) },
        timeout: DELIVERY_TIMEOUT_MS,
        maxContentLength: RESPONSE_MAX_BYTES,
        // Redirects are refused rather than followed — a provider API does
        // not redirect ingestion calls; a 3xx is a failed delivery.
        maxRedirects: 0,
        // Keep the response as raw text for the ledger — no JSON parse.
        responseType: 'text',
        transformResponse: [(data) => data],
      });

      await this.ledger.recordAttempt(messageId, {
        attempt,
        success: true,
        responseStatus: response.status,
        responseBody: asText(response.data),
        durationMs: Date.now() - startedAt,
        final,
      });
      await this.resetBreaker(integrationId, integration.key);
    } catch (error) {
      const failure = error as {
        message?: string;
        response?: { status?: number; data?: unknown; headers?: Record<string, unknown> };
      };
      await this.ledger.recordAttempt(messageId, {
        attempt,
        success: false,
        responseStatus: failure.response?.status ?? null,
        responseBody: asText(failure.response?.data),
        error: String(failure.message ?? error),
        durationMs: Date.now() - startedAt,
        final,
      });
      await this.recordFailedAttempt(integrationId, integration.key);
      // Providers rate-limit with 429 Retry-After; honor it from the statuses
      // RFC 9110 defines it for, same rule as the webhook transport.
      const failureStatus = failure.response?.status;
      if (failureStatus === 429 || failureStatus === 503) {
        const retryAfterMs = parseRetryAfter(failure.response?.headers?.['retry-after']);
        if (retryAfterMs) {
          (error as RetryAfterCarrier).retryAfterMs = retryAfterMs;
        }
      }
      // Rethrow so BullMQ retries with backoff.
      throw error;
    }
  }

  /**
   * Any delivered attempt proves the destination is healthy again. Guarded on
   * the stored key ciphertext this delivery decrypted: a straggler result for
   * a since-replaced credential must not touch the new one's breaker state
   * (the ciphertext changes on every key write, so equality means "same
   * stored credential").
   */
  private async resetBreaker(integrationId: string, deliveredKey: string): Promise<void> {
    try {
      await this.prisma.integration.updateMany({
        where: {
          id: integrationId,
          key: deliveredKey,
          OR: [
            { consecutiveFailures: { gt: 0 } },
            { failingSince: { not: null } },
            { cooldownUntil: { not: null } },
          ],
        },
        data: { consecutiveFailures: 0, cooldownUntil: null, failingSince: null },
      });
    } catch (error) {
      this.logger.error(`Failed to reset integration breaker for ${integrationId}`, error as Error);
    }
  }

  /**
   * An attempt failed: grow the failure streak and, past the threshold,
   * (re)arm the cooldown; a streak sustained past the auto-disable window
   * switches the integration off. Same CAS discipline as the webhook
   * processor (docs/conventions/concurrent-state-writes.md).
   */
  private async recordFailedAttempt(integrationId: string, deliveredKey: string): Promise<void> {
    try {
      const now = new Date();
      const { count } = await this.prisma.integration.updateMany({
        where: { id: integrationId, key: deliveredKey },
        data: { consecutiveFailures: { increment: 1 } },
      });
      if (count === 0) {
        return; // Key replaced (or row deleted) since this delivery started.
      }
      const row = await this.prisma.integration.findUniqueOrThrow({
        where: { id: integrationId },
        select: {
          consecutiveFailures: true,
          failingSince: true,
          environmentId: true,
          provider: true,
        },
      });
      if (!row.failingSince) {
        // 0 -> 1 transition: stamp when this streak began (guarded both ways,
        // see the webhook processor's rationale).
        await this.prisma.integration.updateMany({
          where: { id: integrationId, failingSince: null, consecutiveFailures: { gt: 0 } },
          data: { failingSince: now },
        });
      } else if (
        row.consecutiveFailures >= COOLDOWN_THRESHOLD &&
        now.getTime() - row.failingSince.getTime() >= AUTO_DISABLE_AFTER_MS
      ) {
        if (
          await this.autoDisable(integrationId, row.environmentId, row.provider, row.failingSince)
        ) {
          return;
        }
        // Lost the guarded flip: fall through to the cooldown arm below.
      }
      if (row.consecutiveFailures >= COOLDOWN_THRESHOLD) {
        const exponent = row.consecutiveFailures - COOLDOWN_THRESHOLD;
        const windowMs = Math.min(COOLDOWN_BASE_MS * 2 ** exponent, COOLDOWN_MAX_MS);
        await this.prisma.integration.updateMany({
          where: { id: integrationId, consecutiveFailures: row.consecutiveFailures },
          data: { cooldownUntil: new Date(Date.now() + windowMs) },
        });
        this.logger.warn(
          `Integration ${integrationId} cooling down for ${Math.round(windowMs / 1000)}s after ${row.consecutiveFailures} consecutive failed attempts`,
        );
      }
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        this.logger.debug(
          `Integration ${integrationId} deleted before its failure streak was recorded`,
        );
        return;
      }
      this.logger.error(
        `Failed to record integration failure streak for ${integrationId}`,
        error as Error,
      );
    }
  }

  /**
   * Layer 2: sustained failure -> the system switches the integration off,
   * records an audit entry, and emails the project owner. Guarded update so a
   * concurrent probe can't double-fire the notification.
   */
  private async autoDisable(
    integrationId: string,
    environmentId: string,
    provider: string,
    failingSince: Date,
  ): Promise<boolean> {
    const { count } = await this.prisma.integration.updateMany({
      where: { id: integrationId, enabled: true, failingSince },
      data: { enabled: false, autoDisabledAt: new Date(), cooldownUntil: null },
    });
    if (count === 0) {
      return false; // State moved under us (reset, key change, or already disabled).
    }
    const failingDays = Math.round((Date.now() - failingSince.getTime()) / 86_400_000);
    this.logger.warn(
      `Integration ${integrationId} auto-disabled after ${failingDays} days of continuous delivery failure`,
    );

    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true, project: { select: { name: true } } },
    });
    if (!environment) {
      return true; // Disabled fine; only the notification lost its addressee.
    }

    this.audit.record({
      projectId: environment.projectId,
      environmentId,
      source: 'system',
      action: 'update',
      operation: 'autoDisableIntegration',
      resourceType: 'integration',
      resourceId: integrationId,
      after: { enabled: false },
      metadata: { reason: 'sustained_delivery_failure', failingDays, provider },
    });

    const owners = await this.prisma.userOnProject.findMany({
      where: { projectId: environment.projectId, role: 'OWNER', actived: true },
      select: { user: { select: { email: true } } },
    });
    const settingsUrl = `${this.configService.get('app.homepageUrl')}/project/${environment.projectId}/settings/integrations/${provider}`;
    const html = await compileEmailTemplate({
      fileName: 'integrationAutoDisabled.mjml',
      data: {
        providerName: provider,
        projectName: environment.project?.name ?? 'your project',
        failingDays: String(failingDays),
        settingsUrl,
      },
    });
    await Promise.all(
      owners
        .filter((owner) => owner.user?.email)
        .map((owner) =>
          this.emailService.sendOrLog({
            to: owner.user?.email as string,
            subject: 'A Usertour integration was disabled after continuous failures',
            html,
          }),
        ),
    );
    return true;
  }
}

/** Response bodies are stored as text; non-string payloads are serialized. */
const asText = (data: unknown): string | null => {
  if (data == null || data === '') {
    return null;
  }
  return typeof data === 'string' ? data : JSON.stringify(data);
};
