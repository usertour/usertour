import { useApolloClient, useMutation, useLazyQuery, NetworkStatus } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import { useCallback } from 'react';

import type {
  Content,
  ContentDataType,
  Pagination,
  Segment,
  TeamMember,
  BizSession,
  ContentQuestionAnalytics,
  BizAttributeTypes,
  AttributeBizTypes,
  Attribute,
  Environment,
  Subscription,
  GlobalConfig,
  ColumnSetting,
  RulesCondition,
  Theme,
  Localization,
  ContentOmbedInfo,
  ContentVersion,
  BizCompany,
  BizUser,
} from '@usertour/types';
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
  type AnalyticsOrder,
  type BizOrder,
  CancelInviteDocument,
  ChangeTeamMemberRoleDocument as changeTeamMemberRoleMutation,
  type ContentOrder,
  CreateAttributeDocument,
  CreateBizCompanyOnSegmentDocument,
  type CreateBizCompanyOnSegmentMutationVariables,
  CreateBizUserOnSegmentDocument,
  type CreateBizUserOnSegmentMutationVariables,
  CreateCheckoutSessionDocument,
  CreateContentVersionDocument,
  CreateEnvironmentsDocument,
  CreateOidcSsoProviderDocument,
  CreatePortalSessionDocument,
  CreateSegmentDocument,
  type CreateSegmentMutationVariables,
  DeleteAttributeDocument,
  DeleteBizCompanyDocument,
  DeleteBizCompanyOnSegmentDocument,
  type DeleteBizCompanyOnSegmentMutationVariables,
  DeleteBizUserDocument,
  DeleteBizUserOnSegmentDocument,
  DeleteContentDocument,
  DeleteEnvironmentsDocument,
  DeleteSegmentDocument,
  DeleteSessionDocument,
  DeleteSsoProviderDocument,
  EndSessionDocument,
  GetContentDocument,
  GetInvitesDocument,
  type GetInvitesQuery,
  type GetInvitesQueryVariables,
  GetProjectConfigDocument,
  type GetProjectConfigQuery,
  type GetProjectConfigQueryVariables,
  GetProjectLicenseInfoDocument,
  GetProjectSsoLoginDocument,
  type GetProjectSsoLoginQuery,
  type GetProjectSsoLoginQueryVariables,
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
  GetThemeDocument,
  type GetThemeQuery,
  type GetThemeQueryVariables,
  GlobalConfigDocument,
  InviteTeamMemberDocument as inviteTeamMemberMutation,
  ListAttributesDocument,
  type ListAttributesQuery,
  type ListAttributesQueryVariables,
  ListLocalizationsDocument,
  type ListLocalizationsQuery,
  type ListLocalizationsQueryVariables,
  ListProjectSsoProvidersDocument,
  type ListProjectSsoProvidersQuery,
  type ListProjectSsoProvidersQueryVariables,
  ListSegmentDocument,
  type ListSegmentQuery,
  type ListSegmentQueryVariables,
  MeDocument,
  QueryBizCompanyDocument,
  type QueryBizCompanyQuery,
  type QueryBizCompanyQueryVariables,
  QueryBizUserDocument,
  type QueryBizUserQuery,
  type QueryBizUserQueryVariables,
  QueryContentDocument,
  type QueryContentQuery,
  type QueryContentQueryVariables,
  QueryContentQuestionAnalyticsDocument,
  QueryOembedInfoDocument,
  QuerySessionDetailDocument,
  QuerySessionsByExternalIdDocument,
  RemoveTeamMemberDocument,
  type Role,
  type SessionQuery,
  TransferProjectOwnershipDocument as transferProjectOwnershipMutation,
  UpdateAttributeDocument,
  UpdateContentDocument,
  UpdateContentVersionDocument,
  UpdateEnvironmentsDocument,
  type UpdateEnvironmentsMutationVariables,
  UpdateInstanceAuthenticationSettingsDocument,
  UpdateInstanceGeneralSettingsDocument,
  UpdateInstanceLicenseDocument,
  UpdateInstanceRequire2FaDocument,
  UpdateProjectDocument,
  UpdateProjectLicenseDocument,
  UpdateProjectSsoSettingsDocument,
  type UpdateProjectSsoSettingsMutationVariables,
  UpdateProjectUsesInstanceLicenseDocument,
  UpdateSegmentDocument,
  UpdateSsoProviderDocument,
  UpdateUserDisabledDocument,
  UpdateUserSystemAdminDocument,
  UserEnvironmentsDocument,
  type UserEnvironmentsQuery,
  type UserEnvironmentsQueryVariables,
  VerifyInstallationDocument,
  type VerifyInstallationQuery,
  type VerifyInstallationQueryVariables,
  type VersionInput,
} from '@usertour/gql';

