import { type QueryHookOptions, useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { ListAuditLogs } from '@usertour/gql';
import { useCursorFetchMore } from './use-cursor-fetch-more';

const AUDIT_LOG_PAGE_SIZE = 50;
// Newest first. Sent explicitly (not relying on the server default) so the order
// is unambiguous and the accumulator cache key is stable.
const AUDIT_LOG_ORDER = { field: 'createdAt', direction: 'desc' };

export interface AuditLog {
  id: string;
  createdAt: string;
  source: string;
  /** The human, when known (null for env access-token / system writes). */
  actorUserId: string | null;
  /** The credential used (ApiToken.id, or v1 AccessToken.id). */
  actorTokenId: string | null;
  /** Best-effort display name resolved at read time (null if the user was deleted). */
  actorUserName: string | null;
  /** Best-effort token name resolved at read time (null if the token was deleted). */
  actorTokenName: string | null;
  action: string;
  operation: string;
  resourceType: string;
  resourceId: string;
  /** Best-effort resource name/title from the snapshot (null when none). */
  resourceName: string | null;
  environmentId: string | null;
  before: unknown;
  after: unknown;
  metadata: Record<string, unknown> | null;
}

interface AuditLogEdge {
  cursor: string;
  node: AuditLog;
}

/** Optional server-side filters (all combine with AND). Dates are ISO strings. */
export interface AuditLogFilter {
  source?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  environmentId?: string;
  actorUserId?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
}

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
  options?: QueryHookOptions,
) => {
  const query = filter && Object.values(filter).some((v) => v != null) ? filter : undefined;
  const { data, loading, networkStatus, refetch, fetchMore } = useQuery(ListAuditLogs, {
    variables: { projectId, first: AUDIT_LOG_PAGE_SIZE, orderBy: AUDIT_LOG_ORDER, query },
    skip: !projectId,
    notifyOnNetworkStatusChange: true,
    ...options,
  });

  const connection = data?.auditLogs;
  const auditLogs: AuditLog[] = useMemo(
    () => (connection?.edges ?? []).map((edge: AuditLogEdge) => edge.node),
    [connection?.edges],
  );
  const hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
  const endCursor = connection?.pageInfo?.endCursor ?? null;
  const totalCount = connection?.totalCount ?? 0;

  const { loadingMore, fetchNextPage } = useCursorFetchMore({
    loading,
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
    fetchNextPage,
    refetch,
  };
};
