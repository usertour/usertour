import {
  QueryHookOptions,
  useApolloClient,
  useMutation,
  useQuery,
  useLazyQuery,
  NetworkStatus,
} from '@apollo/client';
import { useCallback } from 'react';
import {
  activeUserProject,
  cancelInvite,
  changeTeamMemberRole as changeTeamMemberRoleMutation,
  createAttribute,
  createBizCompanyOnSegment,
  createBizUserOnSegment,
  createEnvironments,
  createSegment,
  deleteAttribute,
  deleteBizCompany,
  deleteBizCompanyOnSegment,
  deleteContent,
  deleteEnvironments,
  deleteSegment,
  deleteSession,
  endSession,
  getInvites,
  getTeamMembers,
  getUserEnvironments,
  inviteTeamMember as inviteTeamMemberMutation,
  listAttributes,
  listSegment,
  queryBizCompany,
  queryBizUser,
  queryContentQuestionAnalytics,
  queryContent,
  querySessionDetail,
  querySessionsByExternalId,
  removeTeamMember,
  updateAttribute,
  updateContent,
  updateContentVersion,
  updateEnvironments,
  updateSegment,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionPlans,
  getSubscriptionByProjectId,
  getSubscriptionUsage,
  globalConfig,
  getProjectConfig,
  updateProjectName,
  getProjectLicenseInfo,
  updateProjectLicense,
  ListIntegrations,
  UpdateIntegration,
  GetSalesforceAuthUrl,
  GetIntegration,
  DisconnectIntegration,
  GetIntegrationObjectMappings,
  GetIntegrationObjectMapping,
  UpsertIntegrationObjectMapping,
  UpdateIntegrationObjectMapping,
  DeleteIntegrationObjectMapping,
  GetSalesforceObjectFields,
  getContent,
  getContentVersion,
  addContentSteps,
  addContentStep,
  updateContentStep,
  getUserInfo,
  createContentVersion,
  deleteBizUser,
  deleteBizUserOnSegment,
  adminSettings,
  adminInstanceSettings,
  updateInstanceLicense,
  updateInstanceGeneralSettings,
  updateInstanceAuthenticationSettings,
  adminUsers,
  adminCreateUser,
  updateUserSystemAdmin,
  updateUserDisabled,
  adminProjects,
  adminCreateProject,
  updateProjectUsesInstanceLicense,
  adminProjectMembers,
  adminAddProjectMember,
  adminChangeProjectMemberRole,
  adminTransferProjectOwnership,
  adminRemoveProjectMember,
  updateInstanceRequire2FA,
  getTheme,
  listLocalizations,
} from '@usertour/gql';

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
  UpdateIntegrationInput,
  IntegrationModel,
  SalesforceObjectFields,
  SessionQuery,
  ColumnSetting,
  RulesCondition,
  Theme,
  Localization,
} from '@usertour/types';

type UseContentListQueryProps = {
  // Index signature mirrors the server's ContentQuery input — callers
  // pass `published` / etc. in addition to the always-required keys.
  query: {
    environmentId: string;
    type?: ContentDataType;
    [key: string]: unknown;
  };
  options?: QueryHookOptions;
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
  const { data, refetch, error, loading } = useQuery(queryContent, {
    ...options,
    variables: {
      ...pagination,
      query,
      orderBy,
    },
  });
  const contentList = data?.queryContent?.edges.map((e: any) => e.node);
  const pageInfo = data?.queryContent?.pageInfo;
  const totalCount = data?.queryContent?.totalCount;

  const contents = contentList ? (contentList as Content[]) : [];

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
}: UseCompanyListQueryProps & { options?: QueryHookOptions }) => {
  // See `useContentListQuery` — `...options` first, `variables` last,
  // so caller can't accidentally clobber wrapper-composed variables.
  const { data, refetch, loading, error, networkStatus } = useQuery(queryBizCompany, {
    ...options,
    variables: {
      ...pagination,
      query,
      orderBy,
    },
  });

  const bizCompanyList = data?.queryBizCompany;
  const contents = bizCompanyList?.edges?.map((e: any) => ({ ...e.node })) || [];
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
}: UseUserListQueryProps & { options?: QueryHookOptions }) => {
  // See `useContentListQuery` — `...options` first, `variables` last,
  // so caller can't accidentally clobber wrapper-composed variables.
  const { data, refetch, loading, error, networkStatus } = useQuery(queryBizUser, {
    ...options,
    variables: {
      ...pagination,
      query,
      orderBy,
    },
  });

  const bizUserList = data?.queryBizUser;
  const contents = bizUserList?.edges?.map((e: any) => ({ ...e.node, ...e.node.data })) || [];
  const pageInfo = bizUserList?.pageInfo;
  const totalCount = bizUserList?.totalCount || 0;

  // See useCompanyListQuery — same networkStatus opt-in pattern.
  return { contents, pageInfo, totalCount, refetch, loading, error, networkStatus };
};

