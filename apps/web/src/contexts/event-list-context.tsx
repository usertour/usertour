import { ReactNode, createContext, useContext } from "react";
import { useQuery } from "@apollo/client";
import { listEvents } from "@usertour-ui/gql";
import { Event } from "@usertour-ui/types";

export interface EventListProviderProps {
  children?: ReactNode;
  projectId: string | undefined;
}

export interface EventListContextValue {
  eventList: Event[] | undefined;
  refetch: any;
  loading: boolean;
}
export const EventListContext = createContext<
  EventListContextValue | undefined
>(undefined);

export function EventListProvider(props: EventListProviderProps): JSX.Element {
  const { children, projectId } = props;
  const { data, refetch, loading } = useQuery(listEvents, {
    variables: { projectId: projectId, bizType: 0 },
  });
  const eventList = data && data.listEvents;
  const value: EventListContextValue = {
    eventList,
    refetch,
    loading,
  };
  return (
    <EventListContext.Provider value={value}>
      {children}
    </EventListContext.Provider>
  );
}

export function useEventListContext(): EventListContextValue {
  const context = useContext(EventListContext);
  if (!context) {
    throw new Error(
      `useEventListContext must be used within a EventListProvider.`
    );
  }
  return context;
}
