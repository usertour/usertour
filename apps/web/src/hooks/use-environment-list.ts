import { useGetUserEnvironmentsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';

// Thin app-level wrapper. SHARED_CACHE participation is required so
// the env switcher (admin-env-switcher) reflects evicts from
// `useDeleteEnvironmentsMutation` — without it the global no-cache
// default would isolate this query and leave a deleted env still
// visible in the picker.
export const useEnvironmentList = () => {
  const { project } = useAppContext();
  return useGetUserEnvironmentsQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
};
