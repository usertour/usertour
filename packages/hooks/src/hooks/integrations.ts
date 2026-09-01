import { useCallback } from 'react';
import { NetworkStatus, type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  DeleteIntegration,
  ListIntegrations,
  QueryIntegrationMessages,
  QueryIntegrationSyncedSegments,
  RotateIntegrationInboundToken,
  SendIntegrationTestEvent,
  UpdateIntegrationInbound,
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
  /** Inbound cohort sync switch (ADR 0012) — independent of `enabled`. */
  inboundEnabled: boolean;
  inboundConfig: IntegrationInboundConfig;
  /** The receive URL (carries the token) — null until first inbound enable. */
  inboundUrl?: string | null;
}

export interface IntegrationInboundConfig {
  /** Member property holding the Usertour user id; absent = the provider's distinct id. */
  userIdProperty?: string;
}

/** One synced provider cohort and the segment mirroring it (ADR 0012). */
export interface IntegrationSyncedSegment {
  id: string;
  createdAt: string;
  sourceCohortId: string;
  sourceCohortName: string;
  segmentId: string;
  segmentName: string;
  lastSyncedAt?: string | null;
  /** This environment's bridged members — several environments may feed one segment. */
  memberCount: number;
  /** Members whose wire object carried no extractable user id (skipped). */
  unresolvedCount: number;
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

export const useQueryIntegrationSyncedSegmentsQuery = (
  integrationId: string,
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch, networkStatus } = useQuery(
    QueryIntegrationSyncedSegments,
    {
      variables: { integrationId },
      notifyOnNetworkStatusChange: true,
      skip: !integrationId,
      ...options,
    },
  );
  const syncedSegments = data?.queryIntegrationSyncedSegments as
    | IntegrationSyncedSegment[]
    | undefined;
  return {
    syncedSegments,
    loading,
    error,
    refetch,
    isRefetching: networkStatus === NetworkStatus.refetch,
  };
};

export const useUpdateIntegrationInboundMutation = () => {
  // Returns the changed fields on an EXISTING row (inbound settings only live
  // on configured integrations), so the normalized cache merges — no refetch.
  const [mutation, { loading, error }] = useMutation(UpdateIntegrationInbound);
  const invoke = useCallback(
    async (input: {
      id: string;
      enabled?: boolean;
      /** Empty string clears the override (back to the provider's distinct id). */
      userIdProperty?: string;
    }): Promise<Integration | null> => {
      const response = await mutation({ variables: { data: input } });
      return (response.data?.updateIntegrationInbound as Integration | undefined) ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useRotateIntegrationInboundTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(RotateIntegrationInboundToken);
  const invoke = useCallback(
    async (id: string): Promise<Integration | null> => {
      const response = await mutation({ variables: { data: { id } } });
      return (response.data?.rotateIntegrationInboundToken as Integration | undefined) ?? null;
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
