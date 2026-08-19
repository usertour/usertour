import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import { Job } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { QUEUE_WEBHOOK_DELIVERY } from '@/common/consts/queen';
import {
  assertPublicHttpUrl,
  createGuardedHttpsAgent,
  guardedLookup,
} from '@/common/egress/egress-guard';
import compileEmailTemplate from '@/common/email/compile-email-template';
import { EmailService } from '@/shared/email.service';
import { AuditService } from '@/audit/audit.service';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';
import { WEBHOOK_SIGNATURE_HEADER, signWebhookPayload } from './webhook-signature';
import { WebhookDeliveryJobData } from './webhook.types';

const DELIVERY_TIMEOUT_MS = 10_000;
// Memory safety valve: the receiver's URL is arbitrary user input, and axios
// buffers the whole response before we truncate it for the ledger — without a
// cap a hostile endpoint returning gigabytes ooms the worker (x concurrency).
// A webhook response is an ack; anything past 256 KB is protocol abuse and the
// attempt is recorded as failed (axios rejects when the cap is exceeded).
const RESPONSE_MAX_BYTES = 256 * 1024;
// Cooldown layer of the circuit breaker (ADR 0010): after this many messages
// in a row exhaust their retry budget, the endpoint cools down and the
// listener stops creating messages for it until the window passes. The window
// doubles with each further final failure; any success resets everything.
export const COOLDOWN_THRESHOLD = 5;
export const COOLDOWN_BASE_MS = 60_000; // 1 minute
export const COOLDOWN_MAX_MS = 60 * 60_000; // capped at 1 hour
// Layer 2: an endpoint whose failure streak has lasted this long gets disabled
// (nothing was delivered in that whole window anyway) and the project owner is
// notified. Re-enabling is a manual switch in the dashboard. No scheduler: the
// check rides on final failures, and a dead-but-trafficked endpoint produces
// at least one of those per cooldown cycle.
export const AUTO_DISABLE_AFTER_MS = 7 * 24 * 60 * 60_000; // 7 days
// How many deliveries one worker runs concurrently. Sequential (the BullMQ
// default) lets a single hung endpoint (10s timeout x 5 retries) head-of-line
// block every other tenant's deliveries.
const DELIVERY_CONCURRENCY = 10;
// One agent for all guarded deliveries — the guard is stateless, so per-attempt
// construction only paid an allocation. (No keepAlive on purpose: holding
// sockets open to customer endpoints would be a behavior change.)
const guardedAgent = createGuardedHttpsAgent();

/**
 * Delivers one webhook message per job. The endpoint row is re-read at send
 * time so a rotated secret applies to in-flight retries and a disabled or
 * deleted endpoint silently drops them. Non-2xx / network failures are
 * rethrown so BullMQ retries per the job's backoff policy — every attempt is
 * recorded in the outbound ledger either way.
 */
