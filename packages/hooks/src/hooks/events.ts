import { NetworkStatus, type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  createEvent,
  deleteEvent,
  listAttributeOnEvents,
  listEvents,
  updateEvent,
} from '@usertour/gql';
import type { Event } from '@usertour/types';

export interface CreateEventInput {
  projectId: string;
  displayName: string;
  codeName: string;
  description: string;
  attributeIds: string[];
}

export interface UpdateEventInput {
  id: string;
  displayName: string;
  codeName: string;
  description: string;
  attributeIds: string[];
}

export const useCreateEventMutation = () => {
  const [mutation, { loading, error }] = useMutation(createEvent);
  // Server response only carries `{ id }`; the caller already has
  // `displayName` / `codeName` from form values if it needs them.
  const invoke = async (data: CreateEventInput): Promise<string | null> => {
    const response = await mutation({ variables: { data } });
    return response.data?.createEvent?.id ?? null;
  };
  return { invoke, loading, error };
};

export const useUpdateEventMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateEvent);
  const invoke = async (data: UpdateEventInput): Promise<boolean> => {
    const response = await mutation({ variables: { data } });
    return !!response.data?.updateEvent?.id;
  };
  return { invoke, loading, error };
};

export const useDeleteEventMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteEvent);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteEvent?.id;
  };
  return { invoke, loading, error };
};

export const useListEventsQuery = (projectId: string | undefined, options?: QueryHookOptions) => {
  const { data, refetch, loading, error, networkStatus } = useQuery(listEvents, {
    variables: { projectId, bizType: 0 },
    notifyOnNetworkStatusChange: true,
    skip: !projectId,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const eventList = data?.listEvents as Event[] | undefined;
  return { eventList, refetch, loading, error, isRefetching };
};

export const useListAttributeOnEventsQuery = (eventId: string | undefined) => {
  const { data, loading, error } = useQuery(listAttributeOnEvents, {
    variables: { eventId },
    skip: !eventId,
  });
  const attributeOnEvents = data?.listAttributeOnEvents as
    | { id: string; eventId: string; attributeId: string }[]
    | undefined;
  return { attributeOnEvents, loading, error };
};
