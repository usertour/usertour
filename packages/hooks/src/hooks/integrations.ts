import { useCallback } from 'react';
import { NetworkStatus, type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  DeleteIntegration,
  ListIntegrations,
  QueryIntegrationMessages,
  SendIntegrationTestEvent,
  UpsertIntegration,
} from '@usertour/gql';
import type { IntegrationConfig } from '@usertour/types';
import type { OutboundMessage } from './outbound-message';

export interface Integration {
  id: string;
  createdAt: string;
  updatedAt: string;
  environmentId: string;
  provider: string;
  /** Last four characters of the configured key — the key itself is never returned. */
  keyTail: string;
  config: IntegrationConfig;
  enabled: boolean;
  /** Circuit-breaker streak: consecutive failed delivery attempts (any success resets). */
  consecutiveFailures: number;
  /** While in the future, deliveries are held and sent after the window (cooldown). */
  cooldownUntil?: string | null;
  /** Set when the SYSTEM disabled the integration after sustained failure. */
  autoDisabledAt?: string | null;
}

export interface UpsertIntegrationInput {
  environmentId: string;
  provider: string;
  /** Required on first configure; omitted afterwards to keep the stored key. */
  key?: string;
  config?: IntegrationConfig;
  enabled?: boolean;
}

export const useListIntegrationsQuery = (environmentId: string, options?: QueryHookOptions) => {
  const { data, loading, error, refetch, networkStatus } = useQuery(ListIntegrations, {
    variables: { environmentId },
    notifyOnNetworkStatusChange: true,
    skip: !environmentId,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const integrations = data?.listIntegrations as Integration[] | undefined;
  return { integrations, loading, error, refetch, isRefetching };
};

export const useQueryIntegrationMessagesQuery = (
  integrationId: string,
  pagination: { first?: number; after?: string },
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch, networkStatus } = useQuery(QueryIntegrationMessages, {
    variables: { integrationId, ...pagination },
    notifyOnNetworkStatusChange: true,
    skip: !integrationId,
    ...options,
  });
  const connection = data?.queryIntegrationMessages;
  const messages = (connection?.edges ?? []).map(
    (edge: { node: OutboundMessage }) => edge.node,
  ) as OutboundMessage[];
  return {
    messages,
    totalCount: connection?.totalCount as number | undefined,
    pageInfo: connection?.pageInfo as
      | { endCursor: string | null; hasNextPage: boolean }
      | undefined,
    loading,
    error,
    refetch,
    isRefetching: networkStatus === NetworkStatus.refetch,
  };
};

export const useUpsertIntegrationMutation = () => {
  // Refetch the list: a first configure INSERTS a row the normalized cache
  // can't materialize from the mutation response; later writes ride the
  // returned full field set either way.
  const [mutation, { loading, error }] = useMutation(UpsertIntegration, {
    refetchQueries: ['ListIntegrations'],
  });
  const invoke = useCallback(
    async (input: UpsertIntegrationInput): Promise<Integration | null> => {
      const response = await mutation({ variables: { data: input } });
      return (response.data?.upsertIntegration as Integration | undefined) ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteIntegrationMutation = () => {
  // Hard delete; refetch evicts the row from the list.
  const [mutation, { loading, error }] = useMutation(DeleteIntegration, {
    refetchQueries: ['ListIntegrations'],
  });
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({ variables: { data: { id } } });
      return !!response.data?.deleteIntegration;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useSendIntegrationTestEventMutation = () => {
  // Enqueues a single-attempt test message; the outcome lands in the message
  // log, so consumers refetch it after a short delay rather than via cache.
  const [mutation, { loading, error }] = useMutation(SendIntegrationTestEvent);
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({ variables: { data: { id } } });
      return !!response.data?.sendIntegrationTestEvent;
    },
    [mutation],
  );
  return { invoke, loading, error };
};
