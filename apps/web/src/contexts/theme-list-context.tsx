import { useListThemesQuery } from '@usertour/hooks';
import { Theme } from '@usertour/types';
import { ReactNode, createContext, useContext } from 'react';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

export interface ThemeListProviderProps {
  children?: ReactNode;
  projectId: string | undefined;
}

export interface ThemeListContextValue {
  themeList: Theme[] | null;
  refetch: any;
  loading: boolean;
  isRefetching: boolean;
}
export const ThemeListContext = createContext<ThemeListContextValue | undefined>(undefined);

export function ThemeListProvider(props: ThemeListProviderProps): JSX.Element {
  const { children, projectId } = props;
  // SHARED_CACHE_QUERY_OPTIONS so content-detail-builder's theme picker
  // reflects useDeleteThemeMutation's cache.evict — without it the global
  // no-cache default keeps this observable isolated.
  const { themeList, refetch, loading, isRefetching } = useListThemesQuery(
    projectId,
    SHARED_CACHE_QUERY_OPTIONS,
  );

  const value: ThemeListContextValue = {
    themeList,
    refetch,
    loading,
    isRefetching,
  };

  return <ThemeListContext.Provider value={value}>{children}</ThemeListContext.Provider>;
}

export function useThemeListContext(): ThemeListContextValue {
  const context = useContext(ThemeListContext);
  if (!context) {
    throw new Error('useThemeListContext must be used within a ThemeListProvider.');
  }
  return context;
}
