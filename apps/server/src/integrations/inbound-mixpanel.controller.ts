import { Body, Controller, HttpCode, HttpException, Logger, Param, Post } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Public } from '@/common/decorators/public.decorator';
import { CohortSyncService } from './cohort-sync.service';
import { hashInboundToken } from './inbound-token';
import { InboundParseError, parseMixpanelWebhook } from './inbound-mixpanel.parser';
import { IntegrationsService } from './integrations.service';

/**
 * Mixpanel Custom Webhook receiver (ADR 0012 §7). Status codes follow
 * Mixpanel's retry contract — any 4xx PAUSES the sync permanently, 5xx/429
 * retries and re-runs next cycle:
 *
 *   - unknown token → 404: a rotated-away URL should die for good;
 *   - disabled switch / lapsed plan → 503: a recoverable refusal — flipping
 *     the switch back on resumes on the provider's next cycle, and the
 *     failures stay visible in ITS delivery log (never a fake 2xx);
 *   - malformed payload → 400: not retryable, pausing is correct.
 *
 * Success responds with Mixpanel's expected body: { action, status: "success" }.
 * PII discipline: member payloads are parsed for the identity field only and
 * are never logged.
 */
@Controller('inbound')
export class InboundMixpanelController {
  private readonly logger = new Logger(InboundMixpanelController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cohortSync: CohortSyncService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Public()
  @Post('mixpanel/:token')
  @HttpCode(200)
  async receive(@Param('token') token: string, @Body() body: unknown) {
    const integration = await this.prisma.integration.findUnique({
      where: { inboundTokenHash: hashInboundToken(token) },
    });
    if (!integration || integration.provider !== 'mixpanel') {
      throw new HttpException(failure('Unknown token', 404), 404);
    }
    if (!integration.inboundEnabled) {
      throw new HttpException(failure('Cohort sync is disabled', 503), 503);
    }
    if (!(await this.integrationsService.isEntitled(integration.environmentId))) {
      throw new HttpException(failure('Plan does not include integrations', 503), 503);
    }

    const action = (body as { action?: string })?.action ?? 'members';
    const userIdProperty = (integration.inboundConfig as { userIdProperty?: string } | null)
      ?.userIdProperty;
    try {
      const batch = parseMixpanelWebhook(body, integration.id, userIdProperty);
      const result = await this.cohortSync.processBatch(batch);
      this.logger.log(
        `Cohort sync ${batch.action} for integration ${integration.id}: ${result.matched} matched, ${result.unresolved} unresolved`,
      );
      return { action, status: 'success' };
    } catch (error) {
      if (error instanceof InboundParseError) {
        throw new HttpException(failure(error.message, 400), 400);
      }
      // Transient (DB hiccup, race): 503 so Mixpanel retries; no body logged.
      this.logger.error(`Cohort sync failed for integration ${integration.id}`, error as Error);
      throw new HttpException(failure('Temporary processing failure', 503), 503);
    }
  }
}

/** Mixpanel's documented failure envelope. */
const failure = (message: string, code: number) => ({
  status: 'failure',
  error: { message, code },
});
