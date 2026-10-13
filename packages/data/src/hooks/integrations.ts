import { useCallback } from 'react';
import { NetworkStatus, useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { SyncRemoteObject } from '@usertour/types';
import type { OutboundMessage } from './outbound-message';
import {
  DeleteIntegrationDocument,
  DeleteIntegrationObjectMappingDocument,
  DisconnectIntegrationOAuthDocument,
  type DisconnectIntegrationOAuthMutation,
  type IntegrationFieldsFragment,
  type IntegrationObjectMappingFieldsFragment,
  ListIntegrationObjectMappingsDocument,
  type ListIntegrationObjectMappingsQuery,
  type ListIntegrationObjectMappingsQueryVariables,
  ListIntegrationRemotePropertiesDocument,
  type ListIntegrationRemotePropertiesQuery,
  type ListIntegrationRemotePropertiesQueryVariables,
  ListIntegrationsDocument,
  type ListIntegrationsQuery,
  type ListIntegrationsQueryVariables,
  ListIntegrationSyncRunsDocument,
  type ListIntegrationSyncRunsQuery,
  type ListIntegrationSyncRunsQueryVariables,
  QueryIntegrationMessagesDocument,
  type QueryIntegrationMessagesQuery,
  type QueryIntegrationMessagesQueryVariables,
  QueryIntegrationSyncedSegmentsDocument,
  type QueryIntegrationSyncedSegmentsQuery,
  type QueryIntegrationSyncedSegmentsQueryVariables,
  RotateIntegrationInboundTokenDocument,
  type RotateIntegrationInboundTokenMutation,
  RunIntegrationObjectMappingSyncDocument,
  SendIntegrationTestEventDocument,
  StartIntegrationOAuthDocument,
  type StartIntegrationOAuthInput,
  UpdateIntegrationEventsDocument,
  type UpdateIntegrationEventsInput,
  type UpdateIntegrationEventsMutation,
  UpdateIntegrationInboundDocument,
  type UpdateIntegrationInboundInput,
  type UpdateIntegrationInboundMutation,
  UpsertIntegrationDocument,
  type UpsertIntegrationInput as UpsertIntegrationInputWire,
  UpsertIntegrationObjectMappingDocument,
  type UpsertIntegrationObjectMappingInput,
} from '@usertour/gql';

/**
 * `keyTail` is the configured key's last four characters; the key itself is
 * never returned. `consecutiveFailures`/`cooldownUntil`/`autoDisabledAt` are
 * the circuit breaker. `inboundEnabled`/`inboundConfig`/`inboundUrl` are the
 * inbound cohort sync (ADR 0012), independent of `enabled`. `connected`,
 * `remoteAccountId`, `remoteAccountLabel` are the CRM OAuth grant (ADR 0013).
 */
export type Integration = IntegrationFieldsFragment;

/** One synced provider cohort and the segment mirroring it (ADR 0012). */
export type IntegrationSyncedSegment =
  QueryIntegrationSyncedSegmentsQuery['queryIntegrationSyncedSegments'][number];

/** `key` is required on first configure and omitted afterwards to keep the stored key. */
export type UpsertIntegrationInput = UpsertIntegrationInputWire;

export const useListIntegrationsQuery = (
  environmentId: string,
  options?: TypedQueryOptions<ListIntegrationsQuery, ListIntegrationsQueryVariables>,
) => {
  const { data, loading, error, refetch, networkStatus } = useTypedQuery(ListIntegrationsDocument, {
    variables: { environmentId },
    notifyOnNetworkStatusChange: true,
    skip: !environmentId,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const integrations = data?.listIntegrations;
  return { integrations, loading, error, refetch, isRefetching };
};

export const useQueryIntegrationMessagesQuery = (
  integrationId: string,
  pagination: { first?: number; after?: string },
  options?: TypedQueryOptions<
    QueryIntegrationMessagesQuery,
    QueryIntegrationMessagesQueryVariables
  >,
) => {
  const { data, loading, refreshing, error, refetch, networkStatus } = useTypedQuery(
    QueryIntegrationMessagesDocument,
    {
      variables: { integrationId, ...pagination },
      notifyOnNetworkStatusChange: true,
      skip: !integrationId,
      ...options,
    },
  );
  const connection = data?.queryIntegrationMessages;
  const messages: OutboundMessage[] = (connection?.edges ?? []).map((edge) => edge.node);
  return {
    messages,
    totalCount: connection?.totalCount,
    pageInfo: connection?.pageInfo,
    // In-flight `loading`: the accumulator and the reload button gate on it.
    loading: loading || refreshing,
    error,
    refetch,
    isRefetching: networkStatus === NetworkStatus.refetch,
  };
};

export const useUpsertIntegrationMutation = () => {
  // Refetch the list: a first configure INSERTS a row the normalized cache
  // can't materialize from the mutation response; later writes ride the
  // returned full field set either way.
  const [mutation, { loading, error }] = useMutation(UpsertIntegrationDocument, {
    refetchQueries: ['ListIntegrations'],
  });
  const invoke = useCallback(
    async (input: UpsertIntegrationInput): Promise<Integration | null> => {
      const response = await mutation({ variables: { data: input } });
      return response.data?.upsertIntegration ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteIntegrationMutation = () => {
  // Hard delete; refetch evicts the row from the list.
  const [mutation, { loading, error }] = useMutation(DeleteIntegrationDocument, {
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
  options?: TypedQueryOptions<
    QueryIntegrationSyncedSegmentsQuery,
    QueryIntegrationSyncedSegmentsQueryVariables
  >,
) => {
  const { data, loading, refreshing, error, refetch, networkStatus } = useTypedQuery(
    QueryIntegrationSyncedSegmentsDocument,
    {
      variables: { integrationId },
      notifyOnNetworkStatusChange: true,
      skip: !integrationId,
      ...options,
    },
  );
  const syncedSegments = data?.queryIntegrationSyncedSegments;
  return {
    syncedSegments,
    // In-flight `loading`: the cohort list's reload button gates on it.
    loading: loading || refreshing,
    error,
    refetch,
    isRefetching: networkStatus === NetworkStatus.refetch,
  };
};

/** Timeline events of a sync provider (ADR 0013 §8): the switch and the selected milestone set. */
export const useUpdateIntegrationEventsMutation = () => {
  // Returns the changed fields on an existing row, so the normalized cache merges — no refetch.
  const [mutation, { loading, error }] = useMutation(UpdateIntegrationEventsDocument);
  const invoke = useCallback(
    async (
      input: UpdateIntegrationEventsInput,
    ): Promise<UpdateIntegrationEventsMutation['updateIntegrationEvents'] | null> => {
      const response = await mutation({ variables: { data: input } });
      return response.data?.updateIntegrationEvents ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateIntegrationInboundMutation = () => {
  // Returns the changed fields on an EXISTING row (inbound settings only live
  // on configured integrations), so the normalized cache merges — no refetch.
  const [mutation, { loading, error }] = useMutation(UpdateIntegrationInboundDocument);
  // An empty `userIdProperty` clears the override (back to the provider's distinct id).
  const invoke = useCallback(
    async (
      input: UpdateIntegrationInboundInput,
    ): Promise<UpdateIntegrationInboundMutation['updateIntegrationInbound'] | null> => {
      const response = await mutation({ variables: { data: input } });
      return response.data?.updateIntegrationInbound ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useRotateIntegrationInboundTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(RotateIntegrationInboundTokenDocument);
  const invoke = useCallback(
    async (
      id: string,
    ): Promise<RotateIntegrationInboundTokenMutation['rotateIntegrationInboundToken'] | null> => {
      const response = await mutation({ variables: { data: { id } } });
      return response.data?.rotateIntegrationInboundToken ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useSendIntegrationTestEventMutation = () => {
  // Enqueues a single-attempt test message; the outcome lands in the message
  // log, so consumers refetch it after a short delay rather than via cache.
  const [mutation, { loading, error }] = useMutation(SendIntegrationTestEventDocument);
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({ variables: { data: { id } } });
      return !!response.data?.sendIntegrationTestEvent;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useStartIntegrationOAuthMutation = () => {
  // Returns the URL the browser must navigate to next: the provider's authorize
  // URL, or — for a provider-initiated install — the provider's returnUrl
  // carrying our state.
  const [mutation, { loading, error }] = useMutation(StartIntegrationOAuthDocument);
  const invoke = useCallback(
    async (input: StartIntegrationOAuthInput): Promise<string | null> => {
      const response = await mutation({ variables: { data: input } });
      return response.data?.startIntegrationOAuth?.url ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDisconnectIntegrationOAuthMutation = () => {
  const [mutation, { loading, error }] = useMutation(DisconnectIntegrationOAuthDocument);
  const invoke = useCallback(
    async (
      id: string,
    ): Promise<DisconnectIntegrationOAuthMutation['disconnectIntegrationOAuth'] | null> => {
      const response = await mutation({ variables: { data: { id } } });
      return response.data?.disconnectIntegrationOAuth ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

// ---------------------------------------------------------------------------
// CRM object mappings (ADR 0013 §4-6)
// ---------------------------------------------------------------------------

export type IntegrationObjectMapping = IntegrationObjectMappingFieldsFragment;

/**
 * One sync run: a full round over a mapping, or a journal poll's inbound
 * changes. `remoteIds` is the provider record ids a journal run touched,
 * capped server-side.
 */
export type IntegrationSyncRun = ListIntegrationSyncRunsQuery['listIntegrationSyncRuns'][number];

export type IntegrationRemoteProperty =
  ListIntegrationRemotePropertiesQuery['listIntegrationRemoteProperties'][number];

export type { UpsertIntegrationObjectMappingInput };

export const useListIntegrationObjectMappingsQuery = (
  integrationId: string,
  options?: TypedQueryOptions<
    ListIntegrationObjectMappingsQuery,
    ListIntegrationObjectMappingsQueryVariables
  >,
) => {
  const { data, loading, error, refetch, startPolling, stopPolling } = useTypedQuery(
    ListIntegrationObjectMappingsDocument,
    {
      variables: { integrationId },
      skip: !integrationId,
      ...options,
    },
  );
  return {
    mappings: data?.listIntegrationObjectMappings,
    loading,
    error,
    refetch,
    startPolling,
    stopPolling,
  };
};

export const useListIntegrationSyncRunsQuery = (
  integrationId: string,
  options?: TypedQueryOptions<ListIntegrationSyncRunsQuery, ListIntegrationSyncRunsQueryVariables>,
) => {
  const { data, loading, error, refetch, startPolling, stopPolling } = useTypedQuery(
    ListIntegrationSyncRunsDocument,
    {
      variables: { integrationId },
      skip: !integrationId,
      ...options,
    },
  );
  return {
    runs: data?.listIntegrationSyncRuns,
    loading,
    error,
    refetch,
    startPolling,
    stopPolling,
  };
};

export const useListIntegrationRemotePropertiesQuery = (
  integrationId: string,
  remoteObject: SyncRemoteObject,
  options?: TypedQueryOptions<
    ListIntegrationRemotePropertiesQuery,
    ListIntegrationRemotePropertiesQueryVariables
  >,
) => {
  const { data, loading, error, refetch } = useTypedQuery(ListIntegrationRemotePropertiesDocument, {
    variables: { integrationId, remoteObject },
    skip: !integrationId,
    fetchPolicy: 'network-only',
    ...options,
  });
  return {
    properties: data?.listIntegrationRemoteProperties,
    loading,
    error,
    refetch,
  };
};

export const useUpsertIntegrationObjectMappingMutation = () => {
  // A first save INSERTS a row the cache can't materialize from the response;
  // later saves ride the returned full field set.
  const [mutation, { loading, error }] = useMutation(UpsertIntegrationObjectMappingDocument, {
    // Attributes change ownership with the mapping (provider marks).
    refetchQueries: ['ListIntegrationObjectMappings', 'listAttributes'],
  });
  const invoke = useCallback(
    async (
      input: UpsertIntegrationObjectMappingInput,
    ): Promise<IntegrationObjectMapping | null> => {
      const response = await mutation({ variables: { data: input } });
      return response.data?.upsertIntegrationObjectMapping ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteIntegrationObjectMappingMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteIntegrationObjectMappingDocument, {
    // Attributes change ownership with the mapping (provider marks).
    refetchQueries: ['ListIntegrationObjectMappings', 'listAttributes'],
  });
  const invoke = useCallback(
    async (input: { integrationId: string; id: string }): Promise<boolean> => {
      const response = await mutation({ variables: { data: input } });
      return !!response.data?.deleteIntegrationObjectMapping;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useRunIntegrationObjectMappingSyncMutation = () => {
  const [mutation, { loading, error }] = useMutation(RunIntegrationObjectMappingSyncDocument);
  const invoke = useCallback(
    async (input: {
      integrationId: string;
      id: string;
    }): Promise<IntegrationObjectMapping | null> => {
      const response = await mutation({ variables: { data: input } });
      return response.data?.runIntegrationObjectMappingSync ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};