export const useSegmentListQuery = (
  environmentId: string,
  bizType: string[] = ['COMPANY', 'USER'],
  options?: QueryHookOptions,
) => {
  const { data, refetch, loading, error, networkStatus } = useQuery(listSegment, {
    variables: { environmentId },
    ...options,
  });
  const segments =
    data?.listSegment?.length > 0
      ? data.listSegment.filter((item: Segment) => bizType.includes(item.bizType))
      : [];

  // See useCompanyListQuery — same networkStatus opt-in pattern.
  return { segmentList: segments as Segment[], refetch, loading, error, networkStatus };
};

export const useQueryTeamMemberListQuery = (
  projectId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, refetch, loading, error } = useQuery(getTeamMembers, {
    variables: { projectId },
    skip: !projectId,
    ...options,
  });

  const teamMembers: TeamMember[] =
    data?.getTeamMembers?.map((item: any) => ({
      userId: item.user.id,
      name: item.user.name,
      email: item.user.email,
      role: item.role,
      logo: item.user.logo,
      isInvite: false,
      createdAt: item.createdAt,
    })) ?? [];

  return { teamMembers, refetch, loading, error };
};

export const useQueryInviteListQuery = (
  projectId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, refetch, loading, error } = useQuery(getInvites, {
    variables: { projectId },
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
    async (projectId: string, name: string, email: string, role: string): Promise<boolean> => {
      const response = await inviteTeamMember({
        variables: { projectId, name, email, role },
      });
      return !!response.data?.inviteTeamMember;
    },
    [inviteTeamMember],
  );

  return { invoke, loading, error };
};

