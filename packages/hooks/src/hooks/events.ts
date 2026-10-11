import { NetworkStatus, useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { Event } from '@usertour/types';
import {
  CreateEventDocument,
  type CreateEventInput,
  DeleteEventDocument,
  ListAttributeOnEventsDocument,
  type ListAttributeOnEventsQuery,
  type ListAttributeOnEventsQueryVariables,
  ListEventsDocument,
  type ListEventsQuery,
  type ListEventsQueryVariables,
  UpdateEventDocument,
  type UpdateEventInput,
} from '@usertour/gql';

export type { CreateEventInput, UpdateEventInput };

export const useCreateEventMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateEventDocument, {
    // Server response only carries `{ id }`; refetch the list by
    // operation name so the new row appears without each caller having
    // to thread `refetch` props down.
    refetchQueries: ['listEvents'],
  });
  const invoke = async (data: CreateEventInput): Promise<string | null> => {
    const response = await mutation({ variables: { data } });
    return response.data?.createEvent?.id ?? null;
  };
  return { invoke, loading, error };
};

export const useUpdateEventMutation = () => {
  // Apollo's normalized cache merges the response into the existing
  // Event entity by `__typename:id`; no `update` callback needed.
  const [mutation, { loading, error }] = useMutation(UpdateEventDocument);
  const invoke = async (data: UpdateEventInput): Promise<boolean> => {
    const response = await mutation({ variables: { data } });
    return !!response.data?.updateEvent?.id;
  };
  return { invoke, loading, error };
};

export const useDeleteEventMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteEventDocument, {
    update(cache, { data }) {
      const id = data?.deleteEvent?.id;
      if (!id) {
        return;
      }
      // Server's @ObjectType is `class Events` (plural), so Apollo
      // caches under `Events:{id}` — using 'Event' silently misses.
      cache.evict({ id: cache.identify({ __typename: 'Events', id }) });
      cache.gc();
    },
  });
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteEvent?.id;
  };
  return { invoke, loading, error };
};

export const useListEventsQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<ListEventsQuery, ListEventsQueryVariables>,
) => {
  const { data, refetch, loading, error, networkStatus } = useTypedQuery(ListEventsDocument, {
    variables: { projectId: projectId!, bizType: 0 },
    notifyOnNetworkStatusChange: true,
    skip: !projectId,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const eventList = data?.listEvents as Event[] | undefined;
  return { eventList, refetch, loading, error, isRefetching };
};

export const useListAttributeOnEventsQuery = (
  eventId: string | undefined,
  options?: TypedQueryOptions<ListAttributeOnEventsQuery, ListAttributeOnEventsQueryVariables>,
) => {
  const { data, loading, error } = useTypedQuery(ListAttributeOnEventsDocument, {
    variables: { eventId: eventId! },
    skip: !eventId,
    ...options,
  });
  const attributeOnEvents = data?.listAttributeOnEvents;
  return { attributeOnEvents, loading, error };
};
