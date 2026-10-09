import {
  type ApolloError,
  type ApolloQueryResult,
  type NetworkStatus,
  type OperationVariables,
  type QueryHookOptions,
  type QueryResult,
  type TypedDocumentNode,
  useQuery,
} from '@apollo/client';
import { getOperationName } from '@apollo/client/utilities';
import { useEffect, useRef } from 'react';
import { useQueryErrorNotifier } from './notifier';

export interface TypedQueryOptions<TData, TVariables extends OperationVariables>
  extends QueryHookOptions<TData, TVariables> {
  /**
   * Surface a failure through the application's notifier, once per error.
   * Default true. Pass false when the caller renders the failure in place.
   * A caller that passes Apollo's own `onError` has taken the failure over
   * and is not notified either.
   */
  notifyOnError?: boolean;
}

/**
 * The options a caller may forward into any typed hook without knowing its
 * document: the generic-free subset of Apollo's query options. Wrappers that
 * take an injected hook (cursor pagination, entity tables) type their
 * pass-through with this, so it stays assignable to every hook's own
 * `TypedQueryOptions<Query, Variables>`.
 */
export type ForwardedQueryOptions = Pick<
  QueryHookOptions,
  'fetchPolicy' | 'skip' | 'notifyOnNetworkStatusChange' | 'pollInterval' | 'refetchWritePolicy'
>;

export interface TypedQueryResult<TData, TVariables extends OperationVariables> {
  data: TData | undefined;
  error: ApolloError | undefined;
  /** No data yet. A refetch over data already held is `refreshing`, never `loading`. */
  loading: boolean;
  refreshing: boolean;
  networkStatus: NetworkStatus;
  refetch: (variables?: Partial<TVariables>) => Promise<ApolloQueryResult<TData>>;
  /** Cursor pagination: the next page is merged by the cache's type policy. */
  fetchMore: QueryResult<TData, TVariables>['fetchMore'];
  /** The data of the previous variables while new ones load. */
  previousData: TData | undefined;
  startPolling: QueryResult<TData, TVariables>['startPolling'];
  stopPolling: QueryResult<TData, TVariables>['stopPolling'];
}

/**
 * The one way a page reads from the server (ADR 0021 §2). It decides, once:
 *
 * - `loading` means "no data yet"; a broadcast or explicit refetch over data
 *   the query already holds is `refreshing`, so a gate on `loading` never
 *   unmounts a page that has something to show.
 * - a partial response is an error, not data: `errorPolicy` is `none` unless
 *   the caller opts into `'all'` and reads data and error together.
 * - a failure is surfaced to the user exactly once, through the notifier the
 *   application mounts, unless the caller renders it in place.
 */
export const useTypedQuery = <TData, TVariables extends OperationVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  options: TypedQueryOptions<TData, TVariables> = {},
): TypedQueryResult<TData, TVariables> => {
  const { notifyOnError = true, ...queryOptions } = options;
  const notify = useQueryErrorNotifier();
  const {
    data,
    error,
    loading,
    networkStatus,
    refetch,
    fetchMore,
    previousData,
    startPolling,
    stopPolling,
  } = useQuery<TData, TVariables>(document, {
    errorPolicy: 'none',
    notifyOnNetworkStatusChange: true,
    ...queryOptions,
  });

  const reported = useRef<ApolloError | undefined>(undefined);
  const takenOver = !notifyOnError || queryOptions.onError !== undefined;
  useEffect(() => {
    if (!error || takenOver || reported.current === error) {
      return;
    }
    reported.current = error;
    notify({ operationName: getOperationName(document) ?? 'query', error });
  }, [error, takenOver, notify, document]);

  const hasData = data !== undefined;
  return {
    data,
    error,
    loading: loading && !hasData,
    refreshing: loading && hasData,
    networkStatus,
    refetch,
    fetchMore,
    previousData,
    startPolling,
    stopPolling,
  };
};
