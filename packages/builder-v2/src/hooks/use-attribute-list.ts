import { useQuery } from '@apollo/client';
import { listAttributes } from '@usertour/gql';
import type { Attribute } from '@usertour/types';
import { useBuilderStore } from '../contexts/builder-context';

// Direct Apollo replacement for `useAttributeListContext`. Mirrors the
// upstream Provider's `useQuery(listAttributes, { projectId,
// bizType: 0 })`. bizType: 0 = user attributes (the only kind the
// builder consumes today).

export const useAttributeList = () => {
  const projectId = useBuilderStore((state) => state.projectId);
  const { data, loading } = useQuery(listAttributes, {
    variables: { projectId, bizType: 0 },
    skip: !projectId,
  });
  return {
    attributeList: (data?.listAttributes ?? undefined) as Attribute[] | undefined,
    loading,
  };
};
