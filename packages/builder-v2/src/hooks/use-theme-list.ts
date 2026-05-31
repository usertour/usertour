import { useQuery } from '@apollo/client';
import { listThemes } from '@usertour/gql';
import type { Theme } from '@usertour/types';
import { useBuilderStore } from '../contexts/builder-context';

// Direct Apollo replacement for `useThemeListContext` — same query
// (`listThemes`), same shape consumers destructure (`{ themeList,
// loading }`). projectId comes from the Zustand store rather than a
// Provider prop. Apollo's normalized cache deduplicates the request
// across all consumers, so adding more call sites doesn't add
// network traffic.

export const useThemeList = () => {
  const projectId = useBuilderStore((state) => state.projectId);
  const { data, loading } = useQuery(listThemes, {
    variables: { projectId },
    skip: !projectId,
  });
  return {
    themeList: (data?.listThemes ?? null) as Theme[] | null,
    loading,
  };
};
