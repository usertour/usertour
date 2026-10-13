import { useApolloClient, useMutation, NetworkStatus } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import { useCallback } from 'react';

import type { Pagination, TeamMember, AttributeBizTypes } from '@usertour/types';
import {
  ActiveUserProjectDocument,
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
  type BizModelFieldsFragment,
  type BizOrder,
  type BizUserFieldsFragment,
  CancelInviteDocument,
  type CreateEnvironmentsMutationVariables,
  type CreateOidcSsoProviderInput,
  type ProjectSsoSettingsFieldsFragment,
  type SsoProviderFieldsFragment,
  type UpdateAttributeInput,
  type UpdateProjectSsoSettingsInput,
  type UpdateSsoProviderInput,
  CreateAttributeDocument,
  CreateCheckoutSessionDocument,
  CreateEnvironmentsDocument,
  CreateOidcSsoProviderDocument,
  CreatePortalSessionDocument,
  DeleteAttributeDocument,
  DeleteBizCompanyDocument,
  DeleteBizUserDocument,
  DeleteEnvironmentsDocument,
  DeleteSsoProviderDocument,
  GetInvitesDocument,
  type GetInvitesQuery,
  type GetInvitesQueryVariables,
  GetProjectConfigDocument,
  type GetProjectConfigQuery,
  type GetProjectConfigQueryVariables,
  GetProjectLicenseInfoDocument,
  GetProjectSsoProvidersDocument,
  type GetProjectSsoProvidersQuery,
  type GetProjectSsoProvidersQueryVariables,
  GetProjectSsoSettingsDocument,
  type GetProjectSsoSettingsQuery,
  type GetProjectSsoSettingsQueryVariables,
  GetSubscriptionByProjectIdDocument,
  type GetSubscriptionByProjectIdQuery,
  type GetSubscriptionByProjectIdQueryVariables,
  GetSubscriptionUsageDocument,
  type GetSubscriptionUsageQuery,
  type GetSubscriptionUsageQueryVariables,
  GetTeamMembersDocument,
  type GetTeamMembersQuery,
  type GetTeamMembersQueryVariables,
  GlobalConfigDocument,
  ListAttributesDocument,
  type ListAttributesQuery,
  type ListAttributesQueryVariables,
  ListProjectSsoProvidersDocument,
  type ListProjectSsoProvidersQuery,
  type ListProjectSsoProvidersQueryVariables,
  MeDocument,
  QueryBizCompanyDocument,
  type QueryBizCompanyQuery,
  type QueryBizCompanyQueryVariables,
  QueryBizUserDocument,
  type QueryBizUserQuery,
  type QueryBizUserQueryVariables,
  RemoveTeamMemberDocument,
  type Role,
  UpdateAttributeDocument,
  UpdateEnvironmentsDocument,
  type UpdateEnvironmentsMutationVariables,
  UpdateInstanceAuthenticationSettingsDocument,
  UpdateInstanceGeneralSettingsDocument,
  UpdateInstanceLicenseDocument,
  UpdateInstanceRequire2FaDocument,
  UpdateProjectDocument,
  UpdateProjectLicenseDocument,
  UpdateProjectSsoSettingsDocument,
  UpdateProjectUsesInstanceLicenseDocument,
  UpdateSsoProviderDocument,
  UpdateUserDisabledDocument,
  UpdateUserSystemAdminDocument,
  UserEnvironmentsDocument,
  type UserEnvironmentsQuery,
  type UserEnvironmentsQueryVariables,
  VerifyInstallationDocument,
  type VerifyInstallationQuery,
  type VerifyInstallationQueryVariables,
  ChangeTeamMemberRoleDocument as changeTeamMemberRoleMutation,
  type CreateAttributeInput as CreateAttributeInputWire,
  InviteTeamMemberDocument as inviteTeamMemberMutation,
  TransferProjectOwnershipDocument as transferProjectOwnershipMutation,
} from '../graphql';

type UseCompanyListQueryProps = {
  query: {
    environmentId: string;
    [key: string]: any;
  };
  pagination?: Pagination;
  orderBy?: BizOrder;
};

