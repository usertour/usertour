import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  type CreateOidcSsoProviderInput,
  type ProjectSsoSettingsFieldsFragment,
  type SsoProviderFieldsFragment,
  type UpdateProjectSsoSettingsInput,
  type UpdateSsoProviderInput,
  CreateOidcSsoProviderDocument,
  DeleteSsoProviderDocument,
  GetProjectSsoProvidersDocument,
  type GetProjectSsoProvidersQuery,
  type GetProjectSsoProvidersQueryVariables,
  GetProjectSsoSettingsDocument,
  type GetProjectSsoSettingsQuery,
  type GetProjectSsoSettingsQueryVariables,
  ListProjectSsoProvidersDocument,
  type ListProjectSsoProvidersQuery,
  type ListProjectSsoProvidersQueryVariables,
  UpdateProjectSsoSettingsDocument,
  UpdateSsoProviderDocument,
} from '../graphql';

// Domain wrappers for `sso.graphql`: SSO providers and the project's SSO settings.

export type SsoProvider = SsoProviderFieldsFragment;

export type PublicSsoProvider = GetProjectSsoProvidersQuery['getProjectSsoProviders'][number];

export type { CreateOidcSsoProviderInput, UpdateSsoProviderInput };

/** The roles JIT provisioning may hand out: EDITOR or VIEWER. */
export type SsoDefaultRole = ProjectSsoSettings['defaultRole'];

// Project-level SSO settings: force-SSO enforcement + JIT provisioning policy.
export type ProjectSsoSettings = ProjectSsoSettingsFieldsFragment;

export type { UpdateProjectSsoSettingsInput };

export const useListProjectSsoProvidersQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<ListProjectSsoProvidersQuery, ListProjectSsoProvidersQueryVariables>,
) => {
  const { data, loading, error, refetch } = useTypedQuery(ListProjectSsoProvidersDocument, {
    variables: { projectId: projectId! },
    skip: !projectId || options?.skip,
    ...options,
  });
  return {
    providers: data?.listProjectSsoProviders ?? [],
    loading,
    error,
    refetch,
  };
};

export const useGetProjectSsoProvidersQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<GetProjectSsoProvidersQuery, GetProjectSsoProvidersQueryVariables>,
) => {
  const { data, loading, error, refetch } = useTypedQuery(GetProjectSsoProvidersDocument, {
    variables: { projectId: projectId! },
    skip: !projectId || options?.skip,
    ...options,
  });
  return {
    providers: data?.getProjectSsoProviders ?? [],
    loading,
    error,
    refetch,
  };
};

export const useCreateOidcSsoProviderMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateOidcSsoProviderDocument);
  const invoke = useCallback(
    async (projectId: string, input: CreateOidcSsoProviderInput): Promise<SsoProvider> => {
      const response = await mutation({ variables: { projectId, input } });
      return response.data!.createOidcSsoProvider;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateSsoProviderMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateSsoProviderDocument);
  const invoke = useCallback(
    async (id: string, input: UpdateSsoProviderInput): Promise<SsoProvider> => {
      const response = await mutation({ variables: { id, input } });
      return response.data!.updateSsoProvider;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteSsoProviderMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteSsoProviderDocument);
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({ variables: { id } });
      return !!response.data?.deleteSsoProvider;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useGetProjectSsoSettingsQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<GetProjectSsoSettingsQuery, GetProjectSsoSettingsQueryVariables>,
) => {
  const { data, loading, error, refetch } = useTypedQuery(GetProjectSsoSettingsDocument, {
    variables: { projectId: projectId! },
    skip: !projectId || options?.skip,
    ...options,
  });
  return {
    settings: data?.getProjectSsoSettings,
    loading,
    error,
    refetch,
  };
};

export const useUpdateProjectSsoSettingsMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateProjectSsoSettingsDocument);
  const invoke = useCallback(
    async (
      projectId: string,
      input: UpdateProjectSsoSettingsInput,
    ): Promise<ProjectSsoSettings> => {
      const response = await mutation({ variables: { projectId, input } });
      return response.data!.updateProjectSsoSettings;
    },
    [mutation],
  );
  return { invoke, loading, error };
};
