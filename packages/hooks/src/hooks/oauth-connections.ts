import { type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import { OAuthConnections, RevokeOAuthConnection } from '@usertour/gql';

/** A "connected app" — one active OAuth grant the user approved. */
export interface OAuthConnection {
  id: string;
  clientName: string;
  projectId: string;
  projectName: string;
  scopes: string[];
  /** Environments this connection may act on; null = all environments. */
  environmentNames: string[] | null;
  createdAt: string;
  lastUsedAt: string | null;
}

/** List the current user's connected OAuth apps. */
export const useOAuthConnectionsQuery = (options?: QueryHookOptions) => {
  const { data, loading, refetch } = useQuery(OAuthConnections, options);
  return {
    connections: (data?.oauthConnections ?? []) as OAuthConnection[],
    loading,
    refetch,
  };
};

/** Revoke a connected app (kills its access tokens + refresh). */
export const useRevokeOAuthConnectionMutation = () => {
  const [mutate, { loading }] = useMutation(RevokeOAuthConnection);
  const revoke = async (id: string): Promise<boolean> => {
    const { data } = await mutate({ variables: { id } });
    return Boolean(data?.revokeOAuthConnection);
  };
  return { revoke, loading };
};
