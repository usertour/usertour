import { useListThemesQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';

// Thin app-level wrapper. Same pattern as `useAttributeList`.
export const useThemeList = () => {
  const { project } = useAppContext();
  return useListThemesQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
};

// The project's default theme — the single source for "what a version falls
// back to when it has no themeId of its own".
export const useDefaultTheme = () => {
  const { themeList } = useThemeList();
  return themeList?.find((theme) => theme.isDefault === true);
};
