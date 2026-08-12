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

/** Compose the plaintext OAuth refresh token (`utr_…`, opaque to us). */
export function composeOAuthRefreshToken(secret: string): string {
  return `${OAUTH_REFRESH_TOKEN_PREFIX}${secret}`;
}

/**
 * The bare secret of a refresh token (`utr_…`). Deliberately SEPARATE from the
 * API-token guard's `stripTokenPrefix` (which only accepts `utp_`/`uto_`): `utr_`
 * must never be strippable there, or a refresh token could be replayed as a
 * bearer/access token.
 */
export function refreshTokenSecret(token: string): string | null {
  if (!token.startsWith(OAUTH_REFRESH_TOKEN_PREFIX)) {
    return null;
  }
  const secret = token.slice(OAUTH_REFRESH_TOKEN_PREFIX.length);
  return secret.length > 0 ? secret : null;
}

/**
 * The ONE storage rule for every prefixed token this server keeps — access
 * (`uto_`/`utp_`) and refresh (`utr_`): the DB fingerprint is the SHA-256 of the
 * BARE secret, prefix stripped. Every place that stores or looks up a token hash
 * goes through this, so a write and its matching read can never use different
 * recipes (the drift that made refresh-token revocation a silent no-op). Returns
 * null for a token with no recognized prefix.
 */
export function tokenFingerprint(token: string): string | null {
  const secret = accessTokenSecret(token) ?? refreshTokenSecret(token);
  return secret ? hashSecret(secret) : null;
}
