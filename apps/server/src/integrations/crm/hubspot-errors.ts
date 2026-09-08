import axios from 'axios';
import { parseRetryAfter } from '@/outbound/delivery-backoff';

/**
 * Signals a 429 (or a momentary 502/503) with the pause HubSpot asked for,
 * for the queue to honour. One of the four error kinds of ADR 0013 §13:
 * retried after the provider's delay, never fed to the breaker, and the
 * journal halts its tick on it rather than skipping the page.
 */
export class HubspotRateLimitError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfterMs: number,
  ) {
    super(`HubSpot asked to retry after ${retryAfterMs}ms (status ${status})`);
    this.name = 'HubspotRateLimitError';
  }
}

/** When the provider asks us to slow down without saying for how long. */
const DEFAULT_RETRY_AFTER_MS = 10_000;

const BACKOFF_STATUSES = new Set([429, 502, 503]);

/**
 * Run one HubSpot call and classify its failure: a back-off status becomes
 * HubspotRateLimitError carrying the parsed Retry-After (delta-seconds or
 * HTTP-date); everything else passes through untouched, so grant checks
 * (`isHubspotGrantRevoked`) and status probes keep seeing the raw error.
 * Every HubSpot wrapper — data, token and journal endpoints alike — goes
 * through here, so no caller can meet an unclassified 429.
 */
export const hubspotCall = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      BACKOFF_STATUSES.has(error.response.status)
    ) {
      throw new HubspotRateLimitError(
        error.response.status,
        parseRetryAfter(error.response.headers?.['retry-after']) ?? DEFAULT_RETRY_AFTER_MS,
      );
    }
    throw error;
  }
};
