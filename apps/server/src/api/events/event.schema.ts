import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { codeName } from '../shared/codename';
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

export class EventDto extends createZodDto(event) {}

export const trackEventBody = z
  .object({
    userId: z
      .string()
      .max(200)
      // An empty/whitespace id must never create an entity — the row would be
      // unaddressable by every id-keyed read/delete (same hardening as the
      // users upsert, which has field evidence).
      .refine((value) => value.trim().length > 0, 'userId must be a non-empty string')
      .describe(
        "The user's external ID — the same value passed to usertour.identify(). Unseen users are created.",
      ),
    companyId: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe(
        'External ID of the company to associate the event with. Must already exist — an unknown id records the event without the association.',
      ),
    name: codeName.describe(
      'The event code name. An unknown name creates the event definition on first use; built-in Usertour event names are refused.',
    ),
    attributes: z
      .record(codeName, z.any())
      .optional()
      .describe(
        'Event attribute values. Unknown attribute names register on the event definition automatically.',
      ),
    occurredAt: z
      .string()
      .datetime({ offset: true })
      .optional()
      .describe('When the event actually happened (ISO 8601); defaults to now.'),
  })
  .strict();
export class TrackEventBodyDto extends createZodDto(trackEventBody) {}
