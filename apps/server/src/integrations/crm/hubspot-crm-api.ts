import axios, { AxiosRequestConfig } from 'axios';
import { HUBSPOT_API_BASE } from './hubspot-api';

/**
 * HubSpot CRM data endpoints used by the sync engine (ADR 0013 §7): property
 * metadata, paged reads, batch reads/updates, search, and property creation.
 * Thin typed wrappers over the v3 object APIs; callers own pacing and retry.
 * `objectType` is HubSpot's path segment ('contacts' | 'companies').
 */
export type HubspotObjectType = 'contacts' | 'companies';

export interface HubspotProperty {
  name: string;
  label: string;
  /** string | number | bool | date | datetime | enumeration */
  type: string;
  /** text | textarea | number | date | select | checkbox | booleancheckbox | ... */
  fieldType: string;
  groupName: string;
  description?: string;
  hubspotDefined?: boolean;
  /** Read-only values cannot be written (system or computed). */
  modificationMetadata?: { readOnlyValue?: boolean; readOnlyDefinition?: boolean };
  calculated?: boolean;
  options?: Array<{ label: string; value: string; hidden?: boolean }>;
}

export interface HubspotObject {
  id: string;
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubspotObjectPage {
  results: HubspotObject[];
  paging?: { next?: { after: string } };
}

/** Signals a 429 (or 5xx) with the pause HubSpot asked for, for the queue to honour. */
export class HubspotRateLimitError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfterMs: number,
  ) {
    super(`HubSpot asked to retry after ${retryAfterMs}ms (status ${status})`);
    this.name = 'HubspotRateLimitError';
  }
}

const DATA_TIMEOUT_MS = 20_000;
/** HubSpot's per-page maximum for object reads. */
export const HUBSPOT_PAGE_SIZE = 100;
/** Batch endpoints accept at most 100 inputs per call. */
export const HUBSPOT_BATCH_SIZE = 100;

const request = async <T>(accessToken: string, config: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await axios.request<T>({
      baseURL: HUBSPOT_API_BASE,
      timeout: DATA_TIMEOUT_MS,
      ...config,
      headers: { Authorization: `Bearer ${accessToken}`, ...(config.headers ?? {}) },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const { status } = error.response;
      if (status === 429 || status === 502 || status === 503) {
        const header = Number(error.response.headers?.['retry-after']);
        throw new HubspotRateLimitError(
          status,
          Number.isFinite(header) && header > 0 ? header * 1000 : 10_000,
        );
      }
    }
    throw error;
  }
};

/** Status of a failed HubSpot call, or undefined for non-HTTP failures. */
export const hubspotErrorStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

// ---------------------------------------------------------------------------
// Property metadata
// ---------------------------------------------------------------------------

export const listHubspotProperties = async (
  accessToken: string,
  objectType: HubspotObjectType,
): Promise<HubspotProperty[]> => {
  const data = await request<{ results: HubspotProperty[] }>(accessToken, {
    method: 'GET',
    url: `/crm/v3/properties/${objectType}`,
  });
  return data.results;
};

/** Create a property group; an existing group (409) is treated as success. */
export const ensureHubspotPropertyGroup = async (
  accessToken: string,
  objectType: HubspotObjectType,
  group: { name: string; label: string },
): Promise<void> => {
  try {
    await request(accessToken, {
      method: 'POST',
      url: `/crm/v3/properties/${objectType}/groups`,
      data: group,
    });
  } catch (error) {
    if (hubspotErrorStatus(error) !== 409) {
      throw error;
    }
  }
};

export interface HubspotPropertyDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'bool' | 'date' | 'datetime' | 'enumeration';
  fieldType: 'text' | 'number' | 'booleancheckbox' | 'date' | 'select';
  groupName: string;
  description?: string;
  options?: Array<{ label: string; value: string }>;
}

/** Create a property; an existing one (409) is treated as success. */
export const ensureHubspotProperty = async (
  accessToken: string,
  objectType: HubspotObjectType,
  definition: HubspotPropertyDefinition,
): Promise<void> => {
  try {
    await request(accessToken, {
      method: 'POST',
      url: `/crm/v3/properties/${objectType}`,
      data: definition,
    });
  } catch (error) {
    if (hubspotErrorStatus(error) !== 409) {
      throw error;
    }
  }
};

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export const listHubspotObjectsPage = (
  accessToken: string,
  objectType: HubspotObjectType,
  options: { properties: string[]; after?: string; limit?: number },
): Promise<HubspotObjectPage> =>
  request<HubspotObjectPage>(accessToken, {
    method: 'GET',
    url: `/crm/v3/objects/${objectType}`,
    params: {
      limit: options.limit ?? HUBSPOT_PAGE_SIZE,
      properties: options.properties.join(','),
      ...(options.after ? { after: options.after } : {}),
    },
  });

export const batchReadHubspotObjects = async (
  accessToken: string,
  objectType: HubspotObjectType,
  ids: string[],
  properties: string[],
): Promise<HubspotObject[]> => {
  if (ids.length === 0) {
    return [];
  }
  const data = await request<{ results: HubspotObject[] }>(accessToken, {
    method: 'POST',
    url: `/crm/v3/objects/${objectType}/batch/read`,
    data: { properties, inputs: ids.map((id) => ({ id })) },
  });
  return data.results;
};

export const batchUpdateHubspotObjects = async (
  accessToken: string,
  objectType: HubspotObjectType,
  inputs: Array<{ id: string; properties: Record<string, string | null> }>,
): Promise<void> => {
  if (inputs.length === 0) {
    return;
  }
  await request(accessToken, {
    method: 'POST',
    url: `/crm/v3/objects/${objectType}/batch/update`,
    data: { inputs },
  });
};

/** Records whose `propertyName` equals one of `values` (HubSpot caps IN lists at 100). */
export const searchHubspotObjectsByProperty = async (
  accessToken: string,
  objectType: HubspotObjectType,
  query: { propertyName: string; values: string[]; properties: string[] },
): Promise<HubspotObject[]> => {
  if (query.values.length === 0) {
    return [];
  }
  const data = await request<{ results: HubspotObject[] }>(accessToken, {
    method: 'POST',
    url: `/crm/v3/objects/${objectType}/search`,
    data: {
      filterGroups: [
        { filters: [{ propertyName: query.propertyName, operator: 'IN', values: query.values }] },
      ],
      properties: query.properties,
      limit: HUBSPOT_PAGE_SIZE,
    },
  });
  return data.results;
};

/**
 * Update one record; returns the HTTP outcome for the delivery ledger. Rate
 * limits surface as HubspotRateLimitError like every other call here.
 */
export const updateHubspotObject = async (
  accessToken: string,
  objectType: HubspotObjectType,
  id: string,
  properties: Record<string, string | null>,
): Promise<{ status: number; body: string }> => {
  try {
    const response = await axios.request<unknown>({
      baseURL: HUBSPOT_API_BASE,
      timeout: DATA_TIMEOUT_MS,
      method: 'PATCH',
      url: `/crm/v3/objects/${objectType}/${encodeURIComponent(id)}`,
      data: { properties },
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'text',
      transformResponse: [(data) => data],
    });
    return { status: response.status, body: String(response.data ?? '') };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const { status } = error.response;
      if (status === 429 || status === 502 || status === 503) {
        const header = Number(error.response.headers?.['retry-after']);
        throw new HubspotRateLimitError(
          status,
          Number.isFinite(header) && header > 0 ? header * 1000 : 10_000,
        );
      }
    }
    throw error;
  }
};
