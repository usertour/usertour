import { useListEventsQuery } from '@usertour-packages/shared-hooks';
import { Event } from '@usertour/types';
import { ReactNode, createContext, useContext } from 'react';

export interface EventListProviderProps {
  children?: ReactNode;
  projectId: string | undefined;
}

export interface EventListContextValue {
  eventList: Event[] | undefined;
  refetch: any;
  loading: boolean;
  isRefetching: boolean;
}
export const EventListContext = createContext<EventListContextValue | undefined>(undefined);

export function EventListProvider(props: EventListProviderProps): JSX.Element {
  const { children, projectId } = props;
  const { eventList, refetch, loading, isRefetching } = useListEventsQuery(projectId);
  const value: EventListContextValue = {
    eventList,
    refetch,
    loading,
    isRefetching,
  };
  return <EventListContext.Provider value={value}>{children}</EventListContext.Provider>;
}

export function useEventListContext(): EventListContextValue {
  const context = useContext(EventListContext);
  if (!context) {
    throw new Error('useEventListContext must be used within a EventListProvider.');
  }
  return context;
}
