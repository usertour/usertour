import { createHash, randomBytes } from 'node:crypto';

/**
 * Inbound receive-token discipline (ADR 0012 §7): "utin_" + 32 random bytes.
 * The plaintext is AES-256-GCM encrypted at rest so the dashboard can
 * re-display the receive URL; the sha256 hash is the lookup/comparison key —
 * an indexed equality probe on a random digest, so timing reveals nothing.
 */
export const INBOUND_TOKEN_PREFIX = 'utin_';

export const generateInboundToken = (): string =>
  `${INBOUND_TOKEN_PREFIX}${randomBytes(32).toString('hex')}`;

export const hashInboundToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/** The URL the customer pastes into the provider's webhook configuration. */
export const buildInboundUrl = (apiUrl: string, provider: string, token: string): string =>
  `${apiUrl.replace(/\/+$/, '')}/inbound/${provider}/${token}`;
