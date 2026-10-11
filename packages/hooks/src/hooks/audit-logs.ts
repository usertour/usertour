import { type TypedQueryOptions, useTypedQuery } from '../query';
import { useMemo } from 'react';

import { useCursorFetchMore } from './use-cursor-fetch-more';
import {
  type AuditLogOrder,
  type AuditLogQuery,
  ListAuditLogsDocument,
  type ListAuditLogsQuery,
  type ListAuditLogsQueryVariables,
} from '@usertour/gql';

const AUDIT_LOG_PAGE_SIZE = 50;
// Newest first. Sent explicitly (not relying on the server default) so the order
// is unambiguous and the accumulator cache key is stable.
const AUDIT_LOG_ORDER: AuditLogOrder = { field: 'createdAt', direction: 'desc' };

/**
 * One audit row. The actor is a user (`actorUserId`) or a credential
 * (`actorTokenId`); the names and `resourceName` are resolved at read time and
 * null when the referent is gone. `before`/`after`/`metadata` are JSON.
 */
export type AuditLog = NonNullable<ListAuditLogsQuery['auditLogs']['edges']>[number]['node'];

/** Optional server-side filters (all combine with AND). Dates are ISO strings. */
export type AuditLogFilter = AuditLogQuery;

/**
 * Owner-only project audit log (Activity page). Infinite-scroll cursor
 * pagination: the cache-level merge is owned by the `auditLogs` typePolicy
 * (apps/web/src/apollo/type-policies) — no `updateQuery` here. Returns the
 * accumulated list plus `fetchNextPage` for the sentinel to call. `filter`
 * changes the `query` arg → a separate accumulator cell (keyArgs include query).
 */
export const useListAuditLogsQuery = (
  projectId: string | undefined,
  filter?: AuditLogFilter,
  options?: TypedQueryOptions<ListAuditLogsQuery, ListAuditLogsQueryVariables>,
) => {
  const query = filter && Object.values(filter).some((v) => v != null) ? filter : undefined;
  const { data, loading, refreshing, networkStatus, error, refetch, fetchMore } = useTypedQuery(
    ListAuditLogsDocument,
    {
      variables: {
        projectId: projectId!,
        first: AUDIT_LOG_PAGE_SIZE,
        orderBy: AUDIT_LOG_ORDER,
        query,
      },
      skip: !projectId,
      notifyOnNetworkStatusChange: true,
      ...options,
    },
  );

  const connection = data?.auditLogs;
  const auditLogs: AuditLog[] = useMemo(
    () => (connection?.edges ?? []).map((edge) => edge.node),
    [connection?.edges],
  );
  const hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
  const endCursor = connection?.pageInfo?.endCursor ?? null;
  const totalCount = connection?.totalCount ?? 0;

  const { loadingMore, pageFailed, fetchNextPage, retryNextPage } = useCursorFetchMore({
    loading: loading || refreshing,
    networkStatus,
    hasNextPage,
    endCursor,
    fetchMore,
    buildVariables: (after) => ({
      projectId,
      first: AUDIT_LOG_PAGE_SIZE,
      after,
      orderBy: AUDIT_LOG_ORDER,
      query,
    }),
  });

  return {
    auditLogs,
    totalCount,
    hasNextPage,
    // Keep the rendered list intact while a page appends (skeleton only on
    // first load, like version history).
    loading: loading && !loadingMore,
    loadingMore,
    pageFailed,
    fetchNextPage,
    retryNextPage,
    refetch,
    // Surfaced so the page can render a load-error state — a swallowed server
    // rejection (e.g. an entitlement drop the cached config hasn't caught up
    // with) otherwise renders as an empty list, which reads as data loss.
    error,
  };
};
