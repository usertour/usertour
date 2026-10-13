import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import type { AttributeBizTypes } from '@usertour/types';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  type UpdateAttributeInput,
  CreateAttributeDocument,
  DeleteAttributeDocument,
  ListAttributesDocument,
  type ListAttributesQuery,
  type ListAttributesQueryVariables,
  UpdateAttributeDocument,
  type CreateAttributeInput as CreateAttributeInputWire,
} from '../graphql';

// Domain wrappers for `attributes.graphql`: attribute definitions.

/** `randomMax` is the upper bound of a Random number attribute (ADR 0020); required for that type only. */
export type CreateAttributeInput = CreateAttributeInputWire;

export const useCreateAttributeMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateAttributeDocument, {
    refetchQueries: ['listAttributes'],
  });
  const invoke = useCallback(
    async (data: CreateAttributeInput) => {
      const response = await mutation({ variables: { data } });
      return response.data?.createAttribute;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useListAttributesQuery = (
  projectId: string,
  bizType: AttributeBizTypes,
  options?: TypedQueryOptions<ListAttributesQuery, ListAttributesQueryVariables>,
) => {
  const { data, loading, error, refetch } = useTypedQuery(ListAttributesDocument, {
    variables: { projectId, bizType },
    ...options,
  });
  const attributes = data?.listAttributes;
  return { attributes, loading, error, refetch };
};

export const useDeleteAttributeMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteAttributeDocument);
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({
        variables: { id },
        update(cache) {
          cache.evict({ id: cache.identify({ __typename: 'Attribute', id }) });
          cache.gc();
        },
      });
      return !!response.data?.deleteAttribute?.id;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export type { UpdateAttributeInput };

export const useUpdateAttributeMutation = () => {
  // Auto-merged by Apollo via __typename:id.
  const [mutation, { loading, error }] = useMutation(UpdateAttributeDocument);
  const invoke = useCallback(
    async (data: UpdateAttributeInput): Promise<boolean> => {
      const response = await mutation({ variables: { data } });
      return !!response.data?.updateAttribute?.id;
    },
    [mutation],
  );
  return { invoke, loading, error };
};
