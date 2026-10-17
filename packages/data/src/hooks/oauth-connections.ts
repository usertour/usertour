import { useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  OAuthConnectionsDocument,
  type OAuthConnectionsQuery,
  type OAuthConnectionsQueryVariables,
  RevokeOAuthConnectionDocument,
} from '../graphql';

/**
 * A "connected app" — one active OAuth grant the user approved.
 * `environmentNames` null = all environments.
 */
export type OAuthConnection = OAuthConnectionsQuery['oauthConnections'][number];

/** List the current user's connected OAuth apps. */
export const useOAuthConnectionsQuery = (
  options?: TypedQueryOptions<OAuthConnectionsQuery, OAuthConnectionsQueryVariables>,
) => {
  const { data, loading, refetch } = useTypedQuery(OAuthConnectionsDocument, options);
  return {
    connections: data?.oauthConnections ?? [],
    loading,
    refetch,
  };
};

/** Revoke a connected app (kills its access tokens + refresh). */
export const useRevokeOAuthConnectionMutation = () => {
  const [mutate, { loading }] = useMutation(RevokeOAuthConnectionDocument);
  const revoke = async (id: string): Promise<boolean> => {
    const { data } = await mutate({ variables: { id } });
    return Boolean(data?.revokeOAuthConnection);
  };
  return { revoke, loading };
};
