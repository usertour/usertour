import { Capability } from '@usertour/types';

/** RFC 9728 Protected Resource Metadata. */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: string[];
}

/** RFC 8414 Authorization Server Metadata (the subset MCP clients consume). */
export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint: string;
  registration_endpoint: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  code_challenge_methods_supported: string[];
  scopes_supported: string[];
}

// OAuth scopes ARE our Capability strings (e.g. `content:read`), the same values
// stored on a token's `scopes` and intersected with the owner's role per request.
const SCOPES_SUPPORTED = Object.values(Capability);

/** The MCP resource (`<origin>/mcp`) points back at this server as its own AS. */
export function buildProtectedResourceMetadata(origin: string): ProtectedResourceMetadata {
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    scopes_supported: SCOPES_SUPPORTED,
    bearer_methods_supported: ['header'],
  };
}

export function buildAuthorizationServerMetadata(origin: string): AuthorizationServerMetadata {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    revocation_endpoint: `${origin}/oauth/revoke`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    // public clients (PKCE, no secret) + confidential (client_secret_post)
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: SCOPES_SUPPORTED,
  };
}
