import { protoKeyPath } from './proto-key';

describe('protoKeyPath', () => {
  it('finds an own __proto__ key anywhere in the body and reports its path', () => {
    expect(protoKeyPath({ attributes: { plan: 'pro' } })).toBeUndefined();
    expect(
      protoKeyPath(JSON.parse('{"attributes":{"plan":"pro","__proto__":{"admin":true}}}')),
    ).toBe('attributes.__proto__');
    expect(protoKeyPath(JSON.parse('{"items":[{"a":1},{"__proto__":1}]}'))).toBe(
      'items[1].__proto__',
    );
    expect(protoKeyPath(null)).toBeUndefined();
    expect(protoKeyPath('__proto__')).toBeUndefined();
  });

  it('walks a body nested as deep as the size limit allows without overflowing the stack', () => {
    let deep: unknown = { __proto__: 1 };
    const bottom = JSON.parse('{"__proto__":1}');
    deep = bottom;
    for (let i = 0; i < 200_000; i++) {
      deep = [deep];
    }
    expect(protoKeyPath(deep)).toMatch(/^(\[0\])+\.__proto__$/);
  });
});
