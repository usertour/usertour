import type { QueryWebhookMessagesQuery } from '../graphql';

/**
 * The outbound delivery ledger's read-side shapes, shared by both transports
 * (webhook endpoints and integrations): one message per (destination x event)
 * with its delivery attempts. The GraphQL types differ per surface
 * (WebhookMessage / IntegrationMessage) but carry the identical field set —
 * one TS shape keeps the shared log UI honest. The webhook query is the
 * source of the shape; the integration query's rows must assign to it.
 */

/** A logged outbound message (payload as recorded) with its attempts, oldest first. */
export type OutboundMessage = NonNullable<
  QueryWebhookMessagesQuery['queryWebhookMessages']['edges']
>[number]['node'];

/** One delivery attempt of a message. */
export type OutboundDelivery = OutboundMessage['deliveries'][number];
