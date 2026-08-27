import { randomBytes } from 'node:crypto';
import { IntegrationEventObject, IntegrationMessageEnvelope } from './integrations.types';

/**
 * The ONE builder for the integration message envelope — every producer (the
 * listener and the test event) goes through here so the canonical form cannot
 * fork per topic. Mirrors the webhook envelope's field set on purpose (one
 * ledger, one uniform log display), but with its own id prefix and object
 * discriminator: this envelope never leaves the system, so it is not part of
 * the webhook receiver contract.
 *
 * The id doubles as the destination-side idempotency key (Mixpanel
 * `$insert_id`, Amplitude `insert_id`, Segment `messageId`), so at-least-once
 * retries dedup provider-side. 12 random bytes keep it under Mixpanel's
 * 36-character `$insert_id` cap ("imsg_" + 24 hex = 29).
 */
export const buildIntegrationMessage = (
  topic: string,
  environmentId: string,
  event: IntegrationEventObject,
  createdAt: Date = new Date(),
): { messageId: string; payload: IntegrationMessageEnvelope } => {
  const messageId = `imsg_${randomBytes(12).toString('hex')}`;
  return {
    messageId,
    payload: {
      id: messageId,
      object: 'integrationMessage',
      type: topic,
      createdAt: createdAt.toISOString(),
      environmentId,
      data: { event },
    },
  };
};
