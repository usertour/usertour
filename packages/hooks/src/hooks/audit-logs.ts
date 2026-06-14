import { type QueryHookOptions, useQuery } from '@apollo/client';
import { ListAuditLogs } from '@usertour/gql';

export interface AuditLog {
  id: string;
  createdAt: string;
  source: string;
  /** The human, when known (null for env access-token / system writes). */
  actorUserId: string | null;
  /** The credential used (ApiToken.id, or v1 AccessToken.id). */
  actorTokenId: string | null;
  action: string;
  operation: string;
  resourceType: string;
  resourceId: string;
  environmentId: string | null;
  before: unknown;
  after: unknown;
  metadata: Record<string, unknown> | null;
}

interface AuditLogEdge {
  cursor: string;
  node: AuditLog;
}

/**
 * Owner-only project audit log (Activity page). Returns the latest page of
 * entries (most recent first). `pageInfo`/`fetchMore` are exposed for future
 * "load more" paging.
 */
export const useListAuditLogsQuery = (
  projectId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch, fetchMore } = useQuery(ListAuditLogs, {
    variables: { projectId, first: 50 },
    skip: !projectId,
    notifyOnNetworkStatusChange: true,
    ...options,
  });
  const connection = data?.auditLogs;
  const auditLogs: AuditLog[] = (connection?.edges ?? []).map((edge: AuditLogEdge) => edge.node);
  const pageInfo = connection?.pageInfo as
    | { endCursor: string | null; hasNextPage: boolean }
    | undefined;
  const totalCount = connection?.totalCount as number | undefined;
  return { auditLogs, pageInfo, totalCount, loading, error, refetch, fetchMore };
};
