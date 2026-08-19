import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/**
 * The single source of truth for the v2 webhooks endpoint (ADR 0010): these zod
 * schemas drive request validation, the OpenAPI spec, the handler's types, and
 * the MCP tool input schema — one definition, every binding.
 */

const topics = z
  .array(z.string().min(1))
  .min(1)
  .describe(
    'Topic subscriptions: "*" (everything); "event.tracked" (all behavior events) or ' +
      '"event.tracked.<codeName>" for one; "content" / "content.published"; "user" or ' +
      '"user.created" / "user.updated" / "user.deleted"; "company" or "company.created" / ' +
      '"company.updated" / "company.deleted". A bare family name also covers topics added ' +
      'to it later. High-volume events (page_viewed) are excluded from the wildcard forms ' +
      'and must be subscribed explicitly.',
  );

export const listWebhooksQuery = z.object({ cursor, limit });
export class ListWebhooksQueryDto extends createZodDto(listWebhooksQuery) {}

export const webhook = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.WEBHOOK),
  createdAt: z.string(),
  url: z.string(),
  topics: z.array(z.string()),
  enabled: z.boolean(),
  description: z.string().nullable(),
  consecutiveFailures: z
    .number()
    .int()
    .describe('Messages in a row whose retry budget was exhausted (circuit-breaker streak).'),
  cooldownUntil: z
    .string()
    .nullable()
    .describe('While in the future, delivery is paused for this endpoint (cooldown).'),
  autoDisabledAt: z
    .string()
    .nullable()
    .describe('Set when the system disabled the endpoint after sustained delivery failure.'),
  /** Present on single-resource reads/creates/rotates; omitted from lists. */
  secret: z.string().optional(),
});
export class WebhookDto extends createZodDto(webhook) {}

export const createWebhookBody = z.object({
  url: z
    .string()
    .url()
    .regex(/^https?:\/\//, 'must be an http(s) URL')
    .describe(
      'Endpoint events are POSTed to. Public HTTPS by default; deployments with ' +
        'ALLOW_PRIVATE_NETWORK_EGRESS may use private/http targets (SSRF-guarded server-side).',
    ),
  topics,
  enabled: z.boolean().optional().describe('Defaults to true.'),
  description: z.string().max(200).optional(),
});
export class CreateWebhookBodyDto extends createZodDto(createWebhookBody) {}

export const updateWebhookBody = z.object({
  url: z
    .string()
    .url()
    .regex(/^https?:\/\//, 'must be an http(s) URL')
    .optional(),
  topics: topics.optional(),
  enabled: z.boolean().optional(),
  description: z.string().max(200).optional(),
});
export class UpdateWebhookBodyDto extends createZodDto(updateWebhookBody) {}

export const listWebhooksResponse = z.object({
  results: z.array(webhook),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListWebhooksResponseDto extends createZodDto(listWebhooksResponse) {}

export type Webhook = z.infer<typeof webhook>;
export type ListWebhooksQuery = z.infer<typeof listWebhooksQuery>;
export type CreateWebhookBody = z.infer<typeof createWebhookBody>;
export type UpdateWebhookBody = z.infer<typeof updateWebhookBody>;