export const useCompanyListQuery = ({
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  pagination = { first: 10 },
  options,
}: UseCompanyListQueryProps & {
  options?: TypedQueryOptions<QueryBizCompanyQuery, QueryBizCompanyQueryVariables>;
}) => {
  // See `useContentListQuery` — `...options` first, `variables` last,
  // so caller can't accidentally clobber wrapper-composed variables.
  const { data, refetch, loading, refreshing, error, networkStatus } = useTypedQuery(
    QueryBizCompanyDocument,
    {
      ...options,
      variables: {
        ...pagination,
        query,
        orderBy,
      },
    },
  );

  const bizCompanyList = data?.queryBizCompany;
  const contents = bizCompanyList?.edges?.map((edge) => ({ ...edge.node })) ?? [];
  const pageInfo = bizCompanyList?.pageInfo;
  const totalCount = bizCompanyList?.totalCount || 0;

  // networkStatus pass-through so callers can derive `isRefetching`
  // (NetworkStatus.refetch === 4). Opt-in: callers pass
  // `options.notifyOnNetworkStatusChange: true` to make it meaningful.
  // `loading` is the in-flight flag: the tables and reload buttons behind
  // this list gate on it, and a reload keeps the rows while it runs.
  return {
    contents,
    pageInfo,
    totalCount,
    refetch,
    loading: loading || refreshing,
    error,
    networkStatus,
  };
};

type UseUserListQueryProps = {
  query: {
    environmentId: string;
    [key: string]: any;
  };
  pagination?: Pagination;
  orderBy?: BizOrder;
};

/** A user as the user list returns it (the `BizUserFields` fragment). */
export type BizUser = BizUserFieldsFragment;

/** A user's membership of a company, as the user list returns it. */
export type BizUserOnCompany = NonNullable<BizUser['bizUsersOnCompany']>[number];

/** A company as the company list returns it (the `BizModelFields` fragment; companies are `BizModel` on the wire). */
export type BizCompany = BizModelFieldsFragment;

export const useUserListQuery = ({
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  pagination = { first: 10 },
  options,
}: UseUserListQueryProps & {
  options?: TypedQueryOptions<QueryBizUserQuery, QueryBizUserQueryVariables>;
}) => {
  // See `useContentListQuery` — `...options` first, `variables` last,
  // so caller can't accidentally clobber wrapper-composed variables.
  const { data, refetch, loading, refreshing, error, networkStatus } = useTypedQuery(
    QueryBizUserDocument,
    {
      ...options,
      variables: {
        ...pagination,
        query,
        orderBy,
      },
    },
  );

  const bizUserList = data?.queryBizUser;
  // The attributes are spread next to the entity fields as they always were;
  // the table reads them from `data`, so nothing reads the spread copies.
  const contents: BizUser[] =
    bizUserList?.edges?.map((edge) => ({ ...edge.node, ...edge.node.data })) ?? [];
  const pageInfo = bizUserList?.pageInfo;
  const totalCount = bizUserList?.totalCount || 0;

  // See useCompanyListQuery — same networkStatus opt-in pattern, same
  // in-flight `loading`.
  return {
    contents,
    pageInfo,
    totalCount,
    refetch,
    loading: loading || refreshing,
    error,
    networkStatus,
  };
};

export const useQueryTeamMemberListQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<GetTeamMembersQuery, GetTeamMembersQueryVariables>,
) => {
  const { data, refetch, loading, error } = useTypedQuery(GetTeamMembersDocument, {
    variables: { projectId: projectId! },
    skip: !projectId,
    ...options,
  });

  const teamMembers: TeamMember[] =
    data?.getTeamMembers?.map((item) => ({
      userId: item.user?.id,
      name: item.user?.name ?? '',
      email: item.user?.email ?? '',
      role: item.role,
      allowedEnvironmentIds: item.allowedEnvironmentIds ?? null,
      twoFactorEnabled: item.user?.twoFactorEnabled === true,
      isInvite: false,
      createdAt: item.createdAt,
    })) ?? [];

  return { teamMembers, refetch, loading, error };
};

export const useQueryInviteListQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<GetInvitesQuery, GetInvitesQueryVariables>,
) => {
  const { data, refetch, loading, error } = useTypedQuery(GetInvitesDocument, {
    variables: { projectId: projectId! },
    skip: !projectId,
    ...options,
  });

  const invites: TeamMember[] =
    data?.getInvites?.map((item) => ({
      inviteId: item.id,
      name: item.name ?? '',
      email: item.email ?? '',
      role: item.role,
      isInvite: true,
      createdAt: item.createdAt,
    })) ?? [];

  return { invites, refetch, loading, error };
};

export const useInviteTeamMemberMutation = () => {
  const [inviteTeamMember, { loading, error }] = useMutation(inviteTeamMemberMutation, {
    refetchQueries: ['getInvites'],
  });
  const invoke = useCallback(
    async (
      projectId: string,
      name: string,
      email: string,
      role: Role,
      allowedEnvironmentIds?: string[],
    ): Promise<boolean> => {
      const response = await inviteTeamMember({
        variables: { projectId, name, email, role, allowedEnvironmentIds },
      });
      return !!response.data?.inviteTeamMember;
    },
    [inviteTeamMember],
  );

  return { invoke, loading, error };
};

