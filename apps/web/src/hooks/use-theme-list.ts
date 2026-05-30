import { useListThemesQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';

// Thin app-level wrapper. Same pattern as `useAttributeList`.
//
// Note: `packages/contexts/.../theme-list-context.tsx` is a separate
// Context used by `packages/builder`. This wrapper replaces only the
// apps/web one; v0.8.6 will retire the packages-side Context.
export const useThemeList = () => {
  const { project } = useAppContext();
  return useListThemesQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
};
