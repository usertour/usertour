/** Exactly one destination: a webhook endpoint or an integration provider. */
export type OutboundDestination = { webhookId: string } | { integrationId: string };