@Processor(QUEUE_WEBHOOK_DELIVERY, { concurrency: DELIVERY_CONCURRENCY })
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ledger: OutboundLedgerService,
    private readonly emailService: EmailService,
    private readonly audit: AuditService,
  ) {
    super();
  }

  async process(job: Job<WebhookDeliveryJobData>): Promise<void> {
    const { webhookId, messageId, payload, attemptOffset = 0 } = job.data;

    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook || !webhook.enabled) {
      // The endpoint vanished or was disabled between enqueue and delivery.
      // Record the drop as a final failed attempt instead of returning
      // silently — otherwise the message sits PENDING forever (and the
      // dashboard refuses to resend a PENDING message even after re-enable).
      await this.ledger.recordAttempt(messageId, {
        attempt: attemptOffset + job.attemptsMade + 1,
        success: false,
        error: webhook ? 'Endpoint disabled at delivery time' : 'Endpoint deleted at delivery time',
        final: true,
      });
      return;
    }

    const allowPrivateNetwork = !!this.configService.get('globalConfig.allowPrivateNetworkEgress');
    if (!allowPrivateNetwork) {
      // Re-check the URL against the CURRENT egress policy. A row born while
      // private egress was allowed (an http/intranet target) must stop
      // delivering once the switch is off — http bypasses the https agent and
      // an IP-literal host never consults the guarded lookup, so this
      // fail-fast is the only gate left for such rows.
      try {
        assertPublicHttpUrl(webhook.url, { allowPrivateNetwork: false });
      } catch {
        await this.ledger.recordAttempt(messageId, {
          attempt: attemptOffset + job.attemptsMade + 1,
          success: false,
          error: 'Endpoint URL is not allowed by the current egress policy',
          final: true,
        });
        return;
      }
    }

    // Stringify exactly once: the signature is computed over the same string
    // that goes on the wire — re-serialization would break receiver-side
    // verification.
    const body = JSON.stringify(payload);
    const timestampSec = Math.floor(Date.now() / 1000);
    const signature = signWebhookPayload(webhook.secret, timestampSec, body);

    const startedAt = Date.now();
    // Attempt numbers continue across a manual resend (attemptOffset = tries
    // already logged); `final` marks the last try of THIS job's budget.
    const attempt = attemptOffset + job.attemptsMade + 1;
    const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    try {
      const response = await axios.post(webhook.url, body, {
        headers: {
          'Content-Type': 'application/json',
          [WEBHOOK_SIGNATURE_HEADER]: signature,
        },
        timeout: DELIVERY_TIMEOUT_MS,
        maxContentLength: RESPONSE_MAX_BYTES,
        // Redirects are refused rather than followed: a 3xx is recorded as a
        // failed delivery, keeping endpoint behavior predictable.
        maxRedirects: 0,
        // Keep the response body as the raw text for the ledger — no JSON parse.
        responseType: 'text',
        transformResponse: [(data) => data],
        ...(allowPrivateNetwork
          ? {}
          : {
              httpsAgent: guardedAgent,
              // node:net's LookupFunction and axios's lookup signature differ only
              // in the (runtime-compatible) family type — bridge the declarations.
              lookup: guardedLookup as unknown as AxiosRequestConfig['lookup'],
            }),
      });

      await this.ledger.recordAttempt(messageId, {
        attempt,
        success: true,
        responseStatus: response.status,
        responseBody: asText(response.data),
        durationMs: Date.now() - startedAt,
        final,
      });
      await this.resetBreaker(webhookId);
    } catch (error) {
      const failure = error as { message?: string; response?: { status?: number; data?: unknown } };
      await this.ledger.recordAttempt(messageId, {
        attempt,
        success: false,
        responseStatus: failure.response?.status ?? null,
        responseBody: asText(failure.response?.data),
        error: String(failure.message ?? error),
        durationMs: Date.now() - startedAt,
        final,
      });
      if (final) {
        await this.recordFinalFailure(webhookId);
      }
      // Rethrow so BullMQ retries with backoff.
      throw error;
    }
  }

  /** Any delivered attempt proves the endpoint is healthy again. */
  private async resetBreaker(webhookId: string): Promise<void> {
    try {
      // Guarded write: skip the UPDATE (and its updatedAt bump) on the healthy
      // path where there is nothing to clear.
      await this.prisma.webhook.updateMany({
        where: { id: webhookId, consecutiveFailures: { gt: 0 } },
        data: { consecutiveFailures: 0, cooldownUntil: null, failingSince: null },
      });
    } catch (error) {
      this.logger.error(`Failed to reset webhook breaker for ${webhookId}`, error as Error);
    }
  }

  /**
   * A message exhausted its retry budget: grow the failure streak and, past
   * the threshold, (re)arm the cooldown — 1min doubling per further failure,
   * capped at 1h. Atomic increment; the window is computed from the returned
   * streak, so concurrent final failures at worst re-arm a similar window.
   * Breaker bookkeeping must never break the delivery path.
   */
  private async recordFinalFailure(webhookId: string): Promise<void> {
    try {
      const now = new Date();
      const row = await this.prisma.webhook.update({
        where: { id: webhookId },
        data: { consecutiveFailures: { increment: 1 } },
        select: { consecutiveFailures: true, failingSince: true, environmentId: true, url: true },
      });
      if (!row.failingSince) {
        // 0 -> 1 transition: stamp when this streak began. (Guarded so a
        // concurrent final failure doesn't move an existing stamp forward.)
        await this.prisma.webhook.updateMany({
          where: { id: webhookId, failingSince: null },
          data: { failingSince: now },
        });
      } else if (now.getTime() - row.failingSince.getTime() >= AUTO_DISABLE_AFTER_MS) {
        await this.autoDisable(webhookId, row.environmentId, row.url, row.failingSince);
        return;
      }
      if (row.consecutiveFailures >= COOLDOWN_THRESHOLD) {
        const exponent = row.consecutiveFailures - COOLDOWN_THRESHOLD;
        const windowMs = Math.min(COOLDOWN_BASE_MS * 2 ** exponent, COOLDOWN_MAX_MS);
        await this.prisma.webhook.update({
          where: { id: webhookId },
          data: { cooldownUntil: new Date(Date.now() + windowMs) },
        });
        this.logger.warn(
          `Webhook ${webhookId} cooling down for ${Math.round(windowMs / 1000)}s after ${row.consecutiveFailures} consecutive failed messages`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to record webhook failure streak for ${webhookId}`, error as Error);
    }
  }

  /**
   * Layer 2: sustained failure -> the system switches the endpoint off,
   * records an audit entry, and emails the project owner. Guarded update so a
   * concurrent probe can't double-fire the notification.
   */
  private async autoDisable(
    webhookId: string,
    environmentId: string,
    url: string,
    failingSince: Date,
  ): Promise<void> {
    const { count } = await this.prisma.webhook.updateMany({
      where: { id: webhookId, enabled: true },
      data: { enabled: false, autoDisabledAt: new Date(), cooldownUntil: null },
    });
    if (count === 0) {
      return; // Someone else (user or a concurrent probe) already disabled it.
    }
    const failingDays = Math.round((Date.now() - failingSince.getTime()) / 86_400_000);
    this.logger.warn(
      `Webhook ${webhookId} auto-disabled after ${failingDays} days of continuous delivery failure`,
    );

    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true, project: { select: { name: true } } },
    });
    if (!environment) {
      return;
    }

    this.audit.record({
      projectId: environment.projectId,
      environmentId,
      source: 'system',
      action: 'update',
      operation: 'autoDisableWebhook',
      resourceType: 'webhook',
      resourceId: webhookId,
      after: { enabled: false },
      metadata: { reason: 'sustained_delivery_failure', failingDays, url },
    });

    // Single-owner invariant (role changes demote the previous owner);
    // findMany defends against legacy duplicates rather than implying a crowd.
    const owners = await this.prisma.userOnProject.findMany({
      where: { projectId: environment.projectId, role: 'OWNER', actived: true },
      select: { user: { select: { email: true } } },
    });
    const settingsUrl = `${this.configService.get('app.homepageUrl')}/project/${environment.projectId}/settings/webhooks/${webhookId}`;
    const html = await compileEmailTemplate({
      fileName: 'webhookAutoDisabled.mjml',
      data: {
        url,
        projectName: environment.project?.name ?? 'your project',
        failingDays: String(failingDays),
        settingsUrl,
      },
    });
    for (const owner of owners) {
      if (owner.user?.email) {
        await this.emailService.sendOrLog({
          to: owner.user.email,
          subject: 'A Usertour webhook endpoint was disabled after continuous failures',
          html,
        });
      }
    }
  }
}

/** Response bodies are stored as text; non-string payloads are serialized. */
const asText = (data: unknown): string | null => {
  if (data == null || data === '') {
    return null;
  }
  return typeof data === 'string' ? data : JSON.stringify(data);
};
