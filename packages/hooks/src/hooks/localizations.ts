import { useMutation } from '@apollo/client';
import {
  createLocalization,
  deleteLocalization,
  setDefaultLocalization,
  updateLocalization,
} from '@usertour/gql';

export interface CreateLocalizationInput {
  projectId: string;
  locale: string;
  name: string;
  code: string;
}

export interface UpdateLocalizationInput {
  id: string;
  locale: string;
  name: string;
  code: string;
}

export const useCreateLocalizationMutation = () => {
  const [mutation, { loading, error }] = useMutation(createLocalization, {
    refetchQueries: ['listLocalizations'],
  });
  const invoke = async (input: CreateLocalizationInput): Promise<boolean> => {
    const response = await mutation({ variables: { data: input } });
    return !!response.data?.createLocalization?.id;
  };
  return { invoke, loading, error };
};

export const useUpdateLocalizationMutation = () => {
  // Auto-merged by Apollo via __typename:id.
  const [mutation, { loading, error }] = useMutation(updateLocalization);
  const invoke = async (input: UpdateLocalizationInput): Promise<boolean> => {
    const response = await mutation({ variables: { data: input } });
    return !!response.data?.updateLocalization?.id;
  };
  return { invoke, loading, error };
};

export const useDeleteLocalizationMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteLocalization);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({
      variables: { id },
      update(cache) {
        cache.evict({ id: cache.identify({ __typename: 'Localization', id }) });
        cache.gc();
      },
    });
    return !!response.data?.deleteLocalization?.id;
  };
  return { invoke, loading, error };
};

export const useSetDefaultLocalizationMutation = () => {
  // The mutation flips `isDefault` on two rows (the old default → false,
  // the new one → true). Server response only carries the new default's
  // id, so refetch the list to pick up the demoted previous default.
  const [mutation, { loading, error }] = useMutation(setDefaultLocalization, {
    refetchQueries: ['listLocalizations'],
  });
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.setDefaultLocalization?.id;
  };
  return { invoke, loading, error };
};
