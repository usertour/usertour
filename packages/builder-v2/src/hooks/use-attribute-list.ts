import { useQuery } from '@apollo/client';
import { listAttributes } from '@usertour/gql';
import type { Attribute } from '@usertour/types';
import { useProjectId } from '../contexts/builder-context';

// Direct Apollo replacement for `useAttributeListContext`. Mirrors the
// upstream Provider's `useQuery(listAttributes, { projectId,
// bizType: 0 })`. bizType: 0 = user attributes (the only kind the
// builder consumes today). projectId is immutable config (set at
// Provider mount), so the query fires on mount — no skip guard.

export const useAttributeList = () => {
  const projectId = useProjectId();
  const { data, loading } = useQuery(listAttributes, {
    variables: { projectId, bizType: 0 },
  });
  return {
    attributeList: (data?.listAttributes ?? undefined) as Attribute[] | undefined,
    loading,
  };
};
