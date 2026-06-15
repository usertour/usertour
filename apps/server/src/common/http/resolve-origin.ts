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
