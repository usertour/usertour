import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  GetProjectConfigDocument,
  type GetProjectConfigQuery,
  type GetProjectConfigQueryVariables,
  GetProjectLicenseInfoDocument,
  UpdateProjectDocument,
  UpdateProjectLicenseDocument,
} from '../graphql';

// Domain wrappers for `project.graphql`: the project's settings, config and license.

export const useUpdateProjectMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateProjectDocument);
  const invoke = useCallback(
    // Only the provided fields are updated; logoUrl null/empty clears the logo.
    async (
      projectId: string,
      input: { name?: string; logoUrl?: string | null },
    ): Promise<boolean> => {
      const response = await mutation({ variables: { projectId, ...input } });
      return !!response.data?.updateProject;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

// License related hooks
export const useGetProjectLicenseInfoQuery = (projectId: string) => {
  const { data, loading, error, refetch } = useTypedQuery(GetProjectLicenseInfoDocument, {
    variables: { projectId },
    skip: !projectId,
  });

  return {
    licenseInfo: data?.getProjectLicenseInfo,
    loading,
    error,
    refetch,
  };
};

export const useGetProjectConfigQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<GetProjectConfigQuery, GetProjectConfigQueryVariables>,
) => {
  const { data, loading, error, refetch } = useTypedQuery(GetProjectConfigDocument, {
    variables: { projectId: projectId! },
    skip: !projectId || options?.skip,
    ...options,
  });

  return {
    projectConfig: data?.getProjectConfig as {
      removeBranding: boolean;
      customCss: boolean;
      auditLogs: boolean;
      auditLogRetentionDays: number;
      ssoOidc: boolean;
      ssoSaml: boolean;
      webhooks: boolean;
      integrations: boolean;
      crmIntegrations: boolean;
      planType: string;
    } | null,
    loading,
    error,
    refetch,
  };
};

export const useUpdateProjectLicenseMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateProjectLicenseDocument);

  const invoke = useCallback(
    async (projectId: string, license: string) => {
      const response = await mutation({
        variables: { projectId, license },
      });
      return response.data?.updateProjectLicense;
    },
    [mutation],
  );

  return { invoke, loading, error };
};
