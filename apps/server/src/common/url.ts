/**
 * True iff the value parses as an absolute http(s) URL. The bar every
 * user-supplied media/link URL must clear before it is stored: the SDK and the
 * builder render these verbatim into src/href on customers' pages, so a bare
 * word or a relative path becomes a silently broken image/iframe the author
 * only discovers in the browser.
 */
export const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