export const useCancelInviteMutation = () => {
  const [mutation, { loading, error }] = useMutation(CancelInviteDocument, {
    refetchQueries: ['getInvites'],
  });
  const invoke = useCallback(
    async (projectId: string, inviteId: string): Promise<boolean> => {
      const response = await mutation({ variables: { projectId, inviteId } });
      return !!response.data?.cancelInvite;
    },
    [mutation],
  );

  return { invoke, loading, error };
};

export const useRemoveTeamMemberMutation = () => {
  const [mutation, { loading, error }] = useMutation(RemoveTeamMemberDocument, {
    refetchQueries: ['getTeamMembers'],
  });
  const invoke = useCallback(
    async (projectId: string, userId: string): Promise<boolean> => {
      const response = await mutation({ variables: { projectId, userId } });
      return !!response.data?.removeTeamMember;
    },
    [mutation],
  );

  return { invoke, loading, error };
};

export const useChangeTeamMemberRoleMutation = () => {
  // changeTeamMemberRole returns only `{ success }`, not a TeamMember
  // entity, so Apollo can't auto-merge the role flip. Refetch the list
  // so the displayed role updates.
  const [mutation, { loading, error }] = useMutation(changeTeamMemberRoleMutation, {
    refetchQueries: ['getTeamMembers'],
  });
  const invoke = useCallback(
    async (
      projectId: string,
      userId: string,
      role: Role,
      allowedEnvironmentIds?: string[],
    ): Promise<boolean> => {
      const response = await mutation({
        variables: { projectId, userId, role, allowedEnvironmentIds },
      });
      return !!response.data?.changeTeamMemberRole;
    },
    [mutation],
  );

  return { invoke, loading, error };
};

export const useTransferProjectOwnershipMutation = () => {
  // Returns only a boolean; refetch the list so the owner badge moves.
  const [mutation, { loading, error }] = useMutation(transferProjectOwnershipMutation, {
    refetchQueries: ['getTeamMembers'],
  });
  const invoke = useCallback(
    async (projectId: string, userId: string): Promise<boolean> => {
      const response = await mutation({ variables: { projectId, userId } });
      return !!response.data?.transferProjectOwnership;
    },
    [mutation],
  );

  return { invoke, loading, error };
};

