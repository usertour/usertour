import { createHash, randomBytes } from 'node:crypto';

/**
 * The display + parsing prefix for a personal API token. The full token
 * presented to the user is `utp_<secret>`; only the SHA-256 hash of `<secret>`
 * is stored.
 *
 * Self-describing prefix family so a token's type is identifiable from the
 * string alone (e.g. in logs): `utp_` personal, `uto_` reserved for
 * OAuth-issued tokens, `uts_` for service accounts.
 */
export const API_TOKEN_PREFIX = 'utp_';

/** Prefix for OAuth-issued access tokens (Phase 3). Same length as `utp_`. */
export const OAUTH_TOKEN_PREFIX = 'uto_';

/** Token prefixes accepted on inbound requests (personal + OAuth-issued). */
export const ACCEPTED_TOKEN_PREFIXES = [API_TOKEN_PREFIX, OAUTH_TOKEN_PREFIX] as const;

/**
 * Strip a recognized token prefix, returning the bare secret — or `null` when the
 * string carries no known prefix. The stored hash is over the secret only, so the
 * lookup is prefix-agnostic; `utp_` and `uto_` resolve through the same path.
 */
export function stripTokenPrefix(raw: string): string | null {
  for (const prefix of ACCEPTED_TOKEN_PREFIXES) {
    if (raw.startsWith(prefix)) {
      return raw.slice(prefix.length);
    }
  }
  return null;
}

const SECRET_BYTES = 32;

/**
 * Generate a high-entropy, URL-safe token secret. The plaintext is returned to
 * the caller once at creation and never persisted.
 */
export function generateApiTokenSecret(): string {
  return randomBytes(SECRET_BYTES).toString('base64url');
}

/**
 * Hash a token secret for storage / lookup. The secret is high-entropy random,
 * so a fast hash (SHA-256) is sufficient and — unlike a salted password hash —
 * lets us index and look the token up by its hash. Argon2/bcrypt are for
 * low-entropy passwords and are not appropriate here.
 */
export function hashApiTokenSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

/** Trailing characters of the secret, kept for display in the UI only. */
export function partialApiTokenSecret(secret: string): string {
  return secret.slice(-4);
}

/** Compose the full plaintext token from a generated secret. */
export function composeApiToken(secret: string): string {
  return `${API_TOKEN_PREFIX}${secret}`;
}
