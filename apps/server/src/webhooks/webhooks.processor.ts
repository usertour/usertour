import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import { Job } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { QUEUE_WEBHOOK_DELIVERY } from '@/common/consts/queen';
import { createGuardedHttpsAgent, guardedLookup } from '@/common/egress/egress-guard';
import { WEBHOOK_SIGNATURE_HEADER, signWebhookPayload } from './webhook-signature';
import { WebhookDeliveryJobData } from './webhook.types';

const DELIVERY_TIMEOUT_MS = 10_000;
const ERROR_MAX_LENGTH = 500;

/**
 * Delivers one webhook message per job. The endpoint row is re-read at send
 * time so a rotated secret applies to in-flight retries and a disabled or
 * deleted endpoint silently drops them. Non-2xx / network failures are
 * rethrown so BullMQ retries per the job's backoff policy — every attempt is
 * recorded as a WebhookDelivery row either way.
 */
@Processor(QUEUE_WEBHOOK_DELIVERY)
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<WebhookDeliveryJobData>): Promise<void> {
    const { webhookId, messageId, topic, payload } = job.data;

    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook || !webhook.enabled) {
      return;
    }

    // Stringify exactly once: the signature is computed over the same string
    // that goes on the wire — re-serialization would break receiver-side
    // verification.
    const body = JSON.stringify(payload);
    const timestampSec = Math.floor(Date.now() / 1000);
    const signature = signWebhookPayload(webhook.secret, timestampSec, body);

    const allowPrivateNetwork = !!this.configService.get('globalConfig.allowPrivateNetworkEgress');

    const startedAt = Date.now();
    const attempt = job.attemptsMade + 1;

    try {
      const response = await axios.post(webhook.url, body, {
        headers: {
          'Content-Type': 'application/json',
          [WEBHOOK_SIGNATURE_HEADER]: signature,
        },
        timeout: DELIVERY_TIMEOUT_MS,
        // Redirects are refused rather than followed: a 3xx is recorded as a
        // failed delivery, keeping endpoint behavior predictable.
        maxRedirects: 0,
        ...(allowPrivateNetwork
          ? {}
          : {
              httpsAgent: createGuardedHttpsAgent(),
              // node:net's LookupFunction and axios's lookup signature differ only
              // in the (runtime-compatible) family type — bridge the declarations.
              lookup: guardedLookup as unknown as AxiosRequestConfig['lookup'],
            }),
      });

      await this.recordDelivery(webhookId, messageId, topic, attempt, {
        success: true,
        responseStatus: response.status,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      await this.recordDelivery(webhookId, messageId, topic, attempt, {
        success: false,
        responseStatus: (error as any).response?.status ?? null,
        error: String((error as Error).message ?? error).slice(0, ERROR_MAX_LENGTH),
        durationMs: Date.now() - startedAt,
      });
      // Rethrow so BullMQ retries with backoff.
      throw error;
    }
  }

  private async recordDelivery(
    webhookId: string,
    messageId: string,
    topic: string,
    attempt: number,
    result: {
      success: boolean;
      responseStatus?: number | null;
      error?: string;
      durationMs: number;
    },
  ): Promise<void> {
    try {
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId,
          messageId,
          topic,
          attempt,
          success: result.success,
          responseStatus: result.responseStatus ?? null,
          error: result.error ?? null,
          durationMs: result.durationMs,
        },
      });
    } catch (error) {
      // Delivery logging is observability, not the delivery itself — never let
      // a logging failure trigger a duplicate send.
      this.logger.error(`Failed to record webhook delivery for ${webhookId}`, error as Error);
    }
  }
}
