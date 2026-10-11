import { useCallback } from 'react';
import { NetworkStatus, useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { OutboundDelivery, OutboundMessage, OutboundMessageStatus } from './outbound-message';
import {
  CreateWebhookDocument,
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
} from '@usertour/gql';

export interface Webhook {
  id: string;
  createdAt: string;
  updatedAt: string;
  environmentId: string;
  url: string;
  /** Subscribed topics: "*", a family prefix ("event.tracked", "content", "user", "company"), or an exact topic. */
  topics: string[];
  enabled: boolean;
  /** Plaintext on get/create/rotate; NULL on list/delete (masked); '' = stored value undecryptable. */
  secret?: string | null;
  description?: string | null;
  /** Circuit-breaker streak: consecutive failed delivery attempts (any success resets). */
  consecutiveFailures: number;
  /** While in the future, deliveries are held and sent after the window (cooldown). */
  cooldownUntil?: string | null;
  /** Set when the SYSTEM disabled the endpoint after sustained failure. */
  autoDisabledAt?: string | null;
}

// The message-log shapes are the shared outbound ledger's — identical for
// both transports (see outbound-message.ts); these aliases keep the
// webhook-flavored names the consumers import.
export type WebhookDelivery = OutboundDelivery;
export type WebhookMessageStatus = OutboundMessageStatus;
export type WebhookMessage = OutboundMessage;

export interface CreateWebhookInput {
  environmentId: string;
  url: string;
  topics: string[];
  enabled?: boolean;
  description?: string;
}

export interface UpdateWebhookInput {
  id: string;
  url?: string;
  topics?: string[];
  enabled?: boolean;
  description?: string;
}

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
  const webhook = data?.getWebhook as Webhook | undefined;
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
  const messages = (connection?.edges ?? []).map((edge) => edge.node) as WebhookMessage[];
  return {
    messages,
    totalCount: connection?.totalCount as number | undefined,
    pageInfo: connection?.pageInfo as
      | { endCursor: string | null; hasNextPage: boolean }
      | undefined,
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
      return (response.data?.rotateWebhookSecret?.secret as string | undefined) ?? null;
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
