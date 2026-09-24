import {
  OEMBED_LOOKUP_TIMEOUT_MS,
  collectStaleEmbedUrls,
  fetchEmbedResolutions,
  installEmbedResolutions,
  resolveStaleEmbeds,
} from './embed-resolve.util';

describe('resolveStaleEmbeds', () => {
  const fetchMock = (html: string | null) =>
    jest.fn(async (_url: string) => (html ? { html, width: 640, height: 360 } : { html: '' }));

  it('resolves a NEW embed (no parsedUrl): sets parsedUrl and stores oembed when the provider answers', async () => {
    const el = { type: 'embed', url: 'https://youtu.be/x' };
    const fetch = fetchMock('<iframe/>');
    await resolveStaleEmbeds({ steps: [{ element: el }] }, fetch);
    expect(el).toMatchObject({
      parsedUrl: 'https://youtu.be/x',
      oembed: { html: '<iframe/>', width: 640, height: 360 },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('re-resolves a CHANGED url and drops the previous oembed first', async () => {
    // The keep-style merge preserved the old payload; without the reset the
    // widget keeps rendering the previous content (the hidden defect).
    const el = {
      type: 'embed',
      url: 'https://vimeo.com/new',
      parsedUrl: 'https://youtu.be/old',
      oembed: { html: '<old/>' },
    };
    await resolveStaleEmbeds([{ element: el }], fetchMock(null));
    expect(el.parsedUrl).toBe('https://vimeo.com/new');
    expect(el.oembed).toBeUndefined(); // provider had no answer — old payload must not survive
  });

  it('skips an untouched echo (parsedUrl === url, oembed stored) without calling the provider', async () => {
    const el = {
      type: 'embed',
      url: 'https://youtu.be/x',
      parsedUrl: 'https://youtu.be/x',
      oembed: { html: '<iframe/>' },
    };
    const fetch = fetchMock('<iframe/>');
    await resolveStaleEmbeds({ nested: { deep: [el] } }, fetch);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('RETRIES an untouched echo whose oembed is missing when a known provider claims the url', async () => {
    // A transient failure (or a provider refusal since lifted) froze the embed
    // as a raw iframe of a watch URL — which the provider's site frame-blocks.
    // Every write retries, so the failure self-heals instead of persisting.
    const el = { type: 'embed', url: 'https://youtu.be/x', parsedUrl: 'https://youtu.be/x' };
    const fetch = fetchMock('<iframe/>');
    await resolveStaleEmbeds([{ element: el }], fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(el).toMatchObject({ oembed: { html: '<iframe/>' } });
  });

  it('does NOT retry a non-provider url missing oembed (the normal raw-iframe state)', async () => {
    const el = { type: 'embed', url: 'https://example.com/x', parsedUrl: 'https://example.com/x' };
    const fetch = fetchMock('<iframe/>');
    await resolveStaleEmbeds([{ element: el }], fetch);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('degrades to parsedUrl-only when the provider call throws (never fails the write)', async () => {
    const el = { type: 'embed', url: 'https://example.com/x' };
    await resolveStaleEmbeds(el, async () => {
      throw new Error('timeout');
    });
    expect(el).toMatchObject({ parsedUrl: 'https://example.com/x' });
    expect((el as { oembed?: unknown }).oembed).toBeUndefined();
  });

  describe('lookup time cap', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('gives up on a provider that never answers and degrades like any other failure', async () => {
      const el = { type: 'embed', url: 'https://example.com/slow' };
      const resolving = resolveStaleEmbeds(el, () => new Promise(() => undefined));
      // The lookup starts synchronously, so its timer is already armed.
      jest.advanceTimersByTime(OEMBED_LOOKUP_TIMEOUT_MS);
      await resolving;
      expect(el).toMatchObject({ parsedUrl: 'https://example.com/slow' });
      expect((el as { oembed?: unknown }).oembed).toBeUndefined();
    });

    it('leaves no timer pending once the provider has answered', async () => {
      const el = { type: 'embed', url: 'https://youtu.be/x' };
      await resolveStaleEmbeds(el, async () => ({ html: '<iframe/>' }));
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});

describe('two-phase resolution (lookups outside a lock, settling inside it)', () => {
  const url = 'https://youtu.be/x';

  it('looks each stale url up once, however many embeds share it', async () => {
    const payload = [
      { element: { type: 'embed', url } },
      { element: { type: 'embed', url } },
      { element: { type: 'embed', url: 'https://ok.test/v', parsedUrl: 'https://ok.test/v' } },
    ];
    expect(collectStaleEmbedUrls(payload)).toEqual([url]);
    const fetch = jest.fn(async () => ({ html: '<iframe/>', width: 640, height: 360 }));
    const resolutions = await fetchEmbedResolutions([url], fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(resolutions.get(url)).toEqual({ html: '<iframe/>', width: 640, height: 360 });
  });

  it('never rejects: a failed lookup resolves to no answer', async () => {
    const resolutions = await fetchEmbedResolutions([url], async () => {
      throw new Error('provider down');
    });
    expect(resolutions.has(url)).toBe(true);
    expect(resolutions.get(url)).toBeUndefined();
  });

  it('settles a DIFFERENT payload than the one the urls were collected from', () => {
    // The locked save re-applies onto the row as it stands by then — a fresh
    // object, settled from the answers fetched before the lock.
    const fresh = {
      type: 'embed',
      url,
      parsedUrl: 'https://youtu.be/old',
      oembed: { html: '<old/>' },
    };
    installEmbedResolutions([{ element: fresh }], new Map([[url, { html: '<iframe/>' }]]));
    expect(fresh).toMatchObject({ parsedUrl: url, oembed: { html: '<iframe/>' } });
  });

  it('degrades a url nobody looked up to parsedUrl-only, dropping the previous payload', () => {
    const raced = {
      type: 'embed',
      url,
      parsedUrl: 'https://youtu.be/old',
      oembed: { html: '<old/>' },
    };
    installEmbedResolutions([{ element: raced }], new Map());
    expect(raced.parsedUrl).toBe(url);
    expect(raced.oembed).toBeUndefined();
  });
});
