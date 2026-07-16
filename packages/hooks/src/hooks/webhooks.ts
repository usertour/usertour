import { NetworkStatus, type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  CreateWebhook,
  DeleteWebhook,
  GetWebhook,
  ListWebhooks,
  QueryWebhookDeliveries,
  RotateWebhookSecret,
  SendWebhookTestEvent,
  UpdateWebhook,
} from '@usertour/gql';

export interface Webhook {
  id: string;
  createdAt: string;
  updatedAt: string;
  environmentId: string;
  url: string;
  /** Subscribed topics: "*" | "event.tracked" | "event.tracked.<codeName>". */
  topics: string[];
  enabled: boolean;
  /** Present on the detail query only — the list query doesn't select it. */
  secret?: string;
  description?: string | null;
}

export interface WebhookDelivery {
  id: string;
  createdAt: string;
  /** Stable across retries of the same message. */
  messageId: string;
  topic: string;
  attempt: number;
  success: boolean;
  responseStatus?: number | null;
  error?: string | null;
  durationMs?: number | null;
}

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

export const useListWebhooksQuery = (environmentId: string, options?: QueryHookOptions) => {
  const { data, loading, error, refetch, networkStatus } = useQuery(ListWebhooks, {
    variables: { environmentId },
    notifyOnNetworkStatusChange: true,
    skip: !environmentId,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const webhooks = data?.listWebhooks as Webhook[] | undefined;
  return { webhooks, loading, error, refetch, isRefetching };
};

export const useGetWebhookQuery = (id: string, options?: QueryHookOptions) => {
  const { data, loading, error, refetch } = useQuery(GetWebhook, {
    variables: { id },
    skip: !id,
    ...options,
  });
  const webhook = data?.getWebhook as Webhook | undefined;
  return { webhook, loading, error, refetch };
};

export const useQueryWebhookDeliveriesQuery = (
  webhookId: string,
  pagination: { first?: number; after?: string },
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch, networkStatus } = useQuery(QueryWebhookDeliveries, {
    variables: { webhookId, ...pagination },
    notifyOnNetworkStatusChange: true,
    skip: !webhookId,
    ...options,
  });
  const connection = data?.queryWebhookDeliveries;
  const deliveries = (connection?.edges ?? []).map(
    (edge: { node: WebhookDelivery }) => edge.node,
  ) as WebhookDelivery[];
  return {
    deliveries,
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

export const useCreateWebhookMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateWebhook, {
    refetchQueries: ['ListWebhooks'],
  });
  const invoke = async (input: CreateWebhookInput): Promise<Webhook | null> => {
    const response = await mutation({ variables: { data: input } });
    return (response.data?.createWebhook as Webhook | undefined) ?? null;
  };
  return { invoke, loading, error };
};

export const useUpdateWebhookMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateWebhook, {
    refetchQueries: ['ListWebhooks', 'GetWebhook'],
  });
  const invoke = async (input: UpdateWebhookInput): Promise<Webhook | null> => {
    const response = await mutation({ variables: { data: input } });
    return (response.data?.updateWebhook as Webhook | undefined) ?? null;
  };
  return { invoke, loading, error };
};

export const useDeleteWebhookMutation = () => {
  // Hard delete; refetch evicts the row from the list.
  const [mutation, { loading, error }] = useMutation(DeleteWebhook, {
    refetchQueries: ['ListWebhooks'],
  });
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { data: { id } } });
    return !!response.data?.deleteWebhook;
  };
  return { invoke, loading, error };
};

export const useSendWebhookTestEventMutation = () => {
  // Enqueues a single-attempt test message; the outcome lands in the delivery
  // log, so consumers refetch it after a short delay rather than via cache.
  const [mutation, { loading, error }] = useMutation(SendWebhookTestEvent);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { data: { id } } });
    return !!response.data?.sendWebhookTestEvent;
  };
  return { invoke, loading, error };
};

export const useRotateWebhookSecretMutation = () => {
  // Mints a new signing secret on the same record; in-flight retries pick it
  // up server-side. Refetch so the detail page shows the new value.
  const [mutation, { loading, error }] = useMutation(RotateWebhookSecret, {
    refetchQueries: ['GetWebhook'],
  });
  const invoke = async (id: string): Promise<string | null> => {
    const response = await mutation({ variables: { data: { id } } });
    return (response.data?.rotateWebhookSecret?.secret as string | undefined) ?? null;
  };
  return { invoke, loading, error };
};
