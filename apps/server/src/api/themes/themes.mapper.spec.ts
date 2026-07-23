import { mapTheme } from './themes.mapper';

/** Pure mapper — plain fixture, no DI/DB. */
describe('mapTheme (pure)', () => {
  const at = new Date('2026-01-01T00:00:00.000Z');
  // No expand requested → settings/variations omitted, so resolvers are unused.
  const resolvers = { attributeCode: (i: string) => i, eventCode: (i: string) => i } as never;

  it('maps a theme to the public shape', () => {
    expect(
      mapTheme(
        { id: 't1', name: 'Default', isDefault: true, createdAt: at, updatedAt: at },
        [],
        resolvers,
      ),
    ).toEqual({
      id: 't1',
      object: 'theme',
      name: 'Default',
      isDefault: true,
      isSystem: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('accepts ISO string timestamps too', () => {
    const mapped = mapTheme(
      {
        id: 't2',
        name: 'Brand',
        isDefault: false,
        createdAt: '2026-02-02T00:00:00.000Z',
        updatedAt: '2026-02-02T00:00:00.000Z',
      },
      [],
      resolvers,
    );
    expect(mapped.isDefault).toBe(false);
    expect(mapped.createdAt).toBe('2026-02-02T00:00:00.000Z');
  });
});

describe('mapVariations joiner semantics', () => {
  const at = new Date('2026-01-01T00:00:00.000Z');
  const resolvers = {
    attributeCode: (i: string) => i,
    eventCode: (i: string) => i,
    tryAttributeCode: (i: string) => i,
    tryEventCode: (i: string) => i,
  } as never;

  it('an OR variation list (missing operators) wraps in group{any}; explicit AND stays flat', () => {
    // Same reversed-semantics bug as segments: the runtime evaluates a missing
    // joiner as OR while the representation's bare list means AND.
    const theme = {
      id: 't3',
      name: 'V',
      isDefault: false,
      createdAt: at,
      updatedAt: at,
      variations: [
        {
          id: 'v1',
          name: 'or-var',
          conditions: [
            { type: 'user-attr', data: { attrId: 'a1', logic: 'is', value: 'x' } },
            { type: 'user-attr', data: { attrId: 'a1', logic: 'is', value: 'y' } },
          ],
          settings: {},
        },
        {
          id: 'v2',
          name: 'and-var',
          conditions: [
            {
              type: 'user-attr',
              operators: 'and',
              data: { attrId: 'a1', logic: 'is', value: 'x' },
            },
            {
              type: 'user-attr',
              operators: 'and',
              data: { attrId: 'a1', logic: 'is', value: 'y' },
            },
          ],
          settings: {},
        },
      ],
    };
    const mapped = mapTheme(theme, ['variations'], resolvers) as {
      variations: { conditions: { type: string; match?: string }[] }[];
    };
    expect(mapped.variations[0].conditions).toHaveLength(1);
    expect(mapped.variations[0].conditions[0]).toMatchObject({ type: 'group', match: 'any' });
    expect(mapped.variations[1].conditions).toHaveLength(2);
    expect(mapped.variations[1].conditions[0].type).toBe('attribute');
  });
});
