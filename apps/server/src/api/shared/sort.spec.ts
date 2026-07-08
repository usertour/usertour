import { parseOrderBy } from './sort';

describe('parseOrderBy — unique total order for cursor pagination', () => {
  it('appends an id tiebreak in the last key direction', () => {
    // Rows sharing a createdAt (bulk imports) reorder arbitrarily between
    // queries without a unique tiebreak — cursor pages then skip/dupe rows.
    expect(parseOrderBy(undefined, ['createdAt'])).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
    expect(parseOrderBy('-createdAt')).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
  });

  it('does not duplicate an explicit id sort', () => {
    expect(parseOrderBy('id')).toEqual([{ id: 'asc' }]);
    expect(parseOrderBy(['-createdAt', 'id'])).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
  });

  it('falls back to id desc when nothing is given', () => {
    expect(parseOrderBy(undefined, [])).toEqual([{ id: 'desc' }]);
  });
});
