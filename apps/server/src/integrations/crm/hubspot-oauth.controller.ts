import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { FeatureRequiresLicenseError } from '@/common/errors/errors';
import { CrmConnectionService } from './crm-connection.service';
import { CrmMappingService } from './crm-mapping.service';

/**
 * HubSpot OAuth callback (ADR 0013 §2). The path is registered as a redirect
 * URL on the HubSpot app (integrations/hubspot/src/app/app-hsmeta.json) —
 * changing it means re-uploading the app. This is a top-level browser
 * navigation, so every outcome ends in a redirect to the settings page.
 */
@Controller('integrations/hubspot/oauth')
export class HubspotOAuthController {
  private readonly logger = new Logger(HubspotOAuthController.name);

  constructor(
    private readonly connections: CrmConnectionService,
    private readonly mappings: CrmMappingService,
    private readonly configService: ConfigService,
  ) {}

  @Get('callback')
  @Public()
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') providerError: string | undefined,
    @Res() res: Response,
  ) {
    let projectId: string | undefined;
    try {
      const transaction = await this.connections.verifyState(state ?? '');
      projectId = transaction.projectId;
      if (providerError || !code) {
        // The user declined on HubSpot's consent screen (or HubSpot refused).
        return res.redirect(this.settingsUrl(projectId, { error: 'denied' }));
      }
      const { integration, previousAccountId } = await this.connections.completeOAuth(
        transaction,
        code,
      );
      if (previousAccountId && previousAccountId !== integration.remoteAccountId) {
        await this.mappings.resetAfterAccountChange(integration.id, previousAccountId);
      }
      return res.redirect(this.settingsUrl(projectId, { connected: '1' }));
    } catch (error) {
      const reason = error instanceof FeatureRequiresLicenseError ? 'license' : 'failed';
      this.logger.warn(`HubSpot OAuth callback failed (${reason}): ${(error as Error).message}`);
      return res.redirect(this.settingsUrl(projectId, { error: reason }));
    }
  }

  private settingsUrl(projectId: string | undefined, query: Record<string, string>): string {
    const homepage = (this.configService.get<string>('app.homepageUrl') || '').replace(/\/+$/, '');
    const search = new URLSearchParams({ provider: 'hubspot', ...query }).toString();
    return projectId
      ? `${homepage}/project/${projectId}/settings/integrations/hubspot?${search}`
      : `${homepage}/?${search}`;
  }
}
