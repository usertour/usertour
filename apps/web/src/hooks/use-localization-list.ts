import { useListLocalizationsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';

// Thin app-level wrapper. Same pattern as `useEventList`.
export const useLocalizationList = () => {
  const { project } = useAppContext();
  return useListLocalizationsQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
};
