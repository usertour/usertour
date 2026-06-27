import { ContentEditorElementType } from '@usertour/types';
import { extractLinkUrl, replaceUserAttr, serializeBlockName } from '../content';

/**
 * Runtime link/attribute derivation — the layer BELOW rendering, where the B-2 bug
 * lived: a link's href is derived from its `data` at identify-time
 * (`url = data ? extractLinkUrl(data) : ''`), and `{{ attribute }}` tokens are
 * substituted. Pure functions, so the worst "render" bug class is testable here
 * without a browser/jsdom harness (layout/positioning still needs a real browser).
 */

describe('extractLinkUrl', () => {
  it('concatenates the text segments of a link data value', () => {
    expect(extractLinkUrl([{ children: [{ text: 'https://x.io/docs' }] }], {} as never)).toBe(
      'https://x.io/docs',
    );
  });

  it('substitutes a {{ user-attribute }} segment with the user value', () => {
    const data = [
      {
        children: [
          { text: 'https://x.io/' },
          { type: 'user-attribute', attrCode: 'plan' },
          { text: '/end' },
        ],
      },
    ];
    expect(extractLinkUrl(data, { plan: 'pro' } as never)).toBe('https://x.io/pro/end');
  });

  it('uses the fallback when the attribute is absent', () => {
    const data = [
      {
        children: [{ text: 'u/' }, { type: 'user-attribute', attrCode: 'plan', fallback: 'free' }],
      },
    ];
    expect(extractLinkUrl(data, {} as never)).toBe('u/free');
  });

  it('returns an empty string for empty data', () => {
    expect(extractLinkUrl([], {} as never)).toBe('');
  });
});

describe('replaceUserAttr — link href derivation (B-2 regression)', () => {
  // group → column → text element whose data holds a single link node
  const tree = (linkNode: unknown) =>
    [
      {
        children: [
          {
            children: [
              {
                element: {
                  type: ContentEditorElementType.TEXT,
                  data: [{ children: [linkNode] }],
                },
              },
            ],
          },
        ],
      },
    ] as never;
  const linkOf = (out: any) => out[0].children[0].children[0].element.data[0].children[0];

  it('derives link.url from its data (incl {{attr}}) — a link WITH data renders a real href', () => {
    const out = replaceUserAttr(
      tree({
        type: 'link',
        url: 'STALE',
        data: [
          { children: [{ text: 'https://x.io/' }, { type: 'user-attribute', attrCode: 'plan' }] },
        ],
        children: [{ text: 'go' }],
      }),
      { plan: 'pro' } as never,
    );
    expect(linkOf(out).url).toBe('https://x.io/pro');
  });

  it('a link WITHOUT data renders href="" (the contract the codec must satisfy — always store data)', () => {
    const out = replaceUserAttr(
      tree({ type: 'link', url: 'STALE', children: [{ text: 'go' }] }),
      {} as never,
    );
    expect(linkOf(out).url).toBe('');
  });

  it('sets a user-attribute node value in text', () => {
    const out = replaceUserAttr(
      tree({ type: 'user-attribute', attrCode: 'name', fallback: 'friend' }),
      { name: 'Sam' } as never,
    );
    expect(linkOf(out).value).toBe('Sam');
  });
});

describe('serializeBlockName', () => {
  it('returns a plain string as-is', () => {
    expect(serializeBlockName('Hello')).toBe('Hello');
  });

  it('resolves a user-attribute node with its fallback', () => {
    expect(
      serializeBlockName(
        [{ type: 'user-attribute', attrCode: 'plan', fallback: 'free' }] as never,
        {} as never,
      ),
    ).toBe('free');
  });

  it('concatenates text + a resolved attribute', () => {
    expect(
      serializeBlockName(
        [{ text: 'Hi ' }, { type: 'user-attribute', attrCode: 'name' }] as never,
        { name: 'Sam' } as never,
      ),
    ).toBe('Hi Sam');
  });
});
