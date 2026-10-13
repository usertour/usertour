import { NetworkStatus, useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';

import {
  CopyThemeDocument,
  CreateThemeDocument,
  type CreateThemeMutationVariables,
  DeleteThemeDocument,
  GetThemeDocument,
  type GetThemeQuery,
  type GetThemeQueryVariables,
  ListThemesDocument,
  type ListThemesQuery,
  type ListThemesQueryVariables,
  SetDefaultThemeDocument,
  type ThemeFieldsFragment,
  UpdateThemeDocument,
  type UpdateThemeMutationVariables,
} from '@usertour/gql';

/** A theme as the theme queries and the update return it (the `ThemeFields` fragment). */
export type Theme = ThemeFieldsFragment;

export type CreateThemeInput = CreateThemeMutationVariables;

export type UpdateThemeInput = UpdateThemeMutationVariables;

export const useCreateThemeMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateThemeDocument, {
    refetchQueries: ['listThemes'],
  });
  const invoke = async (input: CreateThemeInput): Promise<boolean> => {
    const response = await mutation({ variables: input });
    return !!response.data?.createTheme?.id;
  };
  return { invoke, loading, error };
};

export const useUpdateThemeMutation = () => {
  // Auto-merged by Apollo via __typename:id.
  const [mutation, { loading, error }] = useMutation(UpdateThemeDocument);
  const invoke = async (input: UpdateThemeInput): Promise<boolean> => {
    const response = await mutation({ variables: input });
    return !!response.data?.updateTheme?.id;
  };
  return { invoke, loading, error };
};

export const useCopyThemeMutation = () => {
  const [mutation, { loading, error }] = useMutation(CopyThemeDocument, {
    refetchQueries: ['listThemes'],
  });
  const invoke = async (id: string, name: string): Promise<boolean> => {
    const response = await mutation({ variables: { id, name } });
    return !!response.data?.copyTheme?.id;
  };
  return { invoke, loading, error };
};

export const useSetDefaultThemeMutation = () => {
  // Flips isDefault on two themes; refetch covers the demoted one too.
  const [mutation, { loading, error }] = useMutation(SetDefaultThemeDocument, {
    refetchQueries: ['listThemes'],
  });
  const invoke = async (themeId: string): Promise<boolean> => {
    const response = await mutation({ variables: { themeId } });
    return !!response.data?.setDefaultTheme?.id;
  };
  return { invoke, loading, error };
};

export const useDeleteThemeMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteThemeDocument);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({
      variables: { id },
      update(cache) {
        cache.evict({ id: cache.identify({ __typename: 'Theme', id }) });
        cache.gc();
      },
    });
    return !!response.data?.deleteTheme?.id;
  };
  return { invoke, loading, error };
};

export const useListThemesQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<ListThemesQuery, ListThemesQueryVariables>,
) => {
  const { data, refetch, loading, error, networkStatus } = useTypedQuery(ListThemesDocument, {
    variables: { projectId: projectId! },
    notifyOnNetworkStatusChange: true,
    skip: !projectId,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const themeList = data?.listThemes ?? null;
  return { themeList, refetch, loading, error, isRefetching };
};

export const useGetThemeQuery = (
  themeId: string | undefined,
  options?: TypedQueryOptions<GetThemeQuery, GetThemeQueryVariables>,
) => {
  const { data, refetch, loading, error } = useTypedQuery(GetThemeDocument, {
    variables: { themeId: themeId! },
    skip: !themeId,
    ...options,
  });
  return { theme: data?.getTheme, refetch, loading, error };
};
