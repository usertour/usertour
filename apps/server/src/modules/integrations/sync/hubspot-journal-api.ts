import axios from 'axios';
import { hubspotCall } from './hubspot-errors';
import {
  HUBSPOT_API_BASE,
  HUBSPOT_API_VERSION,
  HUBSPOT_OAUTH_TOKEN_URL,
  type HubspotAppCredentials,
} from './hubspot-api';

/**
 * HubSpot webhooks journal: app-level, pull-based change feed (ADR 0013 §7).
 * Subscriptions are per installed account; the journal itself is one stream
 * per app whose pages live behind short-lived presigned URLs. Verified
 * against the live API on 2026-09-03: `earliest` / `latest` /
 * `offset/{offset}/next` answer `{ url, expiresAt, currentOffset }` (204 when
 * there is nothing), and the page at `url` is
 * `{ offset, journalEvents: [...], publishedAt }`. The date-versioned paths
 * keep those shapes; the `/v4` ones they replace go unsupported on 2027-03-30.
 */
const SUBSCRIPTIONS_URL = `${HUBSPOT_API_BASE}/webhooks-journal/subscriptions/${HUBSPOT_API_VERSION}`;
const JOURNAL_URL = `${HUBSPOT_API_BASE}/webhooks-journal/journal/${HUBSPOT_API_VERSION}`;

export const HUBSPOT_JOURNAL_SCOPES =
  'developer.webhooks_journal.read developer.webhooks_journal.subscriptions.read developer.webhooks_journal.subscriptions.write';

/** HubSpot object type ids the journal speaks. */
export const HUBSPOT_OBJECT_TYPE_IDS = { contact: '0-1', company: '0-2' } as const;

export interface HubspotJournalSubscription {
  id: number;
  appId: number;
  subscriptionType: 'OBJECT';
  objectTypeId: string;
  portalId: number;
  actions: string[];
  properties: string[];
}

export interface HubspotJournalPageRef {
  url: string;
  expiresAt: string;
  currentOffset: string;
}

export interface HubspotJournalEvent {
  type: string;
  portalId: number;
  occurredAt: string;
  objectTypeId: string;
  objectId: number | string;
  action: string;
  propertyChanges?: Record<string, string | null>;
  mergedObjectIds?: Array<number | string>;
}

export interface HubspotJournalPage {
  offset: string;
  journalEvents: HubspotJournalEvent[];
  publishedAt?: string;
}

const TIMEOUT_MS = 20_000;

/** App-level token (client credentials) for the journal endpoints. */
export const fetchHubspotAppToken = (
  app: Pick<HubspotAppCredentials, 'clientId' | 'clientSecret'>,
): Promise<{ accessToken: string; expiresIn: number }> =>
  hubspotCall(async () => {
    const response = await axios.post<{ access_token: string; expires_in: number }>(
      HUBSPOT_OAUTH_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: app.clientId,
        client_secret: app.clientSecret,
        scope: HUBSPOT_JOURNAL_SCOPES,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: TIMEOUT_MS },
    );
    return { accessToken: response.data.access_token, expiresIn: response.data.expires_in };
  });

const auth = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
  timeout: TIMEOUT_MS,
});

export const listJournalSubscriptions = (token: string): Promise<HubspotJournalSubscription[]> =>
  hubspotCall(async () => {
    const response = await axios.get<{ results: HubspotJournalSubscription[] }>(
      SUBSCRIPTIONS_URL,
      auth(token),
    );
    return response.data.results ?? [];
  });

export const createJournalSubscription = (
  token: string,
  input: { portalId: number; objectTypeId: string; actions: string[]; properties: string[] },
): Promise<HubspotJournalSubscription> =>
  hubspotCall(async () => {
    const response = await axios.post<HubspotJournalSubscription>(
      SUBSCRIPTIONS_URL,
      { subscriptionType: 'OBJECT', ...input },
      auth(token),
    );
    return response.data;
  });

export const deleteJournalSubscription = (token: string, id: number): Promise<void> =>
  hubspotCall(async () => {
    await axios.delete(`${SUBSCRIPTIONS_URL}/${id}`, auth(token));
  });

export const deletePortalJournalSubscriptions = (token: string, portalId: number): Promise<void> =>
  hubspotCall(async () => {
    await axios.delete(`${SUBSCRIPTIONS_URL}/portals/${portalId}`, auth(token));
  });

const pageRef = (token: string, path: string): Promise<HubspotJournalPageRef | null> =>
  hubspotCall(async () => {
    const response = await axios.get<HubspotJournalPageRef | ''>(`${JOURNAL_URL}/${path}`, {
      ...auth(token),
      validateStatus: (status) => status === 200 || status === 204,
    });
    return response.status === 204 || !response.data
      ? null
      : (response.data as HubspotJournalPageRef);
  });

/** The newest page, or null when the journal is empty. */
export const journalLatest = (token: string) => pageRef(token, 'latest');

/** The page after `offset`, or null when nothing newer exists yet. */
export const journalNext = (token: string, offset: string) =>
  pageRef(token, `offset/${encodeURIComponent(offset)}/next`);

/** The events of a page (presigned URL from a page ref; no auth header). */
export const fetchJournalPage = (url: string): Promise<HubspotJournalPage> =>
  hubspotCall(async () => {
    const response = await axios.get<HubspotJournalPage>(url, {
      timeout: TIMEOUT_MS,
      responseType: 'json',
    });
    return response.data;
  });
