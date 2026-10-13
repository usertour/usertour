import {
  ApolloError,
  type ApolloQueryResult,
  NetworkStatus,
  type OperationVariables,
  type QueryHookOptions,
  type QueryResult,
  type TypedDocumentNode,
  useQuery,
} from '@apollo/client';
import { getOperationName } from '@apollo/client/utilities';
import { useCallback, useEffect, useRef } from 'react';
import { useQueryErrorNotifier } from './notifier';

/**
 * Set on the context of every operation `useTypedQuery` sends: this observer
 * reports its own failures, network ones included, so an error link that
 * announces network failures for the operations nobody else watches
 * (mutations, lazy queries) leaves these alone.
 */
export const NOTIFIES_OWN_FAILURES = 'notifiesOwnFailures';

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
    context: { ...queryOptions.context, [NOTIFIES_OWN_FAILURES]: true },
  });

  // A failure is surfaced once per failure. A re-render of the same error is
  // not a new one, and neither is a poll that fails again with the same
  // message: a failing installation check must not toast every tick. A
  // failure the user asked for — a refetch, a new filter, the next page — is
  // surfaced again, and a settled answer without error clears the slate. A
  // network failure follows the same rules; the notifier folds every query an
  // outage took down into one notice.
  const operationName = getOperationName(document) ?? 'query';
  const reported = useRef<{ error: ApolloError; message: string } | undefined>(undefined);
  const inFlight = useRef<NetworkStatus | undefined>(undefined);
  const takenOver = !notifyOnError || queryOptions.onError !== undefined;
  useEffect(() => {
    if (loading) {
      inFlight.current = networkStatus;
      return;
    }
    if (!error) {
      reported.current = undefined;
      return;
    }
    const last = reported.current;
    const sameError = last?.error === error;
    const samePoll = inFlight.current === NetworkStatus.poll && last?.message === error.message;
    if (takenOver || sameError || samePoll) {
      return;
    }
    reported.current = { error, message: error.message };
    notify({ operationName, error });
  }, [error, loading, networkStatus, takenOver, notify, operationName]);

  // A failed fetchMore only rejects its promise; Apollo never writes it into
  // the query's `error`, so the effect above cannot see it. Nothing in this
  // layer repeats a page request on its own, so every failure is surfaced (a
  // caller that retries by itself owns that loop), and then rethrown for the
  // caller. Cast back to Apollo's generic signature: the wrapper only passes
  // the arguments through.
  const fetchMoreNotifying = useCallback(
    (...args: Parameters<typeof fetchMore>) =>
      fetchMore(...args).catch((failure: unknown) => {
        if (!takenOver && failure instanceof ApolloError) {
          notify({ operationName, error: failure });
        }
        throw failure;
      }),
    [fetchMore, takenOver, notify, operationName],
  ) as typeof fetchMore;

  const hasData = data !== undefined;
  return {
    data,
    error,
    loading: loading && !hasData,
    refreshing: loading && hasData,
    networkStatus,
    refetch,
    fetchMore: fetchMoreNotifying,
    previousData,
    startPolling,
    stopPolling,
  };
};
