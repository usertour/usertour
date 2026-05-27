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
  const [mutation, { loading, error }] = useMutation(createLocalization);
  const invoke = async (input: CreateLocalizationInput): Promise<boolean> => {
    const response = await mutation({ variables: { data: input } });
    return !!response.data?.createLocalization?.id;
  };
  return { invoke, loading, error };
};

export const useUpdateLocalizationMutation = () => {
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
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteLocalization?.id;
  };
  return { invoke, loading, error };
};

export const useSetDefaultLocalizationMutation = () => {
  const [mutation, { loading, error }] = useMutation(setDefaultLocalization);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.setDefaultLocalization?.id;
  };
  return { invoke, loading, error };
};
