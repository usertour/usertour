import type { IntegrationConfig } from '@usertour/types';

/**
 * The canonical envelope stored in the outbound ledger for an integration
 * message (ADR 0011 §4). Same field set as the webhook envelope — but this is
 * the INTERNAL canonical form, not a receiver contract: adapters transform it
 * into each provider's wire format at delivery time, so a config fix (region,
 * rotated key) applies to in-flight retries.
 */
export interface IntegrationMessageEnvelope {
  /** Ledger row id and the destination-side idempotency key ("imsg_" + hex). */
  id: string;
  /** 'integrationMessage' — internal discriminator, not a v2 API object type. */
  object: string;
  /** Topic: "event.tracked.<codeName>", or "integration.test". */
  type: string;
  /** Event time (ISO) — adapters send THIS, never the delivery time. */
  createdAt: string;
  environmentId: string;
  data: {
    /** The v2 event object (event.mapper shape). */
    event: IntegrationEventObject;
  };
}

/** The subset of the v2 event object the adapters read (event.mapper shape). */
export interface IntegrationEventObject {
  id: string;
  object: string;
  codeName: string;
  eventDefinitionId: string | null;
  createdAt: string;
  userId: string;
  companyId?: string | null;
  sessionId?: string | null;
  contentId?: string | null;
  versionId?: string | null;
  attributes: Record<string, unknown>;
}

/** One HTTP call, fully described — the processor executes it verbatim. */
export interface ProviderRequest {
  url: string;
  headers?: Record<string, string>;
  body: unknown;
}

/** Pure transform: canonical envelope + plaintext credential + config → request. */
export type ProviderAdapter = (
  envelope: IntegrationMessageEnvelope,
  key: string,
  config: IntegrationConfig,
) => ProviderRequest;

/** Topic of a CRM write-back message (ADR 0013 §7). */
export const CRM_OBJECT_UPDATE_TOPIC = 'crm.object.update';

/**
 * The ledger envelope for a CRM write-back: the provider property values as
 * computed when the change happened. Retries deliver exactly this payload;
 * the record and mapping are re-resolved at delivery time.
 */
export interface CrmMessageEnvelope {
  id: string;
  object: 'integrationMessage';
  type: typeof CRM_OBJECT_UPDATE_TOPIC;
  createdAt: string;
  environmentId: string;
  data: {
    mappingId: string;
    localObject: string;
    localId: string;
    remoteObject: string;
    remoteId: string;
    /** Provider property name → serialized value ('' clears). */
    fields: Record<string, string>;
  };
}

/** Job payload for one integration delivery (one message to one provider). */
export interface IntegrationDeliveryJobData {
  integrationId: string;
  messageId: string;
  topic: string;
  payload: IntegrationMessageEnvelope | CrmMessageEnvelope;
  /**
   * Attempts already logged for this message before this job (a reconcile
   * continuation resumes the numbering). Absent = 0.
   */
  attemptOffset?: number;
  /**
   * True for user-initiated sends (test event): they bypass the cooldown
   * gate — the user IS the probe, and a success resets the breaker.
   */
  manual?: boolean;
}
