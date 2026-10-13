import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import { useTypedQuery } from '../query';
import {
  AdminAddProjectMemberDocument,
  AdminChangeProjectMemberRoleDocument,
  AdminCreateProjectDocument,
  AdminCreateUserDocument,
  AdminInstanceSettingsDocument,
  AdminProjectMembersDocument,
  AdminProjectsDocument,
  AdminRemoveProjectMemberDocument,
  AdminSettingsDocument,
  AdminTransferProjectOwnershipDocument,
  AdminUsersDocument,
  UpdateInstanceAuthenticationSettingsDocument,
  UpdateInstanceGeneralSettingsDocument,
  UpdateInstanceLicenseDocument,
  UpdateInstanceRequire2FaDocument,
  UpdateProjectUsesInstanceLicenseDocument,
  UpdateUserDisabledDocument,
  UpdateUserSystemAdminDocument,
} from '../graphql';

// Domain wrappers for `admin.graphql`: the instance's settings, users and
// projects, for the system administrator.

// Admin related hooks
export const useAdminSettingsQuery = () => {
  const { data, loading, error, refetch } = useTypedQuery(AdminSettingsDocument);
  return { data: data?.adminSettings, loading, error, refetch };
};

export const useAdminInstanceSettingsQuery = () => {
  const { data, loading, error, refetch } = useTypedQuery(AdminInstanceSettingsDocument);
  return { data: data?.adminInstanceSettings, loading, error, refetch };
};

export const useUpdateInstanceLicenseMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateInstanceLicenseDocument);
  const invoke = useCallback(
    async (license: string) => {
      const response = await mutation({ variables: { license } });
      return response.data?.updateInstanceLicense;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateInstanceGeneralSettingsMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateInstanceGeneralSettingsDocument);
  const invoke = useCallback(
    async (
      name?: string,
      contactEmail?: string,
      allowProjectLevelSubscriptionManagement?: boolean,
    ) => {
      const response = await mutation({
        variables: { name, contactEmail, allowProjectLevelSubscriptionManagement },
      });
      return response.data?.updateInstanceGeneralSettings;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateInstanceAuthenticationSettingsMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateInstanceAuthenticationSettingsDocument);
  const invoke = useCallback(
    async (allowUserRegistration: boolean) => {
      const response = await mutation({ variables: { allowUserRegistration } });
      return response.data?.updateInstanceAuthenticationSettings;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useAdminUsersQuery = (
  query?: string,
  page?: number,
  pageSize?: number,
  status?: string,
  role?: string,
) => {
  const { data, loading, error, refetch } = useTypedQuery(AdminUsersDocument, {
    variables: { query, page, pageSize, status, role },
  });
  return { data: data?.adminUsers, loading, error, refetch };
};

export const useAdminCreateUserMutation = () => {
  const [mutation, { loading, error }] = useMutation(AdminCreateUserDocument);
  const invoke = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await mutation({ variables: { name, email, password } });
      return response.data?.adminCreateUser;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateUserSystemAdminMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateUserSystemAdminDocument);
  const invoke = useCallback(
    async (userId: string, isSystemAdmin: boolean) => {
      const response = await mutation({ variables: { userId, isSystemAdmin } });
      return response.data?.updateUserSystemAdmin;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateUserDisabledMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateUserDisabledDocument);
  const invoke = useCallback(
    async (userId: string, disabled: boolean) => {
      const response = await mutation({ variables: { userId, disabled } });
      return response.data?.updateUserDisabled;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useAdminProjectsQuery = (
  query?: string,
  page?: number,
  pageSize?: number,
  usesInstanceLicense?: string,
) => {
  const { data, loading, error, refetch } = useTypedQuery(AdminProjectsDocument, {
    variables: { query, page, pageSize, usesInstanceLicense },
  });
  return { data: data?.adminProjects, loading, error, refetch };
};

export const useAdminCreateProjectMutation = () => {
  const [mutation, { loading, error }] = useMutation(AdminCreateProjectDocument);
  const invoke = useCallback(
    async (name: string, ownerUserId: string) => {
      const response = await mutation({ variables: { name, ownerUserId } });
      return response.data?.adminCreateProject;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateProjectUsesInstanceLicenseMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateProjectUsesInstanceLicenseDocument);
  const invoke = useCallback(
    async (projectId: string, enabled: boolean) => {
      const response = await mutation({ variables: { projectId, enabled } });
      return response.data?.updateProjectUsesInstanceLicense;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useAdminProjectMembersQuery = (projectId: string) => {
  const { data, loading, error, refetch } = useTypedQuery(AdminProjectMembersDocument, {
    variables: { projectId },
    skip: !projectId,
  });
  return { data: data?.adminProjectMembers, loading, error, refetch };
};

export const useAdminAddProjectMemberMutation = () => {
  const [mutation, { loading, error }] = useMutation(AdminAddProjectMemberDocument);
  const invoke = useCallback(
    async (projectId: string, userId: string, role: string) => {
      const response = await mutation({ variables: { projectId, userId, role } });
      return response.data?.adminAddProjectMember;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useAdminChangeProjectMemberRoleMutation = () => {
  const [mutation, { loading, error }] = useMutation(AdminChangeProjectMemberRoleDocument);
  const invoke = useCallback(
    async (projectId: string, userId: string, role: string) => {
      const response = await mutation({ variables: { projectId, userId, role } });
      return response.data?.adminChangeProjectMemberRole;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useAdminTransferProjectOwnershipMutation = () => {
  const [mutation, { loading, error }] = useMutation(AdminTransferProjectOwnershipDocument);
  const invoke = useCallback(
    async (projectId: string, userId: string) => {
      const response = await mutation({ variables: { projectId, userId } });
      return response.data?.adminTransferProjectOwnership;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useAdminRemoveProjectMemberMutation = () => {
  const [mutation, { loading, error }] = useMutation(AdminRemoveProjectMemberDocument);
  const invoke = useCallback(
    async (projectId: string, userId: string) => {
      const response = await mutation({ variables: { projectId, userId } });
      return response.data?.adminRemoveProjectMember;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateInstanceRequire2FAMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateInstanceRequire2FaDocument);
  const invoke = useCallback(
    async (value: boolean) => {
      const response = await mutation({ variables: { value } });
      return response.data?.updateInstanceRequire2FA;
    },
    [mutation],
  );
  return { invoke, loading, error };
};
