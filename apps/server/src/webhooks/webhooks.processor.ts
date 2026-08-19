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
      // Rethrow so BullMQ retries with backoff.
      throw error;
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
