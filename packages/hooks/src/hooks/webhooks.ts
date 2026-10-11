import { useCallback } from 'react';
import { NetworkStatus, useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { OutboundDelivery, OutboundMessage } from './outbound-message';
import type { Refined } from './refined';
import {
  CreateWebhookDocument,
  type CreateWebhookInput,
  DeleteWebhookDocument,
  GetWebhookDocument,
  type GetWebhookQuery,
  type GetWebhookQueryVariables,
  ListWebhooksDocument,
  type ListWebhooksQuery,
  type ListWebhooksQueryVariables,
  QueryWebhookMessagesDocument,
  type QueryWebhookMessagesQuery,
  type QueryWebhookMessagesQueryVariables,
  ResendWebhookMessageDocument,
  RotateWebhookSecretDocument,
  SendWebhookTestEventDocument,
  UpdateWebhookDocument,
  type UpdateWebhookInput,
  type WebhookFieldsFragment,
} from '@usertour/gql';

/**
 * `topics`: "*", a family prefix ("event.tracked", "content", "user",
 * "company"), or an exact topic. On the wire it is a JSON scalar.
 */
export type Webhook = Refined<WebhookFieldsFragment, { topics: string[] }>;

/**
 * The detail read: the secret is plaintext here and on create/rotate, masked
 * (null) on the list; '' = the stored value could not be decrypted.
 */
export type WebhookWithSecret = Refined<GetWebhookQuery['getWebhook'], { topics: string[] }>;

// The message-log shapes are the shared outbound ledger's — identical for
// both transports (see outbound-message.ts); these aliases keep the
// webhook-flavored names the consumers import.
export type WebhookDelivery = OutboundDelivery;
export type WebhookMessage = OutboundMessage;

export type { CreateWebhookInput, UpdateWebhookInput };

export const useListWebhooksQuery = (
  environmentId: string,
  options?: TypedQueryOptions<ListWebhooksQuery, ListWebhooksQueryVariables>,
) => {
  const { data, loading, error, refetch, networkStatus } = useTypedQuery(ListWebhooksDocument, {
    variables: { environmentId },
    notifyOnNetworkStatusChange: true,
    skip: !environmentId,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const webhooks = data?.listWebhooks as Webhook[] | undefined;
  return { webhooks, loading, error, refetch, isRefetching };
};

export const useGetWebhookQuery = (
  id: string,
  options?: TypedQueryOptions<GetWebhookQuery, GetWebhookQueryVariables>,
) => {
  const { data, loading, error, refetch } = useTypedQuery(GetWebhookDocument, {
    variables: { id },
    skip: !id,
    ...options,
  });
  const webhook = data?.getWebhook as WebhookWithSecret | undefined;
  return { webhook, loading, error, refetch };
};

export const useQueryWebhookMessagesQuery = (
  webhookId: string,
  pagination: { first?: number; after?: string },
  options?: TypedQueryOptions<QueryWebhookMessagesQuery, QueryWebhookMessagesQueryVariables>,
) => {
  const { data, loading, refreshing, error, refetch, networkStatus } = useTypedQuery(
    QueryWebhookMessagesDocument,
    {
      variables: { webhookId, ...pagination },
      notifyOnNetworkStatusChange: true,
      skip: !webhookId,
      ...options,
    },
  );
  const connection = data?.queryWebhookMessages;
  const messages: WebhookMessage[] = (connection?.edges ?? []).map((edge) => edge.node);
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

export const useCreateWebhookMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateWebhookDocument, {
    refetchQueries: ['ListWebhooks'],
  });
  const invoke = useCallback(
    async (input: CreateWebhookInput): Promise<Webhook | null> => {
      const response = await mutation({ variables: { data: input } });
      return (response.data?.createWebhook as Webhook | undefined) ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateWebhookMutation = () => {
  // No refetch: the mutation returns every field the server may change (incl.
  // the breaker reset), so the normalized cache propagates it.
  const [mutation, { loading, error }] = useMutation(UpdateWebhookDocument);
  const invoke = useCallback(
    async (input: UpdateWebhookInput): Promise<Webhook | null> => {
      const response = await mutation({ variables: { data: input } });
      return (response.data?.updateWebhook as Webhook | undefined) ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteWebhookMutation = () => {
  // Hard delete; refetch evicts the row from the list.
  const [mutation, { loading, error }] = useMutation(DeleteWebhookDocument, {
    refetchQueries: ['ListWebhooks'],
  });
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({ variables: { data: { id } } });
      return !!response.data?.deleteWebhook;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useSendWebhookTestEventMutation = () => {
  // Enqueues a single-attempt test message; the outcome lands in the delivery
  // log, so consumers refetch it after a short delay rather than via cache.
  const [mutation, { loading, error }] = useMutation(SendWebhookTestEventDocument);
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({ variables: { data: { id } } });
      return !!response.data?.sendWebhookTestEvent;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useRotateWebhookSecretMutation = () => {
  // Mints a new signing secret on the same record; in-flight retries pick it
  // up server-side.
  // No refetch: the mutation returns id + secret + updatedAt, which is the
  // full set of fields rotation changes — the cache merges them in place.
  const [mutation, { loading, error }] = useMutation(RotateWebhookSecretDocument);
  const invoke = useCallback(
    async (id: string): Promise<string | null> => {
      const response = await mutation({ variables: { data: { id } } });
      return response.data?.rotateWebhookSecret?.secret ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useResendWebhookMessageMutation = () => {
  // Re-queues the stored payload as a single attempt; the outcome lands in the
  // message log, so consumers refetch it after a short delay.
  const [mutation, { loading, error }] = useMutation(ResendWebhookMessageDocument);
  const invoke = useCallback(
    async (webhookId: string, messageId: string): Promise<boolean> => {
      const response = await mutation({ variables: { data: { webhookId, messageId } } });
      return !!response.data?.resendWebhookMessage;
    },
    [mutation],
  );
  return { invoke, loading, error };
};