type UseContentListQueryProps = {
  // Index signature mirrors the server's ContentQuery input — callers
  // pass `published` / etc. in addition to the always-required keys.
  query: {
    environmentId: string;
    type?: ContentDataType;
    [key: string]: unknown;
  };
  options?: TypedQueryOptions<QueryContentQuery, QueryContentQueryVariables>;
  pagination?: Pagination;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
};

export const useContentListQuery = ({
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  pagination = { first: 1000 },
  options,
}: UseContentListQueryProps) => {
  // `...options` spread BEFORE `variables` — a caller-supplied
  // `options.variables` would otherwise silently overwrite the
  // pagination / query / orderBy the wrapper just composed. Defensive
  // but free: `useCursorPagination` already pipes caller-controlled
  // options straight into wrappers like this one.
  const { data, refetch, error, loading } = useTypedQuery(QueryContentDocument, {
    ...options,
    variables: {
      ...pagination,
      query,
      orderBy: orderBy as ContentOrder,
    },
  });
  const contentList = data?.queryContent?.edges?.map((edge) => edge.node);
  const pageInfo = data?.queryContent?.pageInfo;
  const totalCount = data?.queryContent?.totalCount;

  // Wire shape and domain Content differ on optionality; the hook is the boundary.
  const contents = contentList ? (contentList as unknown as Content[]) : [];

  return { contents, pageInfo, totalCount, refetch, error, loading };
};

type UseCompanyListQueryProps = {
  query: {
    environmentId: string;
    [key: string]: any;
  };
  pagination?: Pagination;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
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
  const { data, refetch, loading, error, networkStatus } = useTypedQuery(QueryBizCompanyDocument, {
    ...options,
    variables: {
      ...pagination,
      query,
      orderBy: orderBy as BizOrder,
    },
  });

  const bizCompanyList = data?.queryBizCompany;
  const contents = (bizCompanyList?.edges?.map((edge) => ({ ...edge.node })) ??
    []) as unknown as BizCompany[];
  const pageInfo = bizCompanyList?.pageInfo;
  const totalCount = bizCompanyList?.totalCount || 0;

  // networkStatus pass-through so callers can derive `isRefetching`
  // (NetworkStatus.refetch === 4). Opt-in: callers pass
  // `options.notifyOnNetworkStatusChange: true` to make it meaningful.
  return { contents, pageInfo, totalCount, refetch, loading, error, networkStatus };
};

type UseUserListQueryProps = {
  query: {
    environmentId: string;
    [key: string]: any;
  };
  pagination?: Pagination;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
};

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
  const { data, refetch, loading, error, networkStatus } = useTypedQuery(QueryBizUserDocument, {
    ...options,
    variables: {
      ...pagination,
      query,
      orderBy: orderBy as BizOrder,
    },
  });

  const bizUserList = data?.queryBizUser;
  const contents = (bizUserList?.edges?.map((edge) => ({
    ...edge.node,
    ...(edge.node.data as Record<string, unknown>),
  })) ?? []) as unknown as BizUser[];
  const pageInfo = bizUserList?.pageInfo;
  const totalCount = bizUserList?.totalCount || 0;

  // See useCompanyListQuery — same networkStatus opt-in pattern.
  return { contents, pageInfo, totalCount, refetch, loading, error, networkStatus };
};

