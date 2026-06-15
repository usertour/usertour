import {
  OAUTH_TOKEN_PREFIX,
  generateApiTokenSecret,
  hashApiTokenSecret,
  stripTokenPrefix,
} from '@/api-token/api-token.crypto';

/** Refresh tokens are validated against OAuthGrant, never the ApiToken path. */
export const OAUTH_REFRESH_TOKEN_PREFIX = 'utr_';

/** A high-entropy, URL-safe opaque secret (codes, refresh, client secrets, …). */
export const generateOpaqueSecret = generateApiTokenSecret;

/** SHA-256 hex — the same hash the ApiToken lookup uses, so access tokens match. */
export const hashSecret = hashApiTokenSecret;

/** Compose the plaintext OAuth access token (`uto_…`) handed to the client. */
export function composeOAuthAccessToken(secret: string): string {
  return `${OAUTH_TOKEN_PREFIX}${secret}`;
}

/** The bare secret of an `uto_`/`utp_` access token, for hashing into ApiToken. */
export function accessTokenSecret(token: string): string | null {
  return stripTokenPrefix(token);
}

/** Compose / hash the plaintext OAuth refresh token (`utr_…`, opaque to us). */
export function composeOAuthRefreshToken(secret: string): string {
  return `${OAUTH_REFRESH_TOKEN_PREFIX}${secret}`;
}
