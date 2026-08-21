import { ApiObjectType } from '../shared/object-type';
import { Event } from './event.schema';

/**
 * Pure bizEvent -> API event mapping. Expects the row loaded with
 * `event` (the definition), `bizUser`, and optionally `bizCompany` /
 * `bizSession` relations. External-facing ids follow the v2 conventions:
 * `userId`/`companyId` are the externalIds you identify with;
 * session/content/version keep internal ids.
 *
 * Session-scoped events don't write contentId/versionId onto the bizEvent row
 * (they live on the session); sessionless events (tracker/direct) do — hence
 * the fallback chain.
 */
export function mapEvent(bizEvent: any): Event {
  return {
    id: bizEvent.id,
    object: ApiObjectType.EVENT,
    codeName: bizEvent.event.codeName,
    eventDefinitionId: bizEvent.eventId,
    createdAt: bizEvent.createdAt.toISOString(),
    userId: bizEvent.bizUser.externalId,
    companyId: bizEvent.bizCompany?.externalId ?? null,
    sessionId: bizEvent.bizSessionId ?? null,
    contentId: bizEvent.contentId ?? bizEvent.bizSession?.contentId ?? null,
    versionId: bizEvent.versionId ?? bizEvent.bizSession?.versionId ?? null,
    attributes: bizEvent.data || {},
  };
}
