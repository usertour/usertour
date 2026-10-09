import { keepKnownList } from '../keep-known-list';

const merge = keepKnownList as (existing: unknown, incoming: unknown) => unknown;

describe('keepKnownList', () => {
  it('stays unknown when the first delivery already fails', () => {
    expect(merge(undefined, null)).toBeNull();
  });

  it('keeps the known list when a later delivery fails', () => {
    expect(merge([{ id: 'm1' }], null)).toEqual([{ id: 'm1' }]);
  });

  it('takes a delivered list, including an empty one', () => {
    expect(merge([{ id: 'm1' }], [])).toEqual([]);
    expect(merge(undefined, [{ id: 'm2' }])).toEqual([{ id: 'm2' }]);
    expect(merge(null, [{ id: 'm2' }])).toEqual([{ id: 'm2' }]);
  });
});
