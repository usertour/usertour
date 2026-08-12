import { Controller, Get, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { resolveMcpOrigin, resolveMcpResource } from '@/common/http/resolve-origin';

import { buildAuthorizationServerMetadata, buildProtectedResourceMetadata } from './oauth-metadata';

/**
 * OAuth discovery metadata — how an MCP client bootstraps the auth flow. Public
 * (no auth). On a 401 from `/mcp`, the `WWW-Authenticate` header points here, the
 * client reads the protected-resource doc to find the authorization server, then
 * reads the authorization-server doc for the endpoints. Both the bare and the
 * `/mcp`-suffixed paths are served for client compatibility (RFC 9728 §3.3).
 */
@Controller('.well-known')
export class OAuthDiscoveryController {
  constructor(private readonly config: ConfigService) {}

  @Get(['oauth-protected-resource', 'oauth-protected-resource/mcp'])
  protectedResource(@Req() req: Request) {
    // MCP-derived, not the API origin: when MCP_SERVER_URL puts /mcp on its
    // own domain, `resource` must equal the URL clients actually connect to.
    return buildProtectedResourceMetadata(
      resolveMcpOrigin(this.config, req),
      resolveMcpResource(this.config, req),
    );
  }

  @Get(['oauth-authorization-server', 'oauth-authorization-server/mcp'])
  authorizationServer(@Req() req: Request) {
    return buildAuthorizationServerMetadata(resolveMcpOrigin(this.config, req));
  }
}
