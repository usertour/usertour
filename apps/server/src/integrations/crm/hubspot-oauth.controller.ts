import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { FeatureRequiresLicenseError } from '@/common/errors/errors';
import { CRM_TX_COOKIE } from '@/utils/cookie';
import { CrmConnectionService } from './crm-connection.service';
import { CrmMappingService } from './crm-mapping.service';

const TX_COOKIE_PATH = '/integrations/hubspot/oauth';
const TX_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * HubSpot OAuth routes (ADR 0013 §2). The callback path is registered as a
 * redirect URL on the HubSpot app (integrations/hubspot/src/app/app-hsmeta.json)
 * — changing it means re-uploading the app. Both routes are top-level browser
 * navigations, so every outcome ends in a redirect to the settings page.
 *
 * The start route binds the handshake to the browser that began it: it sets
 * an httpOnly transaction cookie on this origin (the session cookie is
 * `strict` and would not survive the provider's cross-site redirect), and
 * the callback requires that cookie to match the state it receives. Without
 * this, an attacker could mint a start link for THEIR environment and have a
 * victim's provider account authorize into it.
 */
@Controller('integrations/hubspot/oauth')
export class HubspotOAuthController {
  private readonly logger = new Logger(HubspotOAuthController.name);

  constructor(
    private readonly connections: CrmConnectionService,
    private readonly mappings: CrmMappingService,
    private readonly configService: ConfigService,
  ) {}

  @Get('start')
  @Public()
  async start(@Query('state') state: string | undefined, @Res() res: Response) {
    let projectId: string | undefined;
    try {
      const transaction = await this.connections.verifyState(state ?? '');
      projectId = transaction.projectId;
      res.cookie(CRM_TX_COOKIE, state, {
        httpOnly: true,
        secure: !!this.configService.get('auth.cookie.secure'),
        // 'lax' so the cookie rides the provider's top-level GET back to /callback.
        sameSite: 'lax',
        maxAge: TX_COOKIE_MAX_AGE_MS,
        path: TX_COOKIE_PATH,
      });
      return res.redirect(this.connections.authorizeUrl(transaction, state ?? ''));
    } catch (error) {
      this.logger.warn(`HubSpot OAuth start refused: ${(error as Error).message}`);
      return res.redirect(this.settingsUrl(projectId, { error: 'failed' }));
    }
  }

  @Get('callback')
  @Public()
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') providerError: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let projectId: string | undefined;
    res.clearCookie(CRM_TX_COOKIE, { path: TX_COOKIE_PATH });
    try {
      const transaction = await this.connections.verifyState(state ?? '');
      projectId = transaction.projectId;
      const cookie = req.cookies?.[CRM_TX_COOKIE];
      if (!cookie || cookie !== state) {
        // Not the browser that started this handshake.
        return res.redirect(this.settingsUrl(projectId, { error: 'failed' }));
      }
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
