import { useListThemesQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';

// Thin app-level wrapper. Same pattern as `useAttributeList`.
export const useThemeList = () => {
  const { project } = useAppContext();
  return useListThemesQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
};
