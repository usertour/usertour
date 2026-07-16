import { z } from 'zod';
import { ApiObjectType } from '../shared/object-type';

/**
 * The public shape of an event INSTANCE — one user triggering one event at one
 * point in time. The definition/instance split mirrors attribute-definitions
 * vs `user.attributes`: `eventDefinition` describes the type (its attribute
 * schema), `event` is an occurrence whose `attributes` carry values.
 *
 * First consumed by webhook payloads (ADR 0010); a future REST `GET /events`
 * reuses it. Vocabulary is aligned with `eventDefinition` (`codeName`), and
 * every id is directly usable against the corresponding v2 endpoint
 * (`userId` = the user's externalId, `eventDefinitionId` -> event-definitions).
 */
export const event = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.EVENT),
  /** Same vocabulary as `eventDefinition.codeName`. */
  codeName: z.string(),
  eventDefinitionId: z.string(),
  createdAt: z.string(),
  userId: z.string(),
  companyId: z.string().nullable(),
  sessionId: z.string().nullable(),
  contentId: z.string().nullable(),
  versionId: z.string().nullable(),
  /** Attribute VALUES (allowlist-filtered at ingestion), not definitions. */
  attributes: z.record(z.string(), z.any()),
});

export type Event = z.infer<typeof event>;
