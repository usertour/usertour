import { buildUrl } from './pagination';

describe('buildUrl — next/previous link construction', () => {
  it('replaces cursor + limit while preserving the original filters', () => {
    const url = buildUrl('/v2/projects/p1/content?type=flow&name=live', {
      cursor: 'c2',
      limit: 50,
    });
    const parsed = new URL(url, 'http://x');
    expect(parsed.pathname).toBe('/v2/projects/p1/content');
    expect(parsed.searchParams.get('type')).toBe('flow');
    expect(parsed.searchParams.get('name')).toBe('live');
    expect(parsed.searchParams.get('cursor')).toBe('c2');
    expect(parsed.searchParams.get('limit')).toBe('50');
  });

  it('keeps a literal "?" inside a param value and every param after it', () => {
    // Legal per RFC 3986, passed through verbatim by Express req.originalUrl.
    // `split("?")` + 2-var destructuring dropped the trailing "?" of the value
    // AND every later param, so the next link paged a DIFFERENT result set.
    const url = buildUrl('/v2/projects/p1/content?name=ready?&limit=50', { cursor: 'c2' });
    const parsed = new URL(url, 'http://x');
    expect(parsed.searchParams.get('name')).toBe('ready?'); // full value preserved
    expect(parsed.searchParams.get('limit')).toBe('50'); // param after the 2nd "?" kept
    expect(parsed.searchParams.get('cursor')).toBe('c2');
  });

  it('handles a URL with no query string', () => {
    const url = buildUrl('/v2/projects/p1/content', { cursor: 'c2', limit: 20 });
    const parsed = new URL(url, 'http://x');
    expect(parsed.pathname).toBe('/v2/projects/p1/content');
    expect(parsed.searchParams.get('cursor')).toBe('c2');
  });

  it('drops a stale cursor from the base URL before setting the new one', () => {
    const url = buildUrl('/v2/projects/p1/content?cursor=old&type=flow', { cursor: 'new' });
    const parsed = new URL(url, 'http://x');
    expect(parsed.searchParams.getAll('cursor')).toEqual(['new']); // exactly one
    expect(parsed.searchParams.get('type')).toBe('flow');
  });
});
