import { NetworkStatus, type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  copyTheme,
  createTheme,
  deleteTheme,
  listThemes,
  setDefaultTheme,
  updateTheme,
} from '@usertour/gql';
import type { Theme, ThemeTypesSetting, ThemeVariation } from '@usertour/types';

export interface CreateThemeInput {
  name: string;
  projectId: string;
  settings: unknown;
  isDefault: boolean;
}

export interface UpdateThemeInput {
  id: string;
  name: string;
  settings: ThemeTypesSetting;
  variations: ThemeVariation[];
}

export const useCreateThemeMutation = () => {
  const [mutation, { loading, error }] = useMutation(createTheme);
  const invoke = async (input: CreateThemeInput): Promise<boolean> => {
    const response = await mutation({ variables: input });
    return !!response.data?.createTheme?.id;
  };
  return { invoke, loading, error };
};

export const useUpdateThemeMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateTheme);
  const invoke = async (input: UpdateThemeInput): Promise<boolean> => {
    const response = await mutation({ variables: input });
    return !!response.data?.updateTheme?.id;
  };
  return { invoke, loading, error };
};

export const useCopyThemeMutation = () => {
  const [mutation, { loading, error }] = useMutation(copyTheme);
  const invoke = async (id: string, name: string): Promise<boolean> => {
    const response = await mutation({ variables: { id, name } });
    return !!response.data?.copyTheme?.id;
  };
  return { invoke, loading, error };
};

export const useSetDefaultThemeMutation = () => {
  const [mutation, { loading, error }] = useMutation(setDefaultTheme);
  const invoke = async (themeId: string): Promise<boolean> => {
    const response = await mutation({ variables: { themeId } });
    return !!response.data?.setDefaultTheme?.id;
  };
  return { invoke, loading, error };
};

export const useDeleteThemeMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteTheme);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteTheme?.id;
  };
  return { invoke, loading, error };
};

export const useListThemesQuery = (projectId: string | undefined, options?: QueryHookOptions) => {
  const { data, refetch, loading, error, networkStatus } = useQuery(listThemes, {
    variables: { projectId },
    notifyOnNetworkStatusChange: true,
    skip: !projectId,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const themeList = data?.listThemes as Theme[] | null;
  return { themeList, refetch, loading, error, isRefetching };
};
