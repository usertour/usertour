'use strict';

/**
 * Shared request plumbing. Every URL the app builds goes through here, so
 * server-URL normalization, pagination handling, and attribute coercion each
 * exist exactly once.
 */

/**
 * Normalized API origin from auth data: trims whitespace, strips trailing
 * slashes (self-hosted users paste those constantly, and `//v2/...` 404s on
 * both express and the bundled nginx), and defaults a missing scheme to
 * https.
 */
const apiBase = (bundle) => {
  let url = (bundle.authData.serverUrl || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
};

/** URL under the Zap's selected project + environment. */
const environmentUrl = (bundle, path) =>
  `${apiBase(bundle)}/v2/projects/${bundle.inputData.projectId}` +
  `/environments/${bundle.inputData.environmentId}${path}`;

/**
 * Absolute URL from a v2 pagination `next`/`previous` link. The server emits
 * host-relative paths built from the request path it saw, so a self-hosted
 * instance behind a path prefix (https://acme.com/usertour) needs the prefix
 * re-attached: plain concatenation keeps it, `new URL(link, base)` drops it.
 */
const absoluteUrl = (bundle, link) =>
  /^https?:\/\//i.test(link) ? link : `${apiBase(bundle)}${link}`;

/**
 * Walk a cursor-paginated v2 collection to the end (capped so a runaway
 * project can't stall a step), returning every `results` row.
 */
const listAll = async (z, bundle, firstUrl, cap = 1000) => {
  const rows = [];
  let url = firstUrl;
  while (url && rows.length < cap) {
    const response = await z.request({ url });
    rows.push(...response.data.results);
    url = response.data.next ? absoluteUrl(bundle, response.data.next) : null;
  }
  return rows;
};

/**
 * Declared attribute types of one scope ('user' | 'company' |
 * 'eventDefinition'), keyed by code name. Needs the token's
 * "Attributes: read" scope — a 403 here is turned into an actionable message
 * instead of the API's generic scope error.
 */
const fetchAttributeDataTypes = async (z, bundle, scope) => {
  const firstUrl =
    `${apiBase(bundle)}/v2/projects/${bundle.inputData.projectId}` +
    `/attribute-definitions?scope=${scope}&limit=100`;
  const probe = await z.request({ url: firstUrl, skipThrowForStatus: true });
  if (probe.status === 403) {
    throw new z.errors.Error(
      'Your Usertour API token lacks the "Attributes: read" scope, which this action needs ' +
        'to send attribute values as their declared types. Add the scope under ' +
        'Settings → API in Usertour and reconnect.',
    );
  }
  probe.throwForStatus();
  const rows = [...probe.data.results];
  if (probe.data.next) {
    rows.push(...(await listAll(z, bundle, absoluteUrl(bundle, probe.data.next))));
  }
  return new Map(rows.map((definition) => [definition.codeName, definition.dataType]));
};

const isBlank = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/**
 * Attribute dictionaries from Zap fields. Zapier dict values always arrive
 * as strings, while attribute types are strict server-side, so each value is
 * converted to its attribute's DECLARED type — never guessed from its shape
 * (a shape guess mangles identifiers: "01234" → 1234, "1.10" → 1.1, long
 * numeric IDs lose precision, and a numeric-looking value for a String
 * attribute would 400 every run). Unknown names go through as text and
 * register as String on first use. Blank values (an unmapped field arrives
 * as '', a template of empty fields as ' ') are dropped rather than
 * overwriting a real value. Returns {} without a lookup when nothing is left.
 */
const coerceAttributes = async (z, bundle, scope, attributes) => {
  const entries = Object.entries(attributes || {}).filter(([, raw]) => !isBlank(raw));
  if (entries.length === 0) {
    return {};
  }
  const dataTypes = await fetchAttributeDataTypes(z, bundle, scope);
  const out = {};
  for (const [key, raw] of entries) {
    out[key] = coerceValue(raw, dataTypes.get(key));
  }
  return out;
};

const coerceValue = (value, dataType) => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (dataType === 'number' && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (dataType === 'boolean') {
    if (trimmed.toLowerCase() === 'true') {
      return true;
    }
    if (trimmed.toLowerCase() === 'false') {
      return false;
    }
  }
  return value;
};

module.exports = { apiBase, environmentUrl, absoluteUrl, listAll, coerceAttributes };
