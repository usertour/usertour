import type { ApolloError } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import { isEmptyValue, toQueryState } from '../query-state';

const refetch = async () => undefined;
const error = new Error('down') as ApolloError;

describe('toQueryState', () => {
  it('is loading while nothing has arrived', () => {
    expect(
      toQueryState(
        { data: undefined, error: undefined, loading: true, refreshing: false, refetch },
        (d) => d,
      ),
    ).toEqual({ status: 'loading' });
  });

  it('is an error, with a retry, when the server did not deliver', () => {
    const state = toQueryState(
      { data: undefined, error, loading: false, refreshing: false, refetch },
      (d) => d,
    );
    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.error).toBe(error);
      expect(state.retry).toBe(refetch);
    }
  });

  it('is empty only when the server delivered nothing', () => {
    const input = { error: undefined, loading: false, refreshing: false, refetch };
    expect(toQueryState({ ...input, data: { list: [] } }, (d) => d.list)).toEqual({
      status: 'empty',
    });
    expect(toQueryState({ ...input, data: { item: null } }, (d) => d.item)).toEqual({
      status: 'empty',
    });
  });

  it('is ready with the selected data, and refreshing during a refetch', () => {
    const input = { error: undefined, loading: false, refreshing: false, refetch };
    expect(toQueryState({ ...input, data: { list: [1] } }, (d) => d.list)).toEqual({
      status: 'ready',
      data: [1],
      refreshing: false,
    });
    expect(
      toQueryState(
        { ...input, data: { list: [1] }, loading: true, refreshing: true },
        (d) => d.list,
      ),
    ).toEqual({ status: 'ready', data: [1], refreshing: true });
  });

  it('keeps data over an error when both are present (an opted-in partial result)', () => {
    const state = toQueryState(
      { data: { list: [1] }, error, loading: false, refreshing: false, refetch },
      (d) => d.list,
    );
    expect(state.status).toBe('ready');
  });
});

describe('isEmptyValue', () => {
  it('treats null, undefined and an empty list as empty, and nothing else', () => {
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue([])).toBe(true);
    expect(isEmptyValue([0])).toBe(false);
    expect(isEmptyValue(0)).toBe(false);
    expect(isEmptyValue('')).toBe(false);
    expect(isEmptyValue({})).toBe(false);
  });
});
