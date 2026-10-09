import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { DefinitionReference, DefinitionReferenceKind } from '@usertour/types';
import {
  ListDefinitionReferencesDocument,
  type ListDefinitionReferencesQuery,
  type ListDefinitionReferencesQueryVariables,
} from '@usertour/gql';

/**
 * What still uses a definition. Always read from the network: it answers
 * "can this be deleted right now", which a cached answer can't.
 */
export const useListDefinitionReferencesQuery = (
  projectId: string | undefined,
  kind: DefinitionReferenceKind,
  id: string | undefined,
  options?: TypedQueryOptions<
    ListDefinitionReferencesQuery,
    ListDefinitionReferencesQueryVariables
  >,
) => {
  const { data, loading, error } = useTypedQuery(ListDefinitionReferencesDocument, {
    variables: { projectId: projectId!, kind, id: id! },
    fetchPolicy: 'network-only',
    skip: !projectId || !id,
    ...options,
  });
  const references = data?.listDefinitionReferences as DefinitionReference[] | undefined;
  return { references, loading, error };
};
