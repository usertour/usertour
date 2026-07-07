import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import OAuth2Server from '@node-oauth/oauth2-server';
import { ROLE_CAPABILITIES } from '@usertour/constants';
import { Capability, Role } from '@usertour/types';
import { Request, Response } from 'express';
import { PrismaService } from 'nestjs-prisma';

import { resolveOrigin } from '@/common/http/resolve-origin';

import { OAuthService } from './oauth.service';

/** Bearer value from an Authorization header, or null. The scheme is matched
 * case-insensitively (RFC 7235 §2.1), like the api-token guard's extractBearer. */
function bearer(header: string | undefined): string | null {
  if (!header) return null;
  const [type, value] = header.split(' ');
  return type?.toLowerCase() === 'bearer' && value ? value : null;
}

/**
 * The OAuth 2.1 authorization-server endpoints. Discovery metadata lives in
 * {@link OAuthDiscoveryController}; this serves DCR, the authorize→consent flow,
 * and the token/revoke endpoints. Consent endpoints authenticate the Usertour
 * user via the JWT cookie (same as the web app); token/register/revoke are public
 * (client auth is handled by the OAuth layer / PKCE).
 */
@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Dynamic Client Registration (RFC 7591) ──────────────────────────────────
  @Post('register')
  async register(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.oauth.register(body, resolveOrigin(this.config, req));
  }

  // RFC 7592 read — resolves the dangling registration_client_uri pointer.
  @Get('register/:clientId')
  async readClient(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ) {
    const client = await this.oauth.clientForRegistrationToken(bearer(authorization) ?? '');
    if (!client || client.id !== clientId) {
      res.status(401).json({ error: 'invalid_token' });
      return;
    }
    res.json({
      client_id: client.id,
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      token_endpoint_auth_method:
        client.clientType === 'confidential' ? 'client_secret_post' : 'none',
    });
  }

  // ── Authorize → consent ──────────────────────────────────────────────────────
  /** Entry point opened in the user's browser by the MCP client. */
  @Get('authorize')
  async authorize(@Req() req: Request, @Res() res: Response) {
    // Throws 400 on a bad client/redirect — we must NOT redirect to an
    // unvalidated URI. Once validated, hand off to the web consent page.
    const claims = await this.oauth.validateAuthorizeRequest(req.query as Record<string, unknown>);
    const transaction = this.oauth.signTransaction(claims);
    const consentBase =
      this.config.get<string>('app.homepageUrl') || resolveOrigin(this.config, req);
    // `/oauth-consent` (not under `/oauth/`) so the web app's `/oauth/` → API
    // proxy doesn't swallow the SPA route.
    const url = new URL('/oauth-consent', consentBase);
    url.searchParams.set('transaction', transaction);
    res.redirect(url.toString());
  }

  /** The web consent page fetches what to display + the user's projects. */
  @Get('consent-info')
  @UseGuards(AuthGuard('jwt'))
  async consentInfo(@Query('transaction') transaction: string, @Req() req: Request) {
    const claims = this.oauth.verifyTransaction(transaction);
    const client = await this.oauth.getClientDisplay(claims.clientId);
    const userId = (req as Request & { user: { id: string } }).user.id;

    const memberships = await this.prisma.userOnProject.findMany({
      where: { userId },
      include: { project: { select: { id: true, name: true } } },
    });
    const visible = memberships.filter((m) => m.project);
    // Per-project environments, so the consent page can offer an environment scope.
    const environments = await this.prisma.environment.findMany({
      where: { projectId: { in: visible.map((m) => m.projectId) }, deleted: false },
      select: { id: true, name: true, projectId: true },
      orderBy: { createdAt: 'asc' },
    });
    // The consent page shows a scope picker — the user grants a subset of what the
    // client requested ∩ their role on the chosen project, and which environments it covers.
    const projects = visible.map((m) => ({
      id: m.projectId,
      name: m.project?.name ?? m.projectId,
      capabilities: (ROLE_CAPABILITIES[m.role as Role] ?? []) as Capability[],
      environments: environments
        .filter((e) => e.projectId === m.projectId)
        .map((e) => ({ id: e.id, name: e.name })),
    }));

    return {
      client,
      redirectHost: safeHost(claims.redirectUri),
      projects,
      requestedScopes: claims.scope,
    };
  }

  /** Approve or deny. On approve, issue a code and return the client redirect. */
  @Post('authorize/consent')
  @UseGuards(AuthGuard('jwt'))
  async consent(
    @Req() req: Request,
    @Body()
    body: {
      transaction: string;
      projectId?: string;
      approved?: boolean;
      scopes?: string[];
      environmentIds?: string[];
    },
  ) {
    const claims = this.oauth.verifyTransaction(body.transaction);

    if (!body.approved) {
      const url = new URL(claims.redirectUri);
      url.searchParams.set('error', 'access_denied');
      if (claims.state) url.searchParams.set('state', claims.state);
      return { redirect: url.toString() };
    }

    const userId = (req as Request & { user: { id: string } }).user.id;
    const projectId = body.projectId;
    if (!projectId) {
      throw new OAuth2Server.InvalidRequestError('A project must be selected');
    }
    const membership = await this.prisma.userOnProject.findFirst({ where: { userId, projectId } });
    if (!membership) {
      throw new OAuth2Server.InvalidRequestError('Not a member of the selected project');
    }
    const roleCaps = (ROLE_CAPABILITIES[membership.role as Role] ?? []) as Capability[];
    // Max grantable = what the client requested ∩ the user's role (full role if it asked for
    // nothing). The consent page may narrow further; clamp to never exceed.
    const grantable: string[] =
      claims.scope.length > 0
        ? claims.scope.filter((s) => roleCaps.includes(s as Capability))
        : roleCaps;
    const granted: string[] = body.scopes
      ? body.scopes.filter((s) => grantable.includes(s))
      : grantable;

    // Environment scope (optional): every chosen env must belong to the selected project.
    let allowedEnvironmentIds: string[] | null = null;
    if (body.environmentIds?.length) {
      const ids = [...new Set(body.environmentIds)];
      const inProject = await this.prisma.environment.findMany({
        where: { id: { in: ids }, projectId, deleted: false },
        select: { id: true },
      });
      if (inProject.length !== ids.length) {
        throw new OAuth2Server.InvalidRequestError('Environment not in the selected project');
      }
      allowedEnvironmentIds = ids;
    }

    const redirect = await this.oauth.issueAuthorizationCode(
      claims,
      userId,
      projectId,
      granted,
      allowedEnvironmentIds,
    );
    return { redirect };
  }

  // ── Token / revoke ───────────────────────────────────────────────────────────
  @Post('token')
  async token(@Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.oauth.token({
        headers: req.headers as Record<string, string>,
        method: req.method,
        query: req.query as Record<string, string>,
        body: req.body,
      });
      res.status(200).json(result);
    } catch (error) {
      sendOAuthError(res, error);
    }
  }

  @Post('revoke')
  async revoke(@Body() body: { token?: string }) {
    // RFC 7009: an invalid token still returns 200.
    await this.oauth.revoke(String(body?.token ?? ''));
    return {};
  }
}

function safeHost(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}

function sendOAuthError(res: Response, error: unknown): void {
  if (error instanceof OAuth2Server.OAuthError) {
    res.status(error.code || 400).json({
      error: error.name,
      error_description: error.message,
    });
    return;
  }
  res.status(400).json({
    error: 'invalid_request',
    error_description: error instanceof Error ? error.message : 'Invalid request',
  });
}