export const useCancelInviteMutation = () => {
  const [mutation, { loading, error }] = useMutation(cancelInvite, {
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
  const [mutation, { loading, error }] = useMutation(removeTeamMember, {
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
    async (projectId: string, userId: string, role: string): Promise<boolean> => {
      const response = await mutation({ variables: { projectId, userId, role } });
      return !!response.data?.changeTeamMemberRole;
    },
    [mutation],
  );

  return { invoke, loading, error };
};

export const useActiveUserProjectMutation = () => {
  const [mutation, { loading, error }] = useMutation(activeUserProject);
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
  const [mutation, { loading, error }] = useMutation(deleteSession);
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
  const [mutation, { loading, error }] = useMutation(endSession);
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
  const { data, loading, error, refetch } = useQuery(querySessionDetail, {
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
  const { data, loading, error, refetch } = useQuery(querySessionsByExternalId, {
    variables: {
      query,
      orderBy,
      ...pagination,
    },
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
  const { data, loading, error, refetch } = useQuery(queryContentQuestionAnalytics, {
    variables: { contentId, startDate, endDate, timezone, environmentId },
  });
  const questionAnalytics = data?.queryContentQuestionAnalytics as ContentQuestionAnalytics[];
  return { questionAnalytics, loading, error, refetch };
};

export const useUpdateContentMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateContent);
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
  const [mutation, { loading, error }] = useMutation(updateContentVersion);
  const invoke = useCallback(
    async (
      versionId: string,
      content: {
        data?: unknown;
        config?: unknown;
        themeId?: string;
        scheduledAt?: Date | null;
      },
    ) => {
      const response = await mutation({ variables: { versionId, content } });
      return response.data?.updateContentVersion;
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
};

export const useCreateAttributeMutation = () => {
  const [mutation, { loading, error }] = useMutation(createAttribute, {
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
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch } = useQuery(listAttributes, {
    variables: { projectId, bizType },
    ...options,
  });
  const attributes = data?.listAttributes as Attribute[];
  return { attributes, loading, error, refetch };
};

export const useCreateCheckoutSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(createCheckoutSession);
  const invoke = useCallback(
    async (data: {
      projectId: string;
      planType: string;
      interval: string;
    }): Promise<string> => {
      const response = await mutation({ variables: { data } });
      return response.data?.createCheckoutSession;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useCreatePortalSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(createPortalSession);
  const invoke = useCallback(
    async (projectId: string): Promise<string> => {
      const response = await mutation({ variables: { projectId } });
      return response.data?.createPortalSession;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useGetSubscriptionPlansQuery = () => {
  const { data, loading, error, refetch } = useQuery(getSubscriptionPlans);
  const plans = data?.getSubscriptionPlans ?? [];
  return { plans, loading, error, refetch };
};

export const useGetSubscriptionByProjectIdQuery = (
  projectId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch } = useQuery(getSubscriptionByProjectId, {
    variables: { projectId },
    skip: !projectId,
    ...options,
  });
  const subscription = data?.getSubscriptionByProjectId as Subscription | null;
  return { subscription, loading, error, refetch };
};

export const useGetSubscriptionUsageQuery = (
  projectId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch } = useQuery(getSubscriptionUsage, {
    variables: { projectId },
    skip: !projectId,
    ...options,
  });
  const usage = data?.getSubscriptionUsage ?? 0;
  return { usage, loading, error, refetch };
};

export const useGlobalConfigQuery = () => {
  const { data, loading, error } = useQuery(globalConfig);
  return {
    data: data?.globalConfig as GlobalConfig | undefined,
    loading,
    error,
  };
};

export const useUpdateProjectNameMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateProjectName);
  const invoke = useCallback(
    async (projectId: string, name: string): Promise<boolean> => {
      const response = await mutation({ variables: { projectId, name } });
      return !!response.data?.updateProjectName;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useListIntegrationsQuery = (environmentId: string, options?: QueryHookOptions) => {
  const { data, loading, error, refetch } = useQuery(ListIntegrations, {
    variables: { environmentId },
    ...options,
  });
  return { data: data?.listIntegrations, loading, error, refetch };
};

export const useUpdateIntegrationMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateIntegration);
  const invoke = useCallback(
    async (environmentId: string, provider: string, input: UpdateIntegrationInput) => {
      const response = await mutation({
        variables: { environmentId, provider, input },
      });
      return response.data?.updateIntegration;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

// Builder related hooks
export const useGetContentLazyQuery = () => {
  const [query, { loading, error }] = useLazyQuery(getContent);
  const invoke = useCallback(
    async (contentId: string) => {
      const response = await query({ variables: { contentId } });
      return response.data?.getContent;
    },
    [query],
  );
  return { invoke, loading, error };
};

export const useGetSalesforceAuthUrlQuery = (
  environmentId: string,
  provider: string,
  options?: QueryHookOptions,
) => {
  const { data, loading, error } = useQuery(GetSalesforceAuthUrl, {
    variables: { environmentId, provider },
    ...options,
  });
  return { data: data?.getSalesforceAuthUrl, loading, error };
};

export const useGetIntegrationQuery = (
  environmentId: string,
  provider: string,
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch } = useQuery(GetIntegration, {
    variables: { environmentId, provider },
    ...options,
  });
  return {
    data: data?.getIntegration as IntegrationModel,
    loading,
    error,
    refetch,
  };
};

export const useDisconnectIntegrationMutation = () => {
  const [mutation, { loading, error }] = useMutation(DisconnectIntegration);
  const invoke = useCallback(
    async (environmentId: string, provider: string) => {
      const response = await mutation({ variables: { environmentId, provider } });
      return response.data?.disconnectIntegration;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useGetContentVersionLazyQuery = () => {
  const [query, { loading, error }] = useLazyQuery(getContentVersion);
  const invoke = useCallback(
    async (versionId: string) => {
      const response = await query({ variables: { versionId } });
      return response.data?.getContentVersion;
    },
    [query],
  );
  return { invoke, loading, error };
};

export const useGetIntegrationObjectMappingsQuery = (
  integrationId: string,
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch } = useQuery(GetIntegrationObjectMappings, {
    variables: { integrationId },
    ...options,
  });
  return { data: data?.getIntegrationObjectMappings, loading, error, refetch };
};

export const useGetIntegrationObjectMappingQuery = (id: string, options?: QueryHookOptions) => {
  const { data, loading, error, refetch } = useQuery(GetIntegrationObjectMapping, {
    variables: { id },
    ...options,
  });
  return { data: data?.getIntegrationObjectMapping, loading, error, refetch };
};

export const useUpsertIntegrationObjectMappingMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpsertIntegrationObjectMapping);
  const invoke = useCallback(
    async (
      integrationId: string,
      input: {
        sourceObjectType: string;
        destinationObjectType: string;
        settings?: any;
        enabled?: boolean;
      },
    ) => {
      const response = await mutation({ variables: { integrationId, input } });
      return response.data?.upsertIntegrationObjectMapping;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useAddContentStepsMutation = () => {
  const [mutation, { loading, error }] = useMutation(addContentSteps);
  const invoke = useCallback(
    async (variables: {
      contentId: string;
      versionId: string;
      themeId: string;
      steps: any[];
    }) => {
      const response = await mutation({ variables });
      return response.data?.addContentSteps;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateIntegrationObjectMappingMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateIntegrationObjectMapping);
  const invoke = useCallback(
    async (
      id: string,
      input: {
        settings?: any;
        enabled?: boolean;
      },
    ) => {
      const response = await mutation({ variables: { id, input } });
      return response.data?.updateIntegrationObjectMapping;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useAddContentStepMutation = () => {
  const [mutation, { loading, error }] = useMutation(addContentStep);
  const invoke = useCallback(
    async (data: { [key: string]: any; versionId: string }) => {
      const response = await mutation({ variables: { data } });
      return response.data?.addContentStep;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteIntegrationObjectMappingMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteIntegrationObjectMapping);
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({ variables: { id } });
      return !!response.data?.deleteIntegrationObjectMapping;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useUpdateContentStepMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateContentStep);
  const invoke = useCallback(
    async (stepId: string, data: { [key: string]: any }) => {
      const response = await mutation({ variables: { stepId, data } });
      return response.data?.updateContentStep;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useGetSalesforceObjectFieldsQuery = (
  integrationId: string,
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch } = useQuery(GetSalesforceObjectFields, {
    variables: { integrationId },
    ...options,
  });
  return {
    data: data?.getSalesforceObjectFields as SalesforceObjectFields | undefined,
    loading,
    error,
    refetch,
  };
};

export const useCreateContentVersionMutation = () => {
  // Forking the version inserts a new row at the top of the paginated
  // version-history list — Apollo's normalized cache can't materialise
  // a new edge from the mutation response, so refetch the list query.
  const [mutation, { loading, error }] = useMutation(createContentVersion, {
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
  const [mutation, { loading, error }] = useMutation(deleteAttribute);
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
  const [mutation, { loading, error }] = useMutation(deleteSegment);
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
// auto-merge. The updateSegment gql response only selects `{ id }`
// (see packages/gql/src/gql/segment.ts), so auto-merge into the cached
// Segment entity is a no-op. To migrate to auto-merge later, expand
// the gql response to mirror listSegment's selection set, then drop
// refetchQueries here.
export const useUpdateSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateSegment, {
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
  const [mutation, { loading, error }] = useMutation(deleteContent);
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
  const [mutation, { loading, error }] = useMutation(deleteEnvironments);
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
  const [mutation, { loading, error }] = useMutation(createEnvironments, {
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
  const [mutation, { loading, error }] = useMutation(updateEnvironments, {
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
  const [mutation, { loading, error }] = useMutation(updateAttribute);
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
  options?: QueryHookOptions,
) => {
  const { data, refetch, loading, error, networkStatus } = useQuery(getUserEnvironments, {
    variables: { projectId },
    notifyOnNetworkStatusChange: true,
    skip: !projectId,
    ...options,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const environmentList = data?.userEnvironments as Environment[] | null;

  return { environmentList, refetch, loading, error, isRefetching };
};

export const useDeleteBizUserMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteBizUser);
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
  const [mutation, { loading, error }] = useMutation(deleteBizUserOnSegment, {
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

// Generic data type lets callers pass the entity-specific shape
// (`CreatSegment` for create, `CreateBizUserOnSegment` for add-to-segment,
// etc.) without the wrapper having to know every server input type.
type MutationVariables = { data: Record<string, unknown> };

export const useCreateSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(createSegment, {
    refetchQueries: ['listSegment'],
  });
  const invoke = useCallback((variables: MutationVariables) => mutation({ variables }), [mutation]);
  return { invoke, loading, error };
};

export const useCreateBizUserOnSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(createBizUserOnSegment, {
    refetchQueries: ['queryBizUser'],
  });
  const invoke = useCallback((variables: MutationVariables) => mutation({ variables }), [mutation]);
  return { invoke, loading, error };
};

export const useCreateBizCompanyOnSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(createBizCompanyOnSegment, {
    refetchQueries: ['queryBizCompany'],
  });
  const invoke = useCallback((variables: MutationVariables) => mutation({ variables }), [mutation]);
  return { invoke, loading, error };
};

export const useDeleteBizCompanyOnSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteBizCompanyOnSegment, {
    refetchQueries: ['queryBizCompany'],
  });
  const invoke = useCallback((variables: MutationVariables) => mutation({ variables }), [mutation]);
  return { invoke, loading, error };
};

export const useDeleteBizCompanyMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteBizCompany);
  const invoke = useCallback(
    async (data: {
      ids: string[];
      environmentId: string;
    }): Promise<{ success: boolean; count: number }> => {
      const response = await mutation({
        variables: { data },
        // queryBizCompany returns BizConnection (paginated BizModel),
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
  const { data, loading, error, refetch } = useQuery(getProjectLicenseInfo, {
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
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch } = useQuery(getProjectConfig, {
    variables: { projectId },
    skip: !projectId || options?.skip,
    ...options,
  });

  return {
    projectConfig: data?.getProjectConfig as {
      removeBranding: boolean;
      planType: string;
    } | null,
    loading,
    error,
    refetch,
  };
};

export const useUpdateProjectLicenseMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateProjectLicense);

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
  const { data, loading, error, refetch } = useQuery(adminSettings);
  return { data: data?.adminSettings, loading, error, refetch };
};

export const useAdminInstanceSettingsQuery = () => {
  const { data, loading, error, refetch } = useQuery(adminInstanceSettings);
  return { data: data?.adminInstanceSettings, loading, error, refetch };
};

export const useUpdateInstanceLicenseMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateInstanceLicense);
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
  const [mutation, { loading, error }] = useMutation(updateInstanceGeneralSettings);
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
  const [mutation, { loading, error }] = useMutation(updateInstanceAuthenticationSettings);
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
  const { data, loading, error, refetch } = useQuery(adminUsers, {
    variables: { query, page, pageSize, status, role },
  });
  return { data: data?.adminUsers, loading, error, refetch };
};

export const useAdminCreateUserMutation = () => {
  const [mutation, { loading, error }] = useMutation(adminCreateUser);
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
  const [mutation, { loading, error }] = useMutation(updateUserSystemAdmin);
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
  const [mutation, { loading, error }] = useMutation(updateUserDisabled);
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
  const { data, loading, error, refetch } = useQuery(adminProjects, {
    variables: { query, page, pageSize, usesInstanceLicense },
  });
  return { data: data?.adminProjects, loading, error, refetch };
};

export const useAdminCreateProjectMutation = () => {
  const [mutation, { loading, error }] = useMutation(adminCreateProject);
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
  const [mutation, { loading, error }] = useMutation(updateProjectUsesInstanceLicense);
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
  const { data, loading, error, refetch } = useQuery(adminProjectMembers, {
    variables: { projectId },
    skip: !projectId,
  });
  return { data: data?.adminProjectMembers, loading, error, refetch };
};

export const useAdminAddProjectMemberMutation = () => {
  const [mutation, { loading, error }] = useMutation(adminAddProjectMember);
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
  const [mutation, { loading, error }] = useMutation(adminChangeProjectMemberRole);
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
  const [mutation, { loading, error }] = useMutation(adminTransferProjectOwnership);
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
  const [mutation, { loading, error }] = useMutation(adminRemoveProjectMember);
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
  const [mutation, { loading, error }] = useMutation(updateInstanceRequire2FA);
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
    await apollo.refetchQueries({ include: [getUserInfo, globalConfig] }).catch(() => undefined);
  }, [apollo]);
};

export const useGetThemeQuery = (themeId: string | undefined, options?: QueryHookOptions) => {
  const { data, refetch, loading, error } = useQuery(getTheme, {
    variables: { themeId },
    skip: !themeId,
    ...options,
  });
  return { theme: data?.getTheme as Theme | undefined, refetch, loading, error };
};

export const useListLocalizationsQuery = (
  projectId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, refetch, loading, error } = useQuery(listLocalizations, {
    variables: { projectId },
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
