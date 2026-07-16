/**
 * Domain event emitted (in-process, via EventEmitter2) after a transaction
 * that created BizEvent rows has COMMITTED — never from inside the
 * transaction, so subscribers can't observe rolled-back events. Mirrors the
 * audit module's RESOURCE_CHANGED_EVENT fan-out: webhooks are the first
 * subscriber; future consumers add their own @OnEvent listeners without
 * touching the producers.
 *
 * Carries ids only — the listener re-reads the rows with the relations it
 * needs. Passing ids (not rows) keeps producers dumb and sidesteps threading
 * a collector through the deeply nested handler chain.
 */
export const BIZ_EVENT_TRACKED = 'bizEvent.tracked';

export interface BizEventTrackedPayload {
  environmentId: string;
  bizEventIds: string[];
}

/**
 * Domain event emitted (post-commit, EventEmitter2) when a content version is
 * published to an environment. Same producer contract as BIZ_EVENT_TRACKED:
 * ids only, subscribers re-read what they need.
 */
export const CONTENT_PUBLISHED = 'content.published';

export interface ContentPublishedPayload {
  environmentId: string;
  contentId: string;
  versionId: string;
}

/** Job payload for one webhook delivery (one message to one endpoint). */
export interface WebhookDeliveryJobData {
  webhookId: string;
  messageId: string;
  topic: string;
  /** The full message body to sign and POST, already assembled. */
  payload: Record<string, any>;
}
