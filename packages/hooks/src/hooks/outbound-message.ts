/**
 * The outbound delivery ledger's read-side shapes, shared by both transports
 * (webhook endpoints and integrations): one message per (destination x event)
 * with its delivery attempts. The GraphQL types differ per surface
 * (WebhookMessage / IntegrationMessage) but carry the identical field set —
 * one TS shape keeps the shared log UI honest.
 */

/** One delivery attempt of a message. */
export interface OutboundDelivery {
  id: string;
  createdAt: string;
  attempt: number;
  success: boolean;
  responseStatus?: number | null;
  /** Response body excerpt (truncated server-side). */
  responseBody?: string | null;
  error?: string | null;
  durationMs?: number | null;
}

export type OutboundMessageStatus = 'PENDING' | 'DELIVERED' | 'FAILED';

/** A logged outbound message (payload as recorded) with its attempts, oldest first. */
export interface OutboundMessage {
  /** Public message id — the payload `id`, stable across retries and resends. */
  id: string;
  createdAt: string;
  updatedAt: string;
  topic: string;
  status: OutboundMessageStatus;
  payload: Record<string, unknown>;
  deliveries: OutboundDelivery[];
}
