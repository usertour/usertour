import { ApiObjectType } from '../shared/object-type';
import { Webhook } from './webhooks.schema';

/**
 * Pure Webhook row -> API webhook mapping. `secret` is included only on
 * single-resource reads (get/create/rotate) — list responses omit it, mirroring
 * the dashboard's exposure hygiene.
 */
export function mapWebhook(row: any, options?: { includeSecret?: boolean }): Webhook {
  return {
    id: row.id,
    object: ApiObjectType.WEBHOOK,
    createdAt: row.createdAt.toISOString(),
    url: row.url,
    topics: (row.topics as string[]) ?? [],
    enabled: row.enabled,
    description: row.description ?? null,
    consecutiveFailures: row.consecutiveFailures ?? 0,
    cooldownUntil: row.cooldownUntil ? row.cooldownUntil.toISOString() : null,
    autoDisabledAt: row.autoDisabledAt ? row.autoDisabledAt.toISOString() : null,
    ...(options?.includeSecret ? { secret: row.secret } : {}),
  };
}
