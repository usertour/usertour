/**
 * The SDK's debug gate (ADR 0019), as pure string rules so they can be tested
 * without a browser. The gate opens when the npm-`debug`-style flag in
 * `localStorage.debug` names the SDK (`*`, or a token starting with the
 * namespace), or when the page URL carries `?usertour_debug=1`.
 */

export const DEBUG_QUERY_PARAM = 'usertour_debug';

const splitTokens = (value: string): string[] =>
  value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

/** Whether a `localStorage.debug` value names the namespace (or everything). */
export const debugFlagNamesNamespace = (storageValue: string, namespace: string): boolean => {
  return splitTokens(storageValue).some(
    (token) => token === '*' || token === namespace || token.startsWith(`${namespace}:`),
  );
};

/** Whether a URL search string asks for debug output for this page load. */
export const debugQueryParamEnabled = (search: string): boolean => {
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  for (const pair of normalized.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (key !== DEBUG_QUERY_PARAM) {
      continue;
    }
    const decoded = decodeURIComponent(value).toLowerCase();
    return decoded === '' || decoded === '1' || decoded === 'true';
  }
  return false;
};

/** `localStorage.debug` with the namespace added, other tools' tokens untouched. */
export const withDebugNamespace = (storageValue: string, namespace: string): string => {
  const tokens = splitTokens(storageValue);
  const own = `${namespace}:*`;
  return (tokens.includes(own) ? tokens : [...tokens, own]).join(',');
};

/** `localStorage.debug` with every token of the namespace removed; `*` stays. */
export const withoutDebugNamespace = (storageValue: string, namespace: string): string => {
  return splitTokens(storageValue)
    .filter((token) => token !== namespace && !token.startsWith(`${namespace}:`))
    .join(',');
};
