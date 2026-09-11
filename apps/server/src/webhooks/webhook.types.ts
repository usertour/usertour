import type { BizCompany, BizUser } from '@prisma/client';

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

/**
 * Domain event emitted (post-commit, EventEmitter2) when biz-user / biz-company
 * profiles were actually created or changed. Producers are the BizService
 * upsert chokepoints, which already diff (`isEqual` short-circuits no-op
 * writes) — a repeated identify with unchanged attributes emits nothing.
 * `previousAttributes` carries the old values of just the keys that changed
 * (the common payments-API convention), captured at diff time inside the
 * transaction.
 */
export const BIZ_ENTITY_CHANGED = 'bizEntity.changed';

export interface EntityChange {
  entity: 'user' | 'company';
  action: 'created' | 'updated' | 'deleted';
  /** Internal row id — the listener re-reads and maps to the public object. */
  bizId: string;
  previousAttributes?: Record<string, any>;
  /**
   * For `deleted`: the row as it was just before deletion (there is nothing to
   * re-read afterwards) — the listener maps it to the public object.
   */
  deletedRow?: BizUser | BizCompany;
}

export interface BizEntityChangedPayload {
  environmentId: string;
  changes: EntityChange[];
  /**
   * Who wrote: absent for SDK/API/dashboard writes; a CRM provider id when the
   * change was applied by that provider's inbound sync (ADR 0013 §9 — the
   * outbound write-back listener must not echo it).
   */
  origin?: string;
}

/** Job payload for one webhook delivery (one message to one endpoint). */
export interface WebhookDeliveryJobData {
  webhookId: string;
  messageId: string;
  topic: string;
  /** The full message body to sign and POST, already assembled. */
  payload: Record<string, any>;
  /**
   * Attempts already logged for this message before this job (a manual resend
   * continues the numbering after the original sequence). Absent = 0.
   */
  attemptOffset?: number;
  /**
   * True for user-initiated sends (test event, resend): they bypass the
   * cooldown gate — the user IS the probe, and a success resets the breaker.
   */
  manual?: boolean;
}
