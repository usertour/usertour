import { createHash, randomBytes } from 'node:crypto';

/**
 * The display + parsing prefix for an API token. The full token presented to
 * the user is `ut_<secret>`; only the SHA-256 hash of `<secret>` is stored.
 */
export const API_TOKEN_PREFIX = 'ut_';

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
