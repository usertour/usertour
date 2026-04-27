import { extractLeafPaths, sortedLeafPaths, unionLeafPaths } from './extract-leaf-paths';

describe('extractLeafPaths', () => {
  it('returns empty for an empty object', () => {
    expect(extractLeafPaths({})).toEqual([]);
  });

  it('emits a single path for each scalar leaf', () => {
    expect(sortedLeafPaths({ a: 1, b: 'x', c: true })).toEqual(['a', 'b', 'c']);
  });

  it('flattens nested objects with dot notation', () => {
    expect(sortedLeafPaths({ a: { b: { c: 1 }, d: 2 } })).toEqual(['a.b.c', 'a.d']);
  });

  it('treats null as a leaf', () => {
    expect(extractLeafPaths({ a: null })).toEqual(['a']);
  });

  it('skips undefined leaves', () => {
    expect(extractLeafPaths({ a: 1, b: undefined })).toEqual(['a']);
  });

  it('treats arrays as leaves (no index recursion)', () => {
    expect(extractLeafPaths({ a: [1, 2, 3] })).toEqual(['a']);
  });

  it('unions paths across multiple inputs', () => {
    const a = { x: 1, y: { z: 2 } };
    const b = { x: 1, y: { w: 3 } };
    expect(unionLeafPaths(a, b)).toEqual(['x', 'y.w', 'y.z']);
  });
});
