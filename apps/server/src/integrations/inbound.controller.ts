import { Body, Controller, HttpCode, HttpException, Logger, Param, Post } from '@nestjs/common';
import { Integration } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { Public } from '@/common/decorators/public.decorator';
import { CohortSyncBatch } from './cohort-sync.types';
import { CohortSyncService } from './cohort-sync.service';
import { hashInboundToken } from './inbound-token';
import { parseAmplitudeWebhook } from './inbound-amplitude.parser';
import { InboundParseError, parseMixpanelWebhook } from './inbound-mixpanel.parser';
import { IntegrationsService } from './integrations.service';

/**
 * Cohort-sync webhook receivers (ADR 0012 §7) — one route per provider, all
 * sharing the token/switch/plan gauntlet. Status codes follow the strictest
 * retry contract among the providers (Mixpanel's: any 4xx PAUSES its sync
 * permanently, 5xx/429 retries and re-runs next cycle):
 *
 *   - unknown token → 404: a rotated-away URL should die for good;
 *   - disabled switch / lapsed plan → 503: a recoverable refusal — flipping
 *     the switch back on resumes on the provider's next cycle, and the
 *     failures stay visible in ITS delivery log (never a fake 2xx);
 *   - malformed payload → 400: not retryable, pausing is correct.
 *
 * Amplitude retries on timeout and may re-deliver a batch — the engine's
 * set-based writes absorb replays. PII discipline: member payloads are
 * parsed for the identity field only and are never logged.
 */
@Controller('inbound')
export class InboundController {
  private readonly logger = new Logger(InboundController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cohortSync: CohortSyncService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Public()
  @Post('mixpanel/:token')
  @HttpCode(200)
  async receiveMixpanel(@Param('token') token: string, @Body() body: unknown) {
    const integration = await this.guardedIntegration(token, 'mixpanel');
    const action = (body as { action?: string })?.action ?? 'members';
    await this.process(integration, body, parseMixpanelWebhook);
    // Mixpanel's documented success envelope echoes the action.
    return { action, status: 'success' };
  }

  @Public()
  @Post('amplitude/:token')
  @HttpCode(200)
  async receiveAmplitude(@Param('token') token: string, @Body() body: unknown) {
    const integration = await this.guardedIntegration(token, 'amplitude');
    await this.process(integration, body, parseAmplitudeWebhook);
    return { status: 'success' };
  }

  /** The shared gauntlet: token lookup, provider match, switch, plan gate. */
  private async guardedIntegration(token: string, provider: string): Promise<Integration> {
    const integration = await this.prisma.integration.findUnique({
      where: { inboundTokenHash: hashInboundToken(token) },
    });
    if (!integration || integration.provider !== provider) {
      throw new HttpException(failure('Unknown token', 404), 404);
    }
    if (!integration.inboundEnabled) {
      throw new HttpException(failure('Cohort sync is disabled', 503), 503);
    }
    if (!(await this.integrationsService.isEntitled(integration.environmentId))) {
      throw new HttpException(failure('Plan does not include integrations', 503), 503);
    }
    return integration;
  }

  private async process(
    integration: Integration,
    body: unknown,
    parse: (body: unknown, integrationId: string, userIdProperty?: string) => CohortSyncBatch,
  ): Promise<void> {
    const userIdProperty = (integration.inboundConfig as { userIdProperty?: string } | null)
      ?.userIdProperty;
    try {
      const batch = parse(body, integration.id, userIdProperty);
      const result = await this.cohortSync.processBatch(batch);
      this.logger.log(
        `Cohort sync ${batch.action} for integration ${integration.id}: ${result.matched} matched, ${result.unresolved} unresolved`,
      );
    } catch (error) {
      if (error instanceof InboundParseError) {
        throw new HttpException(failure(error.message, 400), 400);
      }
      // Transient (DB hiccup, race): 503 so the provider retries; no body logged.
      this.logger.error(`Cohort sync failed for integration ${integration.id}`, error as Error);
      throw new HttpException(failure('Temporary processing failure', 503), 503);
    }
  }
}

/** Mixpanel's documented failure envelope; harmless extra detail for others. */
const failure = (message: string, code: number) => ({
  status: 'failure',
  error: { message, code },
});
