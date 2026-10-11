import type { ApolloError } from '@apollo/client';
import { useMemo } from 'react';

/**
 * What a page renders from a query, as one discriminated value (ADR 0021 §2).
 *
 * - `loading`: nothing to show yet (also a skipped query, which has nothing
 *   to show either; a caller that skips knows it did).
 * - `error`: the server did not deliver — no data at all. Under
 *   `errorPolicy: 'all'` a partial result still counts as data here; the
 *   caller that opted in reads the error next to it.
 * - `empty`: the server delivered nothing — `null`, `undefined` or an empty
 *   list. Only a delivery can be empty; a failure never reads as empty.
 * - `ready`: data, with `refreshing` while a refetch is in flight.
 */
export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApolloError; retry: () => Promise<unknown> }
  | { status: 'empty' }
  | { status: 'ready'; data: T; refreshing: boolean };

export interface QueryStateInput<TData> {
  data: TData | undefined;
  error: ApolloError | undefined;
  loading: boolean;
  refreshing: boolean;
  refetch: () => Promise<unknown>;
}

export const isEmptyValue = (value: unknown): boolean =>
  value === null || value === undefined || (Array.isArray(value) && value.length === 0);

export const toQueryState = <TData, T>(
  input: QueryStateInput<TData>,
  select: (data: TData) => T | null | undefined,
): QueryState<T> => {
  const { data, error, loading, refreshing, refetch } = input;
  if (data === undefined) {
    if (error) {
      return { status: 'error', error, retry: refetch };
    }
    return { status: 'loading' };
  }
  if (loading && !refreshing) {
    // Defensive: data present means the query is at worst refreshing.
    return { status: 'ready', data: select(data) as T, refreshing: true };
  }
  const value = select(data);
  if (isEmptyValue(value)) {
    return { status: 'empty' };
  }
  return { status: 'ready', data: value as T, refreshing };
};

export const useQueryState = <TData, T>(
  input: QueryStateInput<TData>,
  select: (data: TData) => T | null | undefined,
): QueryState<T> => {
  const { data, error, loading, refreshing, refetch } = input;
  return useMemo(
    () => toQueryState({ data, error, loading, refreshing, refetch }, select),
    [data, error, loading, refreshing, refetch, select],
  );
};
