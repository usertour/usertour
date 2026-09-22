import { ContentActionsItemType } from '@usertour/types';
import type { RulesCondition } from '@usertour/types';

import {
  type SlateNode,
  collectNavigateActionPairs,
  collectSlateFieldPairs,
  readContentListNavigateUrl,
  setNavigateActionUrl,
  setSlateChipFallback,
  withContentListNavigateUrl,
} from '../localized-pairs';

const urlTemplate = (url: string) => [{ type: 'paragraph', children: [{ text: url }] }];

const navigate = (id: string, url: string): RulesCondition => ({
  id,
  type: ContentActionsItemType.PAGE_NAVIGATE,
  data: { openType: 'new', value: urlTemplate(url) },
});

describe('collectSlateFieldPairs', () => {
  const source: SlateNode[] = [
    {
      type: 'paragraph',
      children: [
        { text: 'Hi ' },
        {
          type: 'user-attribute',
          attrCode: 'first_name',
          fallback: 'there',
          children: [{ text: '' }],
        },
        { text: ', see ' },
        { type: 'link', url: 'https://example.com/en/post', children: [{ text: 'the post' }] },
      ],
    },
  ];

  it('pairs leaves, chip fallbacks and link destinations with the working tree', () => {
    const working: SlateNode[] = JSON.parse(JSON.stringify(source));
    setSlateChipFallback(working, [0, 1], 'du');
    const pairs = collectSlateFieldPairs(source, working);
    expect(pairs.leafPairs.map((pair) => pair.sourceText)).toEqual(['Hi ', ', see ', 'the post']);
    expect(pairs.chipPairs).toEqual([
      { path: [0, 1], attributeCode: 'first_name', sourceText: 'there', value: 'du' },
    ]);
    expect(pairs.linkPairs).toEqual([
      {
        path: [0, 3],
        sourceUrl: 'https://example.com/en/post',
        value: 'https://example.com/en/post',
      },
    ]);
  });

  it('skips a chip without a fallback — nothing for the user to read', () => {
    const bare: SlateNode[] = [
      {
        type: 'paragraph',
        children: [
          { type: 'user-attribute', attrCode: 'plan', fallback: '', children: [{ text: '' }] },
        ],
      },
    ];
    expect(collectSlateFieldPairs(bare, bare).chipPairs).toEqual([]);
  });
});

describe('navigate action pairs', () => {
  const sourceActions: RulesCondition[] = [
    { id: 'dismiss', type: ContentActionsItemType.FLOW_DISMIS, data: {} },
    navigate('go', 'https://example.com/en/mcp'),
    {
      id: 'dynamic',
      type: ContentActionsItemType.PAGE_NAVIGATE,
      data: {
        openType: 'same',
        value: [
          {
            type: 'paragraph',
            children: [
              { text: 'https://example.com/' },
              {
                type: 'user-attribute',
                attrCode: 'locale_code',
                fallback: 'en',
                children: [{ text: '' }],
              },
            ],
          },
        ],
      },
    },
  ];

  it('lists only the plain page-navigate destinations, paired by action id', () => {
    const working = setNavigateActionUrl(
      [...sourceActions].reverse(),
      'go',
      ' https://example.com/cs/mcp ',
    );
    expect(collectNavigateActionPairs(sourceActions, working)).toEqual([
      {
        actionId: 'go',
        sourceUrl: 'https://example.com/en/mcp',
        value: 'https://example.com/cs/mcp',
      },
    ]);
    // Only the addressed action changes, and it changes on a fresh object.
    expect(working.find((action) => action.id === 'go')?.data.openType).toBe('new');
    expect(sourceActions.find((action) => action.id === 'go')?.data.value).toEqual(
      urlTemplate('https://example.com/en/mcp'),
    );
  });

  it('reads an empty value for an action the working list lacks', () => {
    expect(collectNavigateActionPairs(sourceActions, undefined)[0].value).toBe('');
  });
});

describe('content-list entry navigation', () => {
  it('reads a plain destination and writes a fresh entry', () => {
    const entry = {
      contentId: 'flow-1',
      navigateUrl: urlTemplate('/en/app'),
      navigateOpenType: 'same',
    };
    expect(readContentListNavigateUrl(entry)).toBe('/en/app');
    expect(readContentListNavigateUrl({ contentId: 'flow-2' })).toBeUndefined();

    const next = withContentListNavigateUrl(entry, '/cs/app');
    expect(readContentListNavigateUrl(next)).toBe('/cs/app');
    expect(next.navigateOpenType).toBe('same');
    expect(readContentListNavigateUrl(entry)).toBe('/en/app');
  });
});
