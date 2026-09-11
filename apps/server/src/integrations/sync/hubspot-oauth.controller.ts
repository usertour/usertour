import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { FeatureRequiresLicenseError } from '@/common/errors/errors';
import { INTEGRATION_TX_COOKIE } from '@/utils/cookie';
import { isHubspotReturnUrl } from './hubspot-api';
import {
  INTEGRATION_TX_COOKIE_PATH,
  AccountInUseError,
  ProviderConnectionService,
} from './provider-connection.service';
import { ObjectMappingService } from './object-mapping.service';

/**
 * HubSpot OAuth callback (ADR 0013 §2). The path is registered as a redirect
 * URL on the HubSpot app (integrations/hubspot/src/app/app-hsmeta.json) —
 * changing it means re-uploading the app. It lives under /api like the SSO
 * callback so every reverse proxy in front of the server (nginx in the
 * self-host image, the web dev server) already routes it. It is a top-level
 * browser navigation, so every outcome ends in a redirect to the settings page.
 *
 * The callback completes only for the browser that ran `startIntegrationOAuth`: that
 * mutation sets an httpOnly transaction cookie in its authenticated response
 * (the session cookie is `strict` and would not survive the provider's
 * cross-site redirect), and the cookie must match the state received here.
 * Anything reachable by URL — an authorize link, a start route — could be
 * forwarded to a victim, whose provider account would then authorize into the
 * attacker's environment. A cookie set by an authenticated response cannot be.
 *
 * Two ways in. From Usertour, `startIntegrationOAuth` sends the browser to
 * HubSpot's consent screen and HubSpot returns it here with the code. From
 * HubSpot's marketplace ("Install app"), HubSpot sends the browser here first
 * with `step=authorize` and a `returnUrl`; the install page has the customer
 * sign in and pick an environment, runs the same mutation with that returnUrl
 * so the state travels back to HubSpot, HubSpot shows consent and returns
 * with `step=finalize`, the code, the state and the returnUrl — where the
 * install ends. Both legs verify the same way; only the destinations differ.
 */
@Controller('api/integrations/hubspot/oauth')
export class HubspotOAuthController {
  private readonly logger = new Logger(HubspotOAuthController.name);

  constructor(
    private readonly connections: ProviderConnectionService,
    private readonly mappings: ObjectMappingService,
    private readonly configService: ConfigService,
  ) {}

  @Get('callback')
  @Public()
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') providerError: string | undefined,
    @Query('step') step: string | undefined,
    @Query('returnUrl') returnUrlParam: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Only a HubSpot address may receive the browser; anything else is dropped.
    const returnUrl = isHubspotReturnUrl(returnUrlParam) ? returnUrlParam : undefined;
    if (step === 'authorize') {
      return res.redirect(this.installUrl(returnUrl ? { returnUrl } : { error: 'failed' }));
    }
    const marketplace = step === 'finalize';
    let projectId: string | undefined;
    res.clearCookie(INTEGRATION_TX_COOKIE, { path: INTEGRATION_TX_COOKIE_PATH });
    try {
      const transaction = await this.connections.verifyState(state ?? '');
      projectId = transaction.projectId;
      const cookie = req.cookies?.[INTEGRATION_TX_COOKIE];
      if (!cookie || cookie !== state) {
        // Not the browser that started this handshake.
        return res.redirect(this.failureUrl(projectId, marketplace, 'failed'));
      }
      if (providerError || !code) {
        // The user declined on HubSpot's consent screen (or HubSpot refused).
        return res.redirect(this.failureUrl(projectId, marketplace, 'denied'));
      }
      const { integration, previousAccountId } = await this.connections.completeOAuth(
        transaction,
        code,
      );
      if (previousAccountId && previousAccountId !== integration.remoteAccountId) {
        await this.mappings.resetAfterAccountChange(integration.id, previousAccountId);
      } else {
        // Disconnect dropped the account's change subscriptions; put them back.
        await this.mappings.reconcileSubscriptions(integration.id);
      }
      // A marketplace install ends where HubSpot asked — it shows the app as
      // installed there; the settings page is where a Usertour-started one ends.
      return res.redirect(returnUrl ?? this.settingsUrl(projectId, { connected: '1' }));
    } catch (error) {
      const reason =
        error instanceof FeatureRequiresLicenseError
          ? 'license'
          : error instanceof AccountInUseError
            ? 'inUse'
            : 'failed';
      this.logger.warn(`HubSpot OAuth callback failed (${reason}): ${(error as Error).message}`);
      return res.redirect(this.failureUrl(projectId, marketplace, reason));
    }
  }

  /**
   * Failures land where the user can read them: the settings page once the
   * environment is known; the install page for a marketplace install that
   * never reached us with a usable state (never HubSpot's returnUrl, which
   * would show nothing).
   */
  private failureUrl(projectId: string | undefined, marketplace: boolean, error: string): string {
    if (!projectId && marketplace) {
      return this.installUrl({ error });
    }
    return this.settingsUrl(projectId, { error });
  }

  /** The dashboard's install page: sign in, pick an environment, hand the state to HubSpot. */
  private installUrl(query: Record<string, string>): string {
    return `${this.homepageUrl()}/integrations/hubspot/install?${new URLSearchParams(query).toString()}`;
  }

  private settingsUrl(projectId: string | undefined, query: Record<string, string>): string {
    const homepage = this.homepageUrl();
    const search = new URLSearchParams({ provider: 'hubspot', ...query }).toString();
    return projectId
      ? `${homepage}/project/${projectId}/settings/integrations/hubspot?${search}`
      : `${homepage}/?${search}`;
  }

  private homepageUrl(): string {
    return (this.configService.get<string>('app.homepageUrl') || '').replace(/\/+$/, '');
  }
}
