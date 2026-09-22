import { createHmac, randomBytes } from 'node:crypto';

export const WEBHOOK_SIGNATURE_HEADER = 'X-Usertour-Signature';
const WEBHOOK_SECRET_PREFIX = 'whsec_';

/**
 * Signature scheme (ADR 0010): `t=<unix seconds>,v1=<hex HMAC-SHA256>` where
 * the MAC is computed over `"{t}.{body}"` — the timestamp is bound into the
 * MAC so receivers can reject replays outside their tolerance window. The
 * signed body MUST be the exact string sent on the wire.
 */
export function signWebhookPayload(secret: string, timestampSec: number, body: string): string {
  const mac = createHmac('sha256', secret).update(`${timestampSec}.${body}`).digest('hex');
  return `t=${timestampSec},v1=${mac}`;
}

/** Generate an endpoint signing secret: "whsec_" + 32 random bytes as hex. */
export function generateWebhookSecret(): string {
  return `${WEBHOOK_SECRET_PREFIX}${randomBytes(32).toString('hex')}`;
}
