import { randomBytes } from 'node:crypto';
import { ApiObjectType } from '@/api/shared/object-type';

export interface WebhookMessageEnvelope {
  /** Public message id — the payload's `id` and the ledger row's PK. */
  messageId: string;
  /** The receiver-facing body, exactly as it will be signed and POSTed. */
  payload: Record<string, any>;
}

/**
 * The ONE builder for the receiver-facing wire format
 * `{ id, object, type, createdAt, environmentId, data }`. Every producer
 * (the three listener handlers, the test event, and whatever M3 adds) goes
 * through here: the envelope is a public contract, and a hand-rolled copy
 * missing one field would fork that contract for a single topic forever.
 */
export const buildWebhookMessage = (
  topic: string,
  environmentId: string,
  data: Record<string, any>,
  createdAt: Date = new Date(),
): WebhookMessageEnvelope => {
  const messageId = `whmsg_${randomBytes(16).toString('hex')}`;
  return {
    messageId,
    payload: {
      id: messageId,
      object: ApiObjectType.WEBHOOK_MESSAGE,
      type: topic,
      createdAt: createdAt.toISOString(),
      environmentId,
      data,
    },
  };
};