export const useActiveUserProjectMutation = () => {
  const [mutation, { loading, error }] = useMutation(ActiveUserProjectDocument);
  const invoke = useCallback(
    async (userId: string, projectId: string): Promise<boolean> => {
      const response = await mutation({ variables: { userId, projectId } });
      return !!response.data?.activeUserProject;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

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

export const useCreateCheckoutSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateCheckoutSessionDocument);
  const invoke = useCallback(
    async (data: {
      projectId: string;
      planType: string;
      interval: string;
    }): Promise<string | undefined> => {
      const response = await mutation({ variables: { data } });
      return response.data?.createCheckoutSession;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useCreatePortalSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreatePortalSessionDocument);
  const invoke = useCallback(
    async (projectId: string): Promise<string | undefined> => {
      const response = await mutation({ variables: { projectId } });
      return response.data?.createPortalSession;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useGetSubscriptionByProjectIdQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<
    GetSubscriptionByProjectIdQuery,
    GetSubscriptionByProjectIdQueryVariables
  >,
) => {
  const { data, loading, error, refetch } = useTypedQuery(GetSubscriptionByProjectIdDocument, {
    variables: { projectId: projectId! },
    skip: !projectId,
    ...options,
  });
  const subscription = data?.getSubscriptionByProjectId ?? null;
  return { subscription, loading, error, refetch };
};

export const useGetSubscriptionUsageQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<GetSubscriptionUsageQuery, GetSubscriptionUsageQueryVariables>,
) => {
  const { data, loading, error, refetch } = useTypedQuery(GetSubscriptionUsageDocument, {
    variables: { projectId: projectId! },
    skip: !projectId,
    ...options,
  });
  const usage = data?.getSubscriptionUsage ?? 0;
  return { usage, loading, error, refetch };
};

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

export const useDeleteEnvironmentsMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteEnvironmentsDocument);
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({
        variables: { id },
        update(cache) {
          cache.evict({ id: cache.identify({ __typename: 'Environment', id }) });
          cache.gc();
        },
      });
      return !!response.data?.deleteEnvironments?.id;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export type CreateEnvironmentInput = CreateEnvironmentsMutationVariables;

export const useCreateEnvironmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateEnvironmentsDocument, {
    refetchQueries: ['userEnvironments'],
  });
  const invoke = useCallback(
    async (input: CreateEnvironmentInput): Promise<string | undefined> => {
      const response = await mutation({ variables: input });
      return response.data?.createEnvironments?.id;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export type UpdateEnvironmentInput = UpdateEnvironmentsMutationVariables;

export const useUpdateEnvironmentMutation = () => {
  // setPrimary flips isPrimary on two rows; refetch covers the demoted one.
  // Plain rename auto-merges via __typename:id but we refetch anyway so
  // the caller doesn't need to know which path it took.
  const [mutation, { loading, error }] = useMutation(UpdateEnvironmentsDocument, {
    refetchQueries: ['userEnvironments'],
  });
  const invoke = useCallback(
    async (input: UpdateEnvironmentInput): Promise<boolean> => {
      const response = await mutation({ variables: input });
      return !!response.data?.updateEnvironments?.id;
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

export const useGetUserEnvironmentsQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<UserEnvironmentsQuery, UserEnvironmentsQueryVariables>,
) => {
  const { data, refetch, loading, error, networkStatus } = useTypedQuery(UserEnvironmentsDocument, {
    variables: { projectId: projectId! },
    notifyOnNetworkStatusChange: true,
    skip: !projectId,
    ...options,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const environmentList = data?.userEnvironments ?? null;

  return { environmentList, refetch, loading, error, isRefetching };
};

export const useVerifyInstallationQuery = (
  environmentId: string | undefined,
  options?: TypedQueryOptions<VerifyInstallationQuery, VerifyInstallationQueryVariables>,
) => {
  const { data, loading, error, refetch, stopPolling } = useTypedQuery(VerifyInstallationDocument, {
    variables: { environmentId: environmentId! },
    skip: !environmentId,
    ...options,
  });

  return {
    installed: (data?.verifyInstallation?.installed as boolean | undefined) ?? false,
    userCount: (data?.verifyInstallation?.userCount as number | undefined) ?? 0,
    loading,
    error,
    refetch,
    stopPolling,
  };
};

export const useDeleteBizUserMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteBizUserDocument);
  const invoke = useCallback(
    async (data: {
      ids: string[];
      environmentId: string;
    }): Promise<{
      success: boolean;
      count: number;
    }> => {
      const response = await mutation({
        variables: { data },
        // Evict the BizUser entity from any cache slice that holds it.
        // The user list (useBizListCursor) runs on the global no-cache
        // default, so list refresh after delete still comes from the
        // caller's existing refetch chain; this evict targets the
        // cache-and-network detail-content queries
        // (`user-detail-content` / `user-session-detail-content`) so a
        // deleted user disappears from those slices too.
        update(cache) {
          for (const id of data.ids) {
            cache.evict({ id: cache.identify({ __typename: 'BizUser', id }) });
          }
          cache.gc();
        },
      });
      return {
        success: !!response.data?.deleteBizUser?.success,
        count: response.data?.deleteBizUser?.count ?? 0,
      };
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteBizCompanyMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteBizCompanyDocument);
  const invoke = useCallback(
    async (data: {
      ids: string[];
      environmentId: string;
    }): Promise<{ success: boolean; count: number }> => {
      const response = await mutation({
        variables: { data },
        // QueryBizCompanyDocument returns BizConnection (paginated BizModel),
        // not BizCompany — companies are stored under `BizModel:{id}` in
        // the normalized cache. (Users use `BizUser`, the subclass.)
        //
        // Same scope as deleteBizUser's evict: the company list runs
        // no-cache, so list refresh after delete comes from the caller's
        // explicit refetch; this evict targets the cache-and-network
        // company-detail-content slice so the deleted entity disappears
        // there too.
        update(cache) {
          for (const id of data.ids) {
            cache.evict({ id: cache.identify({ __typename: 'BizModel', id }) });
          }
          cache.gc();
        },
      });
      return {
        success: !!response.data?.deleteBizCompany?.success,
        count: response.data?.deleteBizCompany?.count ?? 0,
      };
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

// ---------------------------------------------------------------------------
// Two-factor authentication
// ---------------------------------------------------------------------------

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

/**
 * Returns a function that invalidates the two cached queries whose results
 * depend on instance/project-level admin state — `me` (per-user
 * `twoFactorAvailable`) and `globalConfig` (instance-wide `require2FA`).
 * Call after any admin mutation that changes a license token or instance
 * setting which surfaces back to end users, so already-mounted pages
 * (route guard, /settings/account) don't keep stale gating state until a
 * manual reload.
 */
export const useInvalidateLicenseScopedCache = () => {
  const apollo = useApolloClient();
  return useCallback(async () => {
    apollo.cache.evict({ fieldName: 'me' });
    apollo.cache.evict({ fieldName: 'globalConfig' });
    apollo.cache.gc();
    await apollo
      .refetchQueries({ include: [MeDocument, GlobalConfigDocument] })
      .catch(() => undefined);
  }, [apollo]);
};

// ---------------------------------------------------------------------------
// SSO (project-level OIDC identity providers)
// ---------------------------------------------------------------------------

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
