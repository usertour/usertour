import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * The public origin the server is reachable at — the issuer/base for OAuth
 * metadata and `WWW-Authenticate` `resource_metadata` URLs. Prefers the
 * configured `app.apiUrl` (the canonical public host); falls back to the request
 * host (dev / when unset). `trust proxy` is on, so `req.protocol` honours
 * `X-Forwarded-Proto`. Returned without a trailing slash.
 */
export function resolveOrigin(config: ConfigService, req: Request): string {
  const configured = config.get<string>('app.apiUrl');
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * The MCP endpoint's public URL — `app.mcpServerUrl` (MCP_SERVER_URL), which
 * defaults to `${API_URL}/mcp`, so with nothing configured this equals the
 * old behavior. One knob, three consumers: the Settings page display, the
 * protected-resource metadata `resource`, and the `/mcp` 401 challenge. They
 * used to read DIFFERENT configs (display read MCP_SERVER_URL, metadata read
 * API_URL), so a deployment serving MCP on its own domain told users one URL
 * and clients another — RFC 9728 resource validation then refused the
 * mismatch and the whole auth flow died.
 */
export function resolveMcpResource(config: ConfigService, req: Request): string {
  const configured = config.get<string>('app.mcpServerUrl');
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return `${resolveOrigin(config, req)}/mcp`;
}

/** Origin of {@link resolveMcpResource} — the base for the OAuth endpoints an
 * MCP client is told to use, so that domain must proxy `/oauth/*` and
 * `/.well-known/oauth-*` too (the nginx config does). */
export function resolveMcpOrigin(config: ConfigService, req: Request): string {
  try {
    return new URL(resolveMcpResource(config, req)).origin;
  } catch {
    // Malformed MCP_SERVER_URL (no scheme) — fall back to the API origin
    // rather than emitting metadata no client could validate.
    return resolveOrigin(config, req);
  }
}