export const useSegmentListQuery = (
  environmentId: string,
  bizType: string[] = ['COMPANY', 'USER'],
  options?: TypedQueryOptions<ListSegmentQuery, ListSegmentQueryVariables>,
) => {
  const { data, refetch, loading, error, networkStatus } = useTypedQuery(ListSegmentDocument, {
    variables: { environmentId },
    ...options,
  });
  const segments = (data?.listSegment ?? []).filter((item) =>
    bizType.includes(item.bizType as Segment['bizType']),
  );

  // See useCompanyListQuery — same networkStatus opt-in pattern.
  return { segmentList: segments as Segment[], refetch, loading, error, networkStatus };
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
    data?.getTeamMembers?.map((item: any) => ({
      userId: item.user.id,
      name: item.user.name,
      email: item.user.email,
      role: item.role,
      allowedEnvironmentIds: item.allowedEnvironmentIds ?? null,
      logo: item.user.logo,
      twoFactorEnabled: item.user.twoFactorEnabled === true,
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
    data?.getInvites?.map((item: any) => ({
      inviteId: item.id,
      name: item.name,
      email: item.email,
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
      role: string,
      allowedEnvironmentIds?: string[],
    ): Promise<boolean> => {
      const response = await inviteTeamMember({
        variables: { projectId, name, email, role: role as Role, allowedEnvironmentIds },
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
      role: string,
      allowedEnvironmentIds?: string[],
    ): Promise<boolean> => {
      const response = await mutation({
        variables: { projectId, userId, role: role as Role, allowedEnvironmentIds },
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

export const useDeleteSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteSessionDocument);
  const invoke = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const response = await mutation({ variables: { sessionId } });
      return !!response.data?.deleteSession;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useEndSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(EndSessionDocument);
  const invoke = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const response = await mutation({ variables: { sessionId } });
      return !!response.data?.endSession;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useQuerySessionDetailQuery = (sessionId: string) => {
  const { data, loading, error, refetch } = useTypedQuery(QuerySessionDetailDocument, {
    variables: { sessionId },
  });

  const session = data?.querySessionDetail as BizSession;
  return { session, loading, error, refetch };
};

export const useQuerySessionsByExternalIdQuery = (
  query: SessionQuery,
  pagination: Pagination = { first: 10 },
  orderBy: { field: string; direction: 'asc' | 'desc' } = {
    field: 'createdAt',
    direction: 'desc',
  },
) => {
  const { data, loading, error, refetch } = useTypedQuery(QuerySessionsByExternalIdDocument, {
    variables: {
      query,
      orderBy: orderBy as AnalyticsOrder,
      ...pagination,
    },
    // Reload goes through `refetch()`; without this the refetch window
    // has `loading: false`, so the UI gets no in-flight signal.
    notifyOnNetworkStatusChange: true,
  });

  const sessions =
    (data?.querySessionsByExternalId?.edges?.map((edge: any) => edge.node) as BizSession[]) || [];
  const pageInfo = data?.querySessionsByExternalId?.pageInfo;
  const totalCount = data?.querySessionsByExternalId?.totalCount || 0;

  return { sessions, pageInfo, totalCount, loading, error, refetch };
};

export const useQueryContentQuestionAnalyticsQuery = (
  environmentId: string,
  contentId: string,
  startDate: string,
  endDate: string,
  timezone: string,
) => {
  const { data, loading, error, refetch } = useTypedQuery(QueryContentQuestionAnalyticsDocument, {
    variables: { contentId, startDate, endDate, timezone, environmentId },
  });
  const questionAnalytics = data?.queryContentQuestionAnalytics as ContentQuestionAnalytics[];
  return { questionAnalytics, loading, error, refetch };
};

export const useUpdateContentMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateContentDocument);
  const invoke = useCallback(
    async (contentId: string, content: Pick<Content, 'name' | 'config' | 'buildUrl'>) => {
      const response = await mutation({ variables: { contentId, content } });
      return response.data?.updateContent;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateContentVersionMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateContentVersionDocument);
  const invoke = useCallback(
    async (
      versionId: string,
      content: {
        data?: unknown;
        config?: unknown;
        themeId?: string;
        scheduledAt?: Date | null;
        // Builder's whole-version save: the full step list, each carrying its
        // front-end cvid. Server upserts by cvid. detail omits this.
        steps?: unknown[];
      },
      // Optimistic-lock baseline (the version's updatedAt the caller last
      // loaded). The builder's whole-version save sends it so a concurrent
      // save by someone else is rejected instead of silently overwritten;
      // detail's scalar updates omit it.
      expectedUpdatedAt?: string,
    ) => {
      const response = await mutation({
        variables: { versionId, content: content as VersionInput, expectedUpdatedAt },
      });
      return response.data?.updateContentVersion as ContentVersion | undefined;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export type CreateAttributeMutationVariables = {
  projectId: string;
  description: string;
  dataType: BizAttributeTypes;
  bizType: AttributeBizTypes;
  displayName: string;
  codeName: string;
  /** Upper bound of a Random number attribute (ADR 0020); required for that type only. */
  randomMax?: number;
};

export const useCreateAttributeMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateAttributeDocument, {
    refetchQueries: ['listAttributes'],
  });
  const invoke = useCallback(
    async (data: CreateAttributeMutationVariables) => {
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
  const attributes = data?.listAttributes as Attribute[];
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
  // Wire shape and domain Subscription differ on optionality; the hook is the boundary.
  const subscription = data?.getSubscriptionByProjectId as unknown as Subscription | null;
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

export const useGlobalConfigQuery = () => {
  const { data, loading, error } = useTypedQuery(GlobalConfigDocument);
  return {
    data: data?.globalConfig as GlobalConfig | undefined,
    loading,
    error,
  };
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

// Builder related hooks
export const useGetContentLazyQuery = () => {
  const [query, { loading, error }] = useLazyQuery(GetContentDocument);
  const invoke = useCallback(
    async (contentId: string) => {
      const response = await query({ variables: { contentId } });
      return response.data?.getContent;
    },
    [query],
  );
  return { invoke, loading, error };
};

export const useQueryOembedInfoLazyQuery = () => {
  const [query, { loading, error }] = useLazyQuery(QueryOembedInfoDocument);
  const invoke = useCallback(
    async (url: string) => {
      const response = await query({ variables: { url } });
      return response.data?.queryOembedInfo as ContentOmbedInfo | undefined;
    },
    [query],
  );
  return { invoke, loading, error };
};

export const useCreateContentVersionMutation = () => {
  // Forking the version inserts a new row at the top of the paginated
  // version-history list — Apollo's normalized cache can't materialise
  // a new edge from the mutation response, so refetch the list query.
  const [mutation, { loading, error }] = useMutation(CreateContentVersionDocument, {
    refetchQueries: ['listContentVersions'],
  });
  const invoke = useCallback(
    async (data: {
      versionId: string;
      config?: unknown;
      data?: unknown;
      themeId?: string;
    }) => {
      const response = await mutation({ variables: { data } });
      return response.data?.createContentVersion;
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

export const useDeleteSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteSegmentDocument);
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({
        variables: { id },
        update(cache) {
          cache.evict({ id: cache.identify({ __typename: 'Segment', id }) });
          cache.gc();
        },
      });
      return !!response.data?.deleteSegment?.success;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

// Server's UpdateSegment input picks { name, data, id, columns } from
// Segment — all optional except id. Wrapper mirrors that so the same
// invoke handles both filter-condition saves and column-setting saves.
//
// Refresh path is `refetchQueries: ['listSegment']`, NOT Apollo
// auto-merge. The UpdateSegmentDocument gql response only selects `{ id }`
// (see packages/gql/src/gql/segment.ts), so auto-merge into the cached
// Segment entity is a no-op. To migrate to auto-merge later, expand
// the gql response to mirror listSegment's selection set, then drop
// refetchQueries here.
export const useUpdateSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateSegmentDocument, {
    refetchQueries: ['listSegment'],
  });
  const invoke = useCallback(
    async (data: {
      id: string;
      name?: string;
      data?: RulesCondition[];
      columns?: ColumnSetting[];
    }): Promise<boolean> => {
      const response = await mutation({ variables: { data } });
      return !!response.data?.updateSegment?.id;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteContentMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteContentDocument);
  const invoke = useCallback(
    async (contentId: string): Promise<boolean> => {
      const response = await mutation({
        variables: { contentId },
        // Server returns `{ success }` only — there's no `id` on the
        // payload for auto-merge, so do the eviction ourselves. All
        // observers of the Content slot (list view, detail view, etc.)
        // see the row disappear without a manual refetch.
        update(cache) {
          cache.evict({ id: cache.identify({ __typename: 'Content', id: contentId }) });
          cache.gc();
        },
      });
      return !!response.data?.deleteContent?.success;
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

export interface CreateEnvironmentInput {
  name: string;
  projectId: string;
}

export const useCreateEnvironmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateEnvironmentsDocument, {
    refetchQueries: ['userEnvironments'],
  });
  const invoke = useCallback(
    async (input: CreateEnvironmentInput): Promise<string | undefined> => {
      const response = await mutation({ variables: input });
      return response.data?.createEnvironments?.id as string | undefined;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export interface UpdateEnvironmentInput {
  id: string;
  name?: string;
  isPrimary?: boolean;
}

export const useUpdateEnvironmentMutation = () => {
  // setPrimary flips isPrimary on two rows; refetch covers the demoted one.
  // Plain rename auto-merges via __typename:id but we refetch anyway so
  // the caller doesn't need to know which path it took.
  const [mutation, { loading, error }] = useMutation(UpdateEnvironmentsDocument, {
    refetchQueries: ['userEnvironments'],
  });
  const invoke = useCallback(
    async (input: UpdateEnvironmentInput): Promise<boolean> => {
      const response = await mutation({ variables: input as UpdateEnvironmentsMutationVariables });
      return !!response.data?.updateEnvironments?.id;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export interface UpdateAttributeInput {
  id: string;
  bizType: number;
  dataType: number;
  codeName: string;
  displayName: string;
  description: string;
}

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
  const environmentList = data?.userEnvironments as Environment[] | null;

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

export const useDeleteBizUserOnSegmentMutation = () => {
  // Removes a relationship, not the user itself — the user entity stays
  // in cache, but the segment's view of users needs to be refetched
  // because Apollo can't infer "this user is no longer in this segment"
  // from a count response.
  const [mutation, { loading, error }] = useMutation(DeleteBizUserOnSegmentDocument, {
    refetchQueries: ['queryBizUser'],
  });
  const invoke = useCallback(
    async (data: {
      bizUserIds: string[];
      segmentId: string;
    }): Promise<{
      success: boolean;
      count: number;
    }> => {
      const response = await mutation({ variables: { data } });
      return {
        success: !!response.data?.deleteBizUserOnSegment?.success,
        count: response.data?.deleteBizUserOnSegment?.count ?? 0,
      };
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useCreateSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateSegmentDocument, {
    refetchQueries: ['listSegment'],
  });
  const invoke = useCallback(
    (variables: CreateSegmentMutationVariables) => mutation({ variables }),
    [mutation],
  );
  return { invoke, loading, error };
};

export const useCreateBizUserOnSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateBizUserOnSegmentDocument, {
    refetchQueries: ['queryBizUser'],
  });
  const invoke = useCallback(
    (variables: CreateBizUserOnSegmentMutationVariables) => mutation({ variables }),
    [mutation],
  );
  return { invoke, loading, error };
};

export const useCreateBizCompanyOnSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateBizCompanyOnSegmentDocument, {
    refetchQueries: ['queryBizCompany'],
  });
  const invoke = useCallback(
    (variables: CreateBizCompanyOnSegmentMutationVariables) => mutation({ variables }),
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteBizCompanyOnSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteBizCompanyOnSegmentDocument, {
    refetchQueries: ['queryBizCompany'],
  });
  const invoke = useCallback(
    (variables: DeleteBizCompanyOnSegmentMutationVariables) => mutation({ variables }),
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

export const useGetThemeQuery = (
  themeId: string | undefined,
  options?: TypedQueryOptions<GetThemeQuery, GetThemeQueryVariables>,
) => {
  const { data, refetch, loading, error } = useTypedQuery(GetThemeDocument, {
    variables: { themeId: themeId! },
    skip: !themeId,
    ...options,
  });
  return { theme: data?.getTheme as Theme | undefined, refetch, loading, error };
};

export const useListLocalizationsQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<ListLocalizationsQuery, ListLocalizationsQueryVariables>,
) => {
  const { data, refetch, loading, error } = useTypedQuery(ListLocalizationsDocument, {
    variables: { projectId: projectId! },
    skip: !projectId,
    ...options,
  });
  return {
    localizationList: data?.listLocalizations as Localization[] | undefined,
    refetch,
    loading,
    error,
  };
};

// ---------------------------------------------------------------------------
// SSO (project-level OIDC identity providers)
// ---------------------------------------------------------------------------

export interface SsoProvider {
  id: string;
  projectId: string;
  type: 'OIDC' | 'SAML';
  name: string;
  status: string;
  issuer: string;
  clientId: string;
  authorizationUrl?: string | null;
  tokenUrl?: string | null;
  userInfoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSsoProvider {
  id: string;
  name: string;
  type: 'OIDC' | 'SAML';
}

export interface CreateOidcSsoProviderInput {
  name: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
}

export type UpdateSsoProviderInput = Partial<
  CreateOidcSsoProviderInput & {
    status: string;
  }
>;

// Project-level SSO settings: force-SSO enforcement + JIT provisioning policy.
export interface ProjectSsoSettings {
  projectId: string;
  requireSso: boolean;
  autoProvision: boolean;
  defaultRole: 'EDITOR' | 'VIEWER';
  allowedDomains: string[];
}

export type UpdateProjectSsoSettingsInput = Partial<{
  requireSso: boolean;
  autoProvision: boolean;
  defaultRole: 'EDITOR' | 'VIEWER';
  allowedDomains: string[];
}>;

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
    providers: (data?.listProjectSsoProviders ?? []) as SsoProvider[],
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
    providers: (data?.getProjectSsoProviders ?? []) as PublicSsoProvider[],
    loading,
    error,
    refetch,
  };
};

export const useGetProjectSsoLoginQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<GetProjectSsoLoginQuery, GetProjectSsoLoginQueryVariables>,
) => {
  const { data, loading, error, refetch } = useTypedQuery(GetProjectSsoLoginDocument, {
    variables: { projectId: projectId! },
    skip: !projectId || options?.skip,
    ...options,
  });
  const login = data?.getProjectSsoLogin;
  return {
    name: (login?.name ?? '') as string,
    logoUrl: (login?.logoUrl ?? null) as string | null,
    providers: (login?.providers ?? []) as PublicSsoProvider[],
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
      return response.data?.createOidcSsoProvider as SsoProvider;
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
      return response.data?.updateSsoProvider as SsoProvider;
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
    settings: data?.getProjectSsoSettings as ProjectSsoSettings | undefined,
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
      const response = await mutation({
        variables: {
          projectId,
          input: input as UpdateProjectSsoSettingsMutationVariables['input'],
        },
      });
      return response.data?.updateProjectSsoSettings as ProjectSsoSettings;
    },
    [mutation],
  );
  return { invoke, loading, error };
};
