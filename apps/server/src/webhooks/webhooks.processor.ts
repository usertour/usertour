import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import { DelayedError, Job } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { QUEUE_WEBHOOK_DELIVERY } from '@/common/consts/queen';
import {
  assertPublicHttpUrl,
  createGuardedHttpsAgent,
  guardedLookup,
} from '@/common/egress/egress-guard';
import compileEmailTemplate from '@/common/email/compile-email-template';
import { EmailService } from '@/shared/email.service';
import { EncryptionService } from '@/shared/encryption.service';
import { AuditService } from '@/audit/audit.service';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';
import { RetryAfterCarrier, deliveryBackoffStrategy, parseRetryAfter } from './webhook-backoff';
import { WEBHOOK_SIGNATURE_HEADER, signWebhookPayload } from './webhook-signature';
import { WebhookDeliveryJobData } from './webhook.types';

const DELIVERY_TIMEOUT_MS = 10_000;
// Memory safety valve: the receiver's URL is arbitrary user input, and axios
// buffers the whole response before we truncate it for the ledger — without a
// cap a hostile endpoint returning gigabytes ooms the worker (x concurrency).
// A webhook response is an ack; anything past 256 KB is protocol abuse and the
// attempt is recorded as failed (axios rejects when the cap is exceeded).
const RESPONSE_MAX_BYTES = 256 * 1024;
// Cooldown layer of the circuit breaker (ADR 0010): after this many FAILED
// ATTEMPTS in a row (across messages — any delivered attempt resets), the
// endpoint cools down. Attempt-level, not message-level: with the ~24h retry
// ladder a message's FINAL failure arrives a day late, far too slow a signal
// to shed load with. Cooling defers attempts (moveToDelayed) — it never drops
// messages; the ledger is written regardless.
const COOLDOWN_THRESHOLD = 10;
const COOLDOWN_BASE_MS = 60_000; // 1 minute
const COOLDOWN_MAX_MS = 60 * 60_000; // capped at 1 hour
// Spread the release of jobs parked on the same cooldown so its expiry does
// not stampede a just-recovered receiver.
const COOLDOWN_RELEASE_JITTER_MS = 30_000;
// Layer 2: an endpoint whose failure streak has lasted this long gets disabled
// (nothing was delivered in that whole window anyway) and the project owner is
// notified. Re-enabling is a manual switch in the dashboard. No scheduler: the
// check rides on failed attempts, and a dead-but-trafficked endpoint produces
// those every cooldown cycle.
const AUTO_DISABLE_AFTER_MS = 7 * 24 * 60 * 60_000; // 7 days
// How many deliveries one worker runs concurrently. Sequential (the BullMQ
// default) lets a single hung endpoint (10s timeout per attempt) head-of-line
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
@Processor(QUEUE_WEBHOOK_DELIVERY, {
  concurrency: DELIVERY_CONCURRENCY,
  settings: {
    // The ~24h ladder (webhook-backoff.ts), raised to a 429's Retry-After
    // when the receiver asked for a longer pause, positioned by the
    // message-lifecycle attempt count (job.data.attemptOffset included).
    // Jobs opt in with backoff: { type: 'custom' }.
    backoffStrategy: deliveryBackoffStrategy,
  },
})
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

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

  async process(job: Job<WebhookDeliveryJobData>, token?: string): Promise<void> {
    const { webhookId, messageId, payload, attemptOffset = 0 } = job.data;

    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) {
      // Deleted between enqueue and delivery: the message and its attempt
      // rows are already gone with it (OutboundMessage.webhookId cascades),
      // so there is no ledger left to write to — recording here would only
      // fail the FK and log noise. Silent return is the honest move.
      return;
    }
    if (!webhook.enabled) {
      // Disabled between enqueue and delivery. Record the drop as a final
      // failed attempt instead of returning silently — otherwise the message
      // sits PENDING forever (and the dashboard refuses to resend a PENDING
      // message even after re-enable).
      await this.ledger.recordAttempt(messageId, {
        attempt: attemptOffset + job.attemptsMade + 1,
        success: false,
        error: 'Endpoint disabled at delivery time',
        final: true,
      });
      return;
    }

    if (
      job.data.manual !== true &&
      webhook.cooldownUntil &&
      webhook.cooldownUntil.getTime() > Date.now()
    ) {
      // Circuit breaker, layer 1: the endpoint is cooling down. Defer — never
      // drop: the job goes back to the delayed set until the window passes
      // (plus jitter so the release doesn't stampede), consuming no attempt,
      // no socket, and no ledger row. Manual sends (test event, resend) pass
      // through: the user IS the half-open probe, and their success resets
      // the breaker for everything that is waiting.
      const resumeAt =
        webhook.cooldownUntil.getTime() + Math.floor(Math.random() * COOLDOWN_RELEASE_JITTER_MS);
      // Heartbeat for the reconcile sweep: a defer records no attempt, so
      // without this touch a job bouncing across re-armed cooldown windows
      // looks identical to one whose job died with Redis — and would get
      // double-queued once its silence outlasts the orphan threshold.
      await this.ledger.touch(messageId);
      await job.moveToDelayed(resumeAt, token);
      throw new DelayedError();
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
        // Count it toward the breaker too — otherwise a policy-refused
        // endpoint never cools down or auto-disables, and every event keeps
        // minting a message plus a FAILED ledger row forever. The eventual
        // auto-disable email is also how the owner learns the URL is not
        // allowed anymore.
        await this.recordFailedAttempt(webhookId, webhook.url);
        return;
      }
    }

    // Secret is AES-256-GCM encrypted at rest; this processor reads the row
    // via Prisma directly, so it decrypts on its own (the domain service is
    // the plaintext boundary for every other consumer). decrypt returns NULL
    // on failure (wrong ENCRYPTION_KEY, legacy plaintext row) — guard it:
    // signing with null would throw BEFORE any recordAttempt, burning the
    // whole retry ladder with zero ledger rows and letting the reconcile
    // sweep re-queue the ghost forever. A deterministic failure instead:
    // final failed attempt (visible, explains itself) + breaker bookkeeping,
    // whose eventual auto-disable email is how the owner learns to rotate.
    const secret = this.encryption.decrypt(webhook.secret);
    if (!secret) {
      await this.ledger.recordAttempt(messageId, {
        attempt: attemptOffset + job.attemptsMade + 1,
        success: false,
        error: 'Signing secret cannot be decrypted — rotate the endpoint secret',
        final: true,
      });
      await this.recordFailedAttempt(webhookId, webhook.url);
      return;
    }

    // Stringify exactly once: the signature is computed over the same string
    // that goes on the wire — re-serialization would break receiver-side
    // verification.
    const body = JSON.stringify(payload);
    const timestampSec = Math.floor(Date.now() / 1000);
    const signature = signWebhookPayload(secret, timestampSec, body);

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
              // Without this, axios silently honors HTTP(S)_PROXY/ALL_PROXY env
              // vars: it would dial the PROXY (which the agent+lookup then vet)
              // and let the proxy resolve the target — voiding the SSRF guard.
              // A guarded delivery therefore never uses a proxy; deployments
              // that trust their proxy opt out via ALLOW_PRIVATE_NETWORK_EGRESS.
              proxy: false as const,
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
      await this.resetBreaker(webhookId, webhook.url);
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
      // Every failed attempt feeds the breaker (attempt-level counting).
      await this.recordFailedAttempt(webhookId, webhook.url);
      // Hand the receiver's Retry-After to the backoff strategy — but only
      // from 429/503, the statuses RFC 9110 defines it for. An intermediary
      // stamping Retry-After: 86400 on every error would otherwise stretch
      // each ladder rung to the 12h cap (~84h total vs the designed ~25h).
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
   * Any delivered attempt proves the endpoint is healthy again. Guarded on the
   * URL this delivery actually hit: a straggler result for a since-replaced
   * URL must not touch the new target's breaker state.
   */
  private async resetBreaker(webhookId: string, deliveredUrl: string): Promise<void> {
    try {
      // Guarded write: skip the UPDATE (and its updatedAt bump) on the healthy
      // path where there is nothing to clear. The guard must cover EVERY field
      // it clears — matching only the streak would strand an orphaned
      // failingSince stamp (a reset racing a concurrent final failure can
      // leave streak 0 with the stamp set), which would later mis-classify one
      // transient failure as seven days of sustained ones.
      await this.prisma.webhook.updateMany({
        where: {
          id: webhookId,
          url: deliveredUrl,
          OR: [
            { consecutiveFailures: { gt: 0 } },
            { failingSince: { not: null } },
            { cooldownUntil: { not: null } },
          ],
        },
        data: { consecutiveFailures: 0, cooldownUntil: null, failingSince: null },
      });
    } catch (error) {
      this.logger.error(`Failed to reset webhook breaker for ${webhookId}`, error as Error);
    }
  }

  /**
   * An attempt failed: grow the failure streak and, past the threshold,
   * (re)arm the cooldown — 1min doubling per further failed attempt, capped
   * at 1h. Atomic increment; the window is computed from the returned streak,
   * so concurrent failures at worst re-arm a similar window. Breaker
   * bookkeeping must never break the delivery path.
   */
  private async recordFailedAttempt(webhookId: string, deliveredUrl: string): Promise<void> {
    try {
      const now = new Date();
      // Guarded on the URL this delivery hit: up to concurrency-many in-flight
      // results for a just-replaced URL would otherwise stack onto the NEW
      // target's fresh streak (worst case ~10 strays = a 32-minute cooldown
      // the new URL never earned). updateMany can't return the row, hence the
      // follow-up read; both ride the failure path only.
      const { count } = await this.prisma.webhook.updateMany({
        where: { id: webhookId, url: deliveredUrl },
        data: { consecutiveFailures: { increment: 1 } },
      });
      if (count === 0) {
        return; // URL replaced (or row deleted) since this delivery started.
      }
      const row = await this.prisma.webhook.findUniqueOrThrow({
        where: { id: webhookId },
        select: { consecutiveFailures: true, failingSince: true, environmentId: true, url: true },
      });
      if (!row.failingSince) {
        // 0 -> 1 transition: stamp when this streak began. (Guarded so a
        // concurrent final failure doesn't move an existing stamp forward.)
        await this.prisma.webhook.updateMany({
          // Both terms matter: failingSince null keeps a concurrent failure
          // from moving an existing stamp, and the live-streak term keeps a
          // concurrent RESET from being followed by an orphaned stamp
          // (streak 0 + failingSince set), which would age into a false
          // "7 days of sustained failure".
          where: { id: webhookId, failingSince: null, consecutiveFailures: { gt: 0 } },
          data: { failingSince: now },
        });
      } else if (
        // Sustained = DURATION and an ACTIVE streak. The streak floor keeps a
        // stale/orphaned failingSince stamp from letting a single transient
        // failure disable a healthy endpoint.
        row.consecutiveFailures >= COOLDOWN_THRESHOLD &&
        now.getTime() - row.failingSince.getTime() >= AUTO_DISABLE_AFTER_MS
      ) {
        if (await this.autoDisable(webhookId, row.environmentId, row.url, row.failingSince)) {
          return;
        }
        // Lost the guarded flip (state moved under us): fall through to the
        // cooldown arm below — it carries its own streak guard, so if a
        // concurrent reset explains the miss it no-ops; if the endpoint is
        // still failing, this round still slows it down.
      }
      if (row.consecutiveFailures >= COOLDOWN_THRESHOLD) {
        const exponent = row.consecutiveFailures - COOLDOWN_THRESHOLD;
        const windowMs = Math.min(COOLDOWN_BASE_MS * 2 ** exponent, COOLDOWN_MAX_MS);
        // Guarded on the streak the window was computed from: if a concurrent
        // success reset it (or another failure advanced it), skip — arming a
        // cooldown on a freshly-reset endpoint would silently skip a healthy
        // endpoint's events for the whole window.
        await this.prisma.webhook.updateMany({
          where: { id: webhookId, consecutiveFailures: row.consecutiveFailures },
          data: { cooldownUntil: new Date(Date.now() + windowMs) },
        });
        this.logger.warn(
          `Webhook ${webhookId} cooling down for ${Math.round(windowMs / 1000)}s after ${row.consecutiveFailures} consecutive failed attempts`,
        );
      }
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        // Endpoint deleted between the send and the bookkeeping — benign race.
        this.logger.debug(`Webhook ${webhookId} deleted before its failure streak was recorded`);
        return;
      }
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
  ): Promise<boolean> {
    const { count } = await this.prisma.webhook.updateMany({
      // CAS on the decision's evidence: if a concurrent success or a URL
      // change reset failingSince since we read it, the "7 days of failure"
      // conclusion no longer holds — skip rather than disable a healthy row.
      where: { id: webhookId, enabled: true, failingSince },
      data: { enabled: false, autoDisabledAt: new Date(), cooldownUntil: null },
    });
    if (count === 0) {
      return false; // State moved under us (reset, URL change, or already disabled).
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
      return true; // Disabled fine; only the notification lost its addressee.
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
    // Concurrent sends (sendOrLog never throws): a hung SMTP server must not
    // serialize inside a delivery-worker slot. Usually one owner anyway.
    await Promise.all(
      owners
        .filter((owner) => owner.user?.email)
        .map((owner) =>
          this.emailService.sendOrLog({
            to: owner.user?.email as string,
            subject: 'A Usertour webhook endpoint was disabled after continuous failures',
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
