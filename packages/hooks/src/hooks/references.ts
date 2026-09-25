import { type QueryHookOptions, useQuery } from '@apollo/client';
import { listDefinitionReferences } from '@usertour/gql';
import type { DefinitionReference, DefinitionReferenceKind } from '@usertour/types';

/**
 * What still uses a definition. Always read from the network: it answers
 * "can this be deleted right now", which a cached answer can't.
 */
export const useListDefinitionReferencesQuery = (
  projectId: string | undefined,
  kind: DefinitionReferenceKind,
  id: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, loading, error } = useQuery(listDefinitionReferences, {
    variables: { projectId, kind, id },
    fetchPolicy: 'network-only',
    skip: !projectId || !id,
    ...options,
  });
  const references = data?.listDefinitionReferences as DefinitionReference[] | undefined;
  return { references, loading, error };
};
