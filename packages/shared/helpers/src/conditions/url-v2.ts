/**
 * Parsed URL components interface
 */
interface ParsedUrl {
  scheme: string;
  domain: string;
  path: string;
  query: string;
  fragment: string;
}

/**
 * URL pattern object interface
 */
interface UrlPattern {
  includes: string[];
  excludes: string[];
}

/**
 * Parse URL into components
 * @param url - URL string to parse
 * @returns Parsed URL components or null if invalid
 */
function parseUrl(url: string): ParsedUrl | null {
  const match = url.match(/^(([a-z\d]+):\/\/)?([^/?#]+)?(\/[^?#]*)?(\?([^#]*))?(#.*)?$/i);
  if (!match) return null;

  const [, , scheme, domain, path, , query, fragment] = match;
  return {
    scheme: scheme || '',
    domain: domain || '',
    path: path || '',
    query: query || '',
    fragment: fragment || '',
  };
}

/**
 * Escape regex special characters
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeRegex(str: string): string {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Process URL pattern with wildcards and parameters
 * @param pattern - URL pattern
 * @param wildcardReplacement - Wildcard replacement string
 * @param paramReplacement - Parameter replacement string
 * @returns Processed pattern
 */
function processUrlPattern(
  pattern: string,
  wildcardReplacement: string,
  paramReplacement?: string,
): string {
  let processed = escapeRegex(pattern);
  processed = processed.replace(/\\\*/g, `${wildcardReplacement}*`);

  if (paramReplacement) {
    processed = processed.replace(/:[a-zA-Z0-9_]+/g, `[^${paramReplacement}]+`);
  }

  return processed;
}

/**
 * Convert URL pattern to regex
 * @param pattern - URL pattern string
 * @returns Compiled regex or null if invalid
 */
function urlPatternToRegex(pattern: string): RegExp | null {
  const parsed = parseUrl(pattern);
  if (!parsed) {
    return null;
  }

  const { scheme, domain, path, query, fragment } = parsed;

  // Process scheme
  const schemePattern = scheme ? escapeRegex(scheme) : '[a-z\\d]+';

  // Process domain
  const domainPattern = domain ? processUrlPattern(domain, '[^/]', '.') : '[^/]*';

  const portPattern = '(:\\d+)?';

  // Process path
  const pathPattern = path ? processUrlPattern(path, '[^?#]', '/') : '/[^?#]*';

  // Process query parameters
  let queryPattern: string;
  if (query) {
    queryPattern = '';
    new URLSearchParams(query).forEach((value, key) => {
      let valuePattern: string;

      if (value === '') {
        valuePattern = '=?';
      } else if (value === '*') {
        valuePattern = '(=[^&#]*)?';
      } else {
        const encodedValue = value
          .split(/\*/g)
          .map((part) => encodeURI(part))
          .join('*');
        valuePattern = `=${processUrlPattern(encodedValue, '[^#]')}`;
      }

      queryPattern += `(?=.*[?&]${escapeRegex(key)}${valuePattern}([&#]|$))`;
    });
    queryPattern += '\\?[^#]*';
  } else {
    queryPattern = '(\\?[^#]*)?';
  }

  // Process fragment
  const fragmentPattern = fragment ? processUrlPattern(fragment, '.', '/') : '(#.*)?';

  return new RegExp(
    `^${schemePattern}://${domainPattern}${portPattern}${pathPattern}${queryPattern}${fragmentPattern}$`,
  );
}

/**
 * Check if URL matches URL pattern with includes/excludes
 * @param urlPattern - URL pattern object with includes and excludes arrays
 * @param url - URL to check
 * @returns True if URL matches pattern
 */
function matchUrlPattern(urlPattern: UrlPattern, url: string): boolean {
  // If no includes or excludes, return false
  if (urlPattern.includes.length === 0 && urlPattern.excludes.length === 0) {
    return false;
  }

  // Check if URL matches any include pattern (if includes exist)
  const matchesInclude =
    urlPattern.includes.length === 0 ||
    urlPattern.includes.some((includePattern) => {
      const regex = urlPatternToRegex(includePattern);
      return regex && url.match(regex);
    });

  // Check if URL matches any exclude pattern
  const matchesExclude = urlPattern.excludes.some((excludePattern) => {
    const regex = urlPatternToRegex(excludePattern);
    return regex && url.match(regex);
  });

  return matchesInclude && !matchesExclude;
}

export { matchUrlPattern };
