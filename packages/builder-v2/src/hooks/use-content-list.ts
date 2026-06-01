import { useQuery } from '@apollo/client';
import { queryContent } from '@usertour/gql';
import type { Content } from '@usertour/types';
import { useBuilderStore } from '../contexts/builder-context';

// Direct Apollo replacement for `useContentListContext` — narrower
// surface than the upstream Provider because builder consumers only
// read the flat `contents` array. The upstream Provider's cursor-
// pagination state machine isn't used here (the builder mounts it
// with pageSize: 1000 which effectively disables pagination); first:
// 1000 inline matches that behavior. environmentId comes from the
// Zustand store, queried after useBuilderInit has set it (skip until
// then).

export const useContentList = () => {
  const environmentId = useBuilderStore((state) => state.environmentId);
  const { data, loading } = useQuery(queryContent, {
    variables: {
      first: 1000,
      query: { environmentId },
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
    skip: !environmentId,
  });
  const contents: Content[] = (data?.queryContent?.edges ?? []).map((edge: any) => ({
    ...edge.node,
  }));
  return { contents, loading };
};
