import axios from 'axios';
import { HUBSPOT_API_BASE } from './hubspot-api';
import { hubspotCall } from './hubspot-errors';

const TIMEOUT_MS = 20_000;

/** One app-event occurrence (ADR 0013 §8): an event type declared in the app project, on one record. */
export interface HubspotTimelineOccurrence {
  /** The event type's uid from its app-events hsmeta file. */
  eventTypeName: string;
  /** The contact or company id the occurrence is written to. */
  objectId: string;
  /** Idempotency key, unique per event type; a repeat within a year is rejected. */
  id: string;
  /** Event time, ISO 8601 — never the delivery time. */
  timestamp: string;
  properties: Record<string, string | number>;
}

/**
 * Write occurrences to record timelines in one batch (up to 500): the batch
 * is atomic on the provider side, so an event mirrored to a contact and its
 * company lands on both or on neither, and a retry replays one unit.
 *
 * Still on `/v4`: as of 2026-09-17 the app events reference documents no
 * date-versioned path, and HubSpot's legacy-API notice promises the remaining
 * replacement paths before `/v4` goes unsupported on 2027-03-30. Move it to
 * `HUBSPOT_API_VERSION` once one is published.
 */
export const sendHubspotTimelineEvents = (
  accessToken: string,
  inputs: HubspotTimelineOccurrence[],
): Promise<{ status: number; body: string }> =>
  hubspotCall(async () => {
    const response = await axios.post<unknown>(
      `${HUBSPOT_API_BASE}/integrators/timeline/v4/events/batch`,
      { inputs },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: TIMEOUT_MS,
        responseType: 'text',
        transformResponse: [(data) => data],
      },
    );
    return { status: response.status, body: String(response.data ?? '') };
  });
