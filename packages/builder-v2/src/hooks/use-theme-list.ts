import { useQuery } from '@apollo/client';
import { listThemes } from '@usertour/gql';
import type { Theme } from '@usertour/types';
import { useProjectId } from '../core';

// Direct Apollo replacement for `useThemeListContext` — same query
// (`listThemes`), same shape consumers destructure (`{ themeList,
// loading }`). projectId is immutable config (set at Provider mount),
// so the query fires on mount. Apollo's normalized cache deduplicates
// the request across all consumers, so adding more call sites doesn't
// add network traffic.

export const useThemeList = () => {
  const projectId = useProjectId();
  const { data, loading } = useQuery(listThemes, {
    variables: { projectId },
  });
  return {
    themeList: (data?.listThemes ?? null) as Theme[] | null,
    loading,
  };
};
