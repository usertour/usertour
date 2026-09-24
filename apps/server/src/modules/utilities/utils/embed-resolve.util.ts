/**
 * Resolve embed blocks the way the BUILDER does. The builder's embed editor
 * sets `parsedUrl = url` (a verbatim "confirmed" copy, not a transformation)
 * and stores the oEmbed payload when the provider answers; the widget renders
 * `oembed.html` when present, falls back to an iframe on `parsedUrl`, and
 * shows a grey placeholder with NEITHER. The v2 compiler only writes `url`,
 * so an API-authored embed rendered as the placeholder forever — and editing
 * `url` kept the OLD parsedUrl/oembed via the keep-style merge, silently
 * rendering the previous content (console sweep follow-up).
 *
 * `parsedUrl !== url` means the embed is new or its url changed → resolve.
 * An untouched echo is skipped — UNLESS a known oEmbed provider claims the
 * url and no payload is stored (an earlier resolution failed or the provider
 * refused): those retry on every write, so a transient failure self-heals
 * instead of freezing as a raw iframe the provider's site then blocks. A
 * non-provider url missing a payload is the NORMAL raw-iframe state — no
 * retry, no wasted lookup (validate warns about its framing requirement).
 */

import { oEmbedProviders } from '../constants/oembed-providers.constant';
import { isMatchUrlPattern } from '@usertour/helpers';

interface EmbedElementNode {
  type?: unknown;
  url?: unknown;
  parsedUrl?: unknown;
  oembed?: unknown;
}

/** Does any provider in the oEmbed registry claim this url? Pattern check only — no network. */
export const matchesOembedProvider = (url: string): boolean =>
  oEmbedProviders.some((provider) =>
    provider.endpoints.some(
      (endpoint) => endpoint.schemes && isMatchUrlPattern(url, endpoint.schemes, []),
    ),
  );

export type OembedFetcher = (
  url: string,
) => Promise<{ html?: string; width?: unknown; height?: unknown }>;

/** Cap on one provider lookup — a slow provider must not stall the write it rides on. */
export const OEMBED_LOOKUP_TIMEOUT_MS = 5000;

/** Rejects once the cap passes; the timer is always cleared, so a fast lookup leaves nothing pending. */
const withLookupTimeout = async <T>(lookup: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('oembed timeout')), OEMBED_LOOKUP_TIMEOUT_MS);
  });
  try {
    return await Promise.race([lookup, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

const collectStale = (node: unknown, out: EmbedElementNode[]): void => {
  if (Array.isArray(node)) {
    for (const child of node) collectStale(child, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const obj = node as EmbedElementNode;
  if (
    obj.type === 'embed' &&
    typeof obj.url === 'string' &&
    obj.url &&
    (obj.parsedUrl !== obj.url || (!obj.oembed && matchesOembedProvider(obj.url)))
  ) {
    out.push(obj);
  }
  for (const value of Object.values(obj)) collectStale(value, out);
};

/** A provider's answer per url; `undefined` when it had none (error, timeout, no html). */
export type EmbedResolutions = ReadonlyMap<
  string,
  { html: string; width?: unknown; height?: unknown } | undefined
>;

/** The urls of every embed in the payload whose resolution is missing or belongs to a previous url. */
export const collectStaleEmbedUrls = (payload: unknown): string[] => {
  const stale: EmbedElementNode[] = [];
  collectStale(payload, stale);
  return [...new Set(stale.map((el) => el.url as string))];
};

/**
 * Look the urls up. Fetch failures — a provider error, or a lookup past the
 * time cap — resolve to `undefined`, never reject: a write must not fail over a
 * provider hiccup.
 */
export const fetchEmbedResolutions = async (
  urls: readonly string[],
  fetch: OembedFetcher,
): Promise<EmbedResolutions> => {
  const entries = await Promise.all(
    urls.map(async (url) => {
      try {
        const info = await withLookupTimeout(fetch(url));
        return [
          url,
          info?.html ? { html: info.html, width: info.width, height: info.height } : undefined,
        ] as const;
      } catch {
        return [url, undefined] as const;
      }
    }),
  );
  return new Map(entries);
};

/**
 * Settle every stale embed of the payload from already-fetched resolutions.
 * Mutates in place, no network — safe inside a transaction. A url without an
 * answer (a failed lookup, or one that was never looked up) degrades to
 * parsedUrl-only: the same state the builder leaves when the oEmbed call fails
 * (the widget iframes the url directly), and a known provider's url retries on
 * the next write.
 */
export const installEmbedResolutions = (payload: unknown, resolutions: EmbedResolutions): void => {
  const stale: EmbedElementNode[] = [];
  collectStale(payload, stale);
  for (const el of stale) {
    const url = el.url as string;
    el.parsedUrl = url;
    // The url changed (or is new): the old payload no longer describes it.
    el.oembed = resolutions.get(url);
  }
};

/**
 * Walk any compiled payload (flow steps content trees, banner/checklist/
 * announcement/resource-center block lists) and resolve every embed whose
 * `parsedUrl` is missing or belongs to a previous url. Mutates in place.
 */
export async function resolveStaleEmbeds(payload: unknown, fetch: OembedFetcher): Promise<void> {
  const resolutions = await fetchEmbedResolutions(collectStaleEmbedUrls(payload), fetch);
  installEmbedResolutions(payload, resolutions);
}
