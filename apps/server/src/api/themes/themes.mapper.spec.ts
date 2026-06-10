import { mapTheme } from './themes.mapper';

/** Pure mapper — plain fixture, no DI/DB. */
describe('mapTheme (pure)', () => {
  const at = new Date('2026-01-01T00:00:00.000Z');

  it('maps a theme to the public shape', () => {
    expect(
      mapTheme({ id: 't1', name: 'Default', isDefault: true, createdAt: at, updatedAt: at }),
    ).toEqual({
      id: 't1',
      object: 'theme',
      name: 'Default',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('accepts ISO string timestamps too', () => {
    const mapped = mapTheme({
      id: 't2',
      name: 'Brand',
      isDefault: false,
      createdAt: '2026-02-02T00:00:00.000Z',
      updatedAt: '2026-02-02T00:00:00.000Z',
    });
    expect(mapped.isDefault).toBe(false);
    expect(mapped.createdAt).toBe('2026-02-02T00:00:00.000Z');
  });
});
