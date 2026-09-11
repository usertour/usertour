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
    if (axios.isAxiosError(error)) {
      if (error.response && BACKOFF_STATUSES.has(error.response.status)) {
        throw new HubspotRateLimitError(
          error.response.status,
          parseRetryAfter(error.response.headers?.['retry-after']) ?? DEFAULT_RETRY_AFTER_MS,
        );
      }
      // The request carries the app secret and the refresh token in its body
      // (token endpoint) or a bearer token in its headers; an error that
      // reaches a logger must not carry them along. The response — status,
      // headers, body — is what callers classify on, and stays.
      error.config = undefined;
      error.request = undefined;
    }
    throw error;
  }
};

/** HubSpot's documented error body: a category and message, sometimes per-field errors. */
interface HubspotErrorBody {
  category?: string;
  message?: string;
  errors?: Array<{ message?: string }>;
}

const DESCRIPTION_MAX_LENGTH = 300;

/**
 * One line for logs and the sync activity: the status, HubSpot's category and
 * message, and the first field-level error when it says more. Never the
 * request (hubspotCall dropped it), and capped so a stack of validation
 * errors does not become the run's error text. Anything that is not an HTTP
 * failure keeps its own message.
 */
export const describeHubspotError = (error: unknown): string => {
  if (!axios.isAxiosError(error) || !error.response) {
    return error instanceof Error ? error.message : String(error);
  }
  const { status, data } = error.response;
  const body = (typeof data === 'object' && data !== null ? data : {}) as HubspotErrorBody;
  const message = body.message ?? (typeof data === 'string' ? data : '');
  const detail = body.errors?.[0]?.message;
  const text = [
    body.category ? `HubSpot ${status} ${body.category}` : `HubSpot ${status}`,
    message,
    detail && detail !== message ? detail : '',
  ]
    .filter((part) => part.length > 0)
    .join(': ');
  return text.length > DESCRIPTION_MAX_LENGTH
    ? `${text.slice(0, DESCRIPTION_MAX_LENGTH - 1)}…`
    : text;
};

/** Client statuses that mean "later", not "no": a timeout and a rate limit. */
const DEFERRING_CLIENT_STATUSES = new Set([408, 429]);

/**
 * Whether HubSpot refused the request outright. A 4xx (other than the two
 * that ask for patience) will not change by waiting — the property is
 * invalid, the value is rejected, the account has hit a limit — so the retry
 * ladder, built for 5xx and rate limits, must not walk it.
 */
export const isDefinitiveHubspotError = (error: unknown): boolean => {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return (
    status !== undefined && status >= 400 && status < 500 && !DEFERRING_CLIENT_STATUSES.has(status)
  );
};
