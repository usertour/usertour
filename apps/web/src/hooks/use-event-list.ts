import { useListEventsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';

// Thin app-level wrapper. Pulls projectId from `useAppContext` so the
// ~4 consumers don't repeat the boilerplate, and bakes in shared-cache
// participation so the event list / detail consumers reflect mutations
// without a Provider hop.
export const useEventList = () => {
  const { project } = useAppContext();
  return useListEventsQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
};
