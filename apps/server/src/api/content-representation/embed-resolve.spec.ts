import { resolveStaleEmbeds } from './embed-resolve';

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

  it('skips an untouched echo (parsedUrl === url) without calling the provider', async () => {
    const el = { type: 'embed', url: 'https://youtu.be/x', parsedUrl: 'https://youtu.be/x' };
    const fetch = fetchMock('<iframe/>');
    await resolveStaleEmbeds({ nested: { deep: [el] } }, fetch);
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
});
