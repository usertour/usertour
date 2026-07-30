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

import { oEmbedProviders } from '@/common/ombed/ombed';
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

/**
 * Walk any compiled payload (flow steps content trees, banner/checklist/
 * announcement/resource-center block lists) and resolve every embed whose
 * `parsedUrl` is missing or belongs to a previous url. Mutates in place.
 * Fetch failures degrade to parsedUrl-only — the same state the builder
 * leaves when the oEmbed call fails (the widget iframes the url directly).
 */
export async function resolveStaleEmbeds(payload: unknown, fetch: OembedFetcher): Promise<void> {
  const stale: EmbedElementNode[] = [];
  collectStale(payload, stale);
  await Promise.all(
    stale.map(async (el) => {
      const url = el.url as string;
      el.parsedUrl = url;
      // The url changed (or is new): the old payload no longer describes it.
      el.oembed = undefined;
      try {
        const info = await fetch(url);
        if (info?.html) {
          el.oembed = { html: info.html, width: info.width, height: info.height };
        }
      } catch {
        // Degraded but consistent: iframe on parsedUrl, like the builder's
        // failure path. Never fail the write over a provider hiccup.
      }
    }),
  );
}
