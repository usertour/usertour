import {
  QueryHookOptions,
  useMutation,
  useQuery,
  useLazyQuery,
  NetworkStatus,
} from '@apollo/client';
import {
  activeUserProject,
  cancelInvite,
  changeTeamMemberRole as changeTeamMemberRoleMutation,
  createAttribute,
  deleteAttribute,
  deleteContent,
  deleteEnvironments,
  deleteSegment,
  deleteSession,
  endSession,
  getAuthConfig,
  getInvite,
  getInvites,
  getTeamMembers,
  getUserEnvironments,
  inviteTeamMember as inviteTeamMemberMutation,
  listAttributes,
  listSegment,
  login,
  queryBizCompany,
  queryBizUser,
  queryContentQuestionAnalytics,
  queryContent,
  querySessionDetail,
  querySessionsByExternalId,
  removeTeamMember,
  signUp,
  updateContent,
  updateContentVersion,
  updateSegment,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionPlans,
  getSubscriptionByProjectId,
  getSubscriptionUsage,
  globalConfig,
  ListAccessTokens,
  DeleteAccessToken,
  GetAccessToken,
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
  logout,
  createContentVersion,
  resetUserPasswordByCode,
  deleteEvent,
  listEvents,
  deleteTheme,
  listThemes,
  deleteBizUser,
  deleteBizUserOnSegment,
} from '@usertour-packages/gql';

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
  Event,
  Theme,
} from '@usertour/types';

type UseContentListQueryProps = {
  query: {
    environmentId: string;
    type?: ContentDataType;
  };
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
}: UseContentListQueryProps) => {
  const { data, refetch, error } = useQuery(queryContent, {
    variables: {
      ...pagination,
      query,
      orderBy,
    },
  });
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const contentList = data?.queryContent?.edges.map((e: any) => e.node);

  const contents = contentList ? (contentList as Content[]) : [];

  return { contents, refetch, error };
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
  const { data, refetch, loading, error } = useQuery(queryBizCompany, {
    variables: {
      ...pagination,
      query,
      orderBy,
    },
    ...options,
  });

  const bizCompanyList = data?.queryBizCompany;
  const contents = bizCompanyList?.edges?.map((e: any) => ({ ...e.node })) || [];
  const pageInfo = bizCompanyList?.pageInfo;
  const totalCount = bizCompanyList?.totalCount || 0;

  return { contents, pageInfo, totalCount, refetch, loading, error };
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
  const { data, refetch, loading, error } = useQuery(queryBizUser, {
    variables: {
      ...pagination,
      query,
      orderBy,
    },
    ...options,
  });

  const bizUserList = data?.queryBizUser;
  const contents = bizUserList?.edges?.map((e: any) => ({ ...e.node, ...e.node.data })) || [];
  const pageInfo = bizUserList?.pageInfo;
  const totalCount = bizUserList?.totalCount || 0;

  return { contents, pageInfo, totalCount, refetch, loading, error };
};

export const useSegmentListQuery = (
  environmentId: string,
  bizType: string[] = ['COMPANY', 'USER'],
) => {
  const { data, refetch, loading, error } = useQuery(listSegment, {
    variables: { environmentId },
  });
  const segments =
    data?.listSegment?.length > 0
      ? data.listSegment.filter((item: Segment) => bizType.includes(item.bizType))
      : [];

  return { segmentList: segments as Segment[], refetch, loading, error };
};

export const useQueryTeamMemberListQuery = (projectId: string) => {
  const { data, refetch, loading, error } = useQuery(getTeamMembers, {
    variables: { projectId },
  });

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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

export const useQueryInviteListQuery = (projectId: string) => {
  const { data, refetch, loading, error } = useQuery(getInvites, {
    variables: { projectId },
  });

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
  const [inviteTeamMember, { loading, error }] = useMutation(inviteTeamMemberMutation);
  const invoke = async (
    projectId: string,
    name: string,
    email: string,
    role: string,
  ): Promise<boolean> => {
    const response = await inviteTeamMember({
      variables: { projectId, name, email, role },
    });
    return !!response.data?.inviteTeamMember;
  };

  return { invoke, loading, error };
};

export const useCancelInviteMutation = () => {
  const [mutation, { loading, error }] = useMutation(cancelInvite);
  const invoke = async (projectId: string, inviteId: string): Promise<boolean> => {
    const response = await mutation({ variables: { projectId, inviteId } });
    return !!response.data?.cancelInvite;
  };

  return { invoke, loading, error };
};

export const useRemoveTeamMemberMutation = () => {
  const [mutation, { loading, error }] = useMutation(removeTeamMember);
  const invoke = async (projectId: string, userId: string): Promise<boolean> => {
    const response = await mutation({ variables: { projectId, userId } });
    return !!response.data?.removeTeamMember;
  };

  return { invoke, loading, error };
};

export const useChangeTeamMemberRoleMutation = () => {
  const [mutation, { loading, error }] = useMutation(changeTeamMemberRoleMutation);
  const invoke = async (projectId: string, userId: string, role: string): Promise<boolean> => {
    const response = await mutation({ variables: { projectId, userId, role } });
    return !!response.data?.changeTeamMemberRole;
  };

  return { invoke, loading, error };
};

export const useGetInviteQuery = (inviteId: string) => {
  const { data, loading, error } = useQuery(getInvite, {
    variables: { inviteId },
  });
  return { data: data?.getInvite, loading, error };
};

export const useGetAuthConfigQuery = () => {
  const { data, loading, error } = useQuery(getAuthConfig);
  return { data: data?.getAuthConfig, loading, error };
};

export type LoginMutationVariables = {
  email: string;
  password: string;
  inviteCode?: string;
};

export const useLoginMutation = () => {
  const [mutation, { loading, error }] = useMutation(login);
  const invoke = async (variables: LoginMutationVariables) => {
    const response = await mutation({ variables });
    return response.data?.login;
  };
  return { invoke, loading, error };
};

export type SignupMutationVariables = {
  code: string;
  password: string;
  userName: string;
  companyName?: string;
  isInvite: boolean;
};

export const useSignupMutation = () => {
  const [mutation, { loading, error }] = useMutation(signUp);
  const invoke = async (variables: SignupMutationVariables) => {
    const response = await mutation({ variables });
    return response.data?.signup;
  };
  return { invoke, loading, error };
};

export const useActiveUserProjectMutation = () => {
  const [mutation, { loading, error }] = useMutation(activeUserProject);
  const invoke = async (userId: string, projectId: string): Promise<boolean> => {
    const response = await mutation({ variables: { userId, projectId } });
    return !!response.data?.activeUserProject;
  };
  return { invoke, loading, error };
};

export const useDeleteSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteSession);
  const invoke = async (sessionId: string): Promise<boolean> => {
    const response = await mutation({ variables: { sessionId } });
    return !!response.data?.deleteSession;
  };
  return { invoke, loading, error };
};

export const useEndSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(endSession);
  const invoke = async (sessionId: string): Promise<boolean> => {
    const response = await mutation({ variables: { sessionId } });
    return !!response.data?.endSession;
  };
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
  orderBy: { field: string; direction: 'asc' | 'desc' } = { field: 'createdAt', direction: 'desc' },
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
  const invoke = async (
    contentId: string,
    content: Pick<Content, 'name' | 'config' | 'buildUrl'>,
  ) => {
    const response = await mutation({ variables: { contentId, content } });
    return response.data?.updateContent;
  };
  return { invoke, loading, error };
};

export const useUpdateContentVersionMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateContentVersion);
  const invoke = async (
    versionId: string,
    content: { data?: any; config?: any; themeId?: string },
  ) => {
    const response = await mutation({ variables: { versionId, content } });
    return response.data?.updateContentVersion;
  };
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
  const [mutation, { loading, error }] = useMutation(createAttribute);
  const invoke = async (data: CreateAttributeMutationVariables) => {
    const response = await mutation({ variables: { data } });
    return response.data?.createAttribute;
  };
  return { invoke, loading, error };
};

export const useListAttributesQuery = (projectId: string, bizType: AttributeBizTypes) => {
  const { data, loading, error, refetch } = useQuery(listAttributes, {
    variables: { projectId, bizType },
  });
  const attributes = data?.listAttributes as Attribute[];
  return { attributes, loading, error, refetch };
};

export const useCreateCheckoutSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(createCheckoutSession);
  const invoke = async (data: {
    projectId: string;
    planType: string;
    interval: string;
  }): Promise<string> => {
    const response = await mutation({ variables: { data } });
    return response.data?.createCheckoutSession;
  };
  return { invoke, loading, error };
};

export const useCreatePortalSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(createPortalSession);
  const invoke = async (projectId: string): Promise<string> => {
    const response = await mutation({ variables: { projectId } });
    return response.data?.createPortalSession;
  };
  return { invoke, loading, error };
};

export const useGetSubscriptionPlansQuery = () => {
  const { data, loading, error, refetch } = useQuery(getSubscriptionPlans);
  const plans = data?.getSubscriptionPlans ?? [];
  return { plans, loading, error, refetch };
};

export const useGetSubscriptionByProjectIdQuery = (projectId: string) => {
  const { data, loading, error, refetch } = useQuery(getSubscriptionByProjectId, {
    variables: { projectId },
  });
  const subscription = data?.getSubscriptionByProjectId as Subscription | null;
  return { subscription, loading, error, refetch };
};

export const useGetSubscriptionUsageQuery = (projectId: string) => {
  const { data, loading, error, refetch } = useQuery(getSubscriptionUsage, {
    variables: { projectId },
  });
  const usage = data?.getSubscriptionUsage;
  return { usage, loading, error, refetch };
};

export const useGlobalConfigQuery = () => {
  const { data, loading, error } = useQuery(globalConfig);
  return { data: data?.globalConfig as GlobalConfig | undefined, loading, error };
};

export interface AccessToken {
  id: string;
  name: string;
  accessToken: string;
  createdAt: string;
}

export const useListAccessTokensQuery = (environmentId: string | undefined) => {
  const { data, loading, error, refetch, networkStatus } = useQuery(ListAccessTokens, {
    variables: { environmentId },
    skip: !environmentId,
    notifyOnNetworkStatusChange: true,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;

  const accessTokens = data?.listAccessTokens as AccessToken[] | undefined;
  return { accessTokens, loading, error, refetch, isRefetching };
};

export const useDeleteAccessTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteAccessToken);
  const invoke = async (environmentId: string, accessTokenId: string): Promise<boolean> => {
    const response = await mutation({ variables: { environmentId, accessTokenId } });
    return !!response.data?.deleteAccessToken;
  };
  return { invoke, loading, error };
};

export const useGetAccessTokenQuery = (
  environmentId: string,
  accessTokenId: string,
  options?: QueryHookOptions,
) => {
  const { data, loading, error } = useQuery(GetAccessToken, {
    variables: { environmentId, accessTokenId },
    ...options,
  });
  return { data: data?.getAccessToken, loading, error };
};

export const useUpdateProjectNameMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateProjectName);
  const invoke = async (projectId: string, name: string): Promise<boolean> => {
    const response = await mutation({ variables: { projectId, name } });
    return !!response.data?.updateProjectName;
  };
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
  const invoke = async (environmentId: string, provider: string, input: UpdateIntegrationInput) => {
    const response = await mutation({ variables: { environmentId, provider, input } });
    return response.data?.updateIntegration;
  };
  return { invoke, loading, error };
};

// Builder related hooks
export const useGetContentLazyQuery = () => {
  const [query, { loading, error }] = useLazyQuery(getContent);
  const invoke = async (contentId: string) => {
    const response = await query({ variables: { contentId } });
    return response.data?.getContent;
  };
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
  return { data: data?.getIntegration as IntegrationModel, loading, error, refetch };
};

export const useDisconnectIntegrationMutation = () => {
  const [mutation, { loading, error }] = useMutation(DisconnectIntegration);
  const invoke = async (environmentId: string, provider: string) => {
    const response = await mutation({ variables: { environmentId, provider } });
    return response.data?.disconnectIntegration;
  };
  return { invoke, loading, error };
};

export const useGetContentVersionLazyQuery = () => {
  const [query, { loading, error }] = useLazyQuery(getContentVersion);
  const invoke = async (versionId: string) => {
    const response = await query({ variables: { versionId } });
    return response.data?.getContentVersion;
  };
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
  const invoke = async (
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
  };
  return { invoke, loading, error };
};

export const useAddContentStepsMutation = () => {
  const [mutation, { loading, error }] = useMutation(addContentSteps);
  const invoke = async (variables: {
    contentId: string;
    versionId: string;
    themeId: string;
    steps: any[];
  }) => {
    const response = await mutation({ variables });
    return response.data?.addContentSteps;
  };
  return { invoke, loading, error };
};

export const useUpdateIntegrationObjectMappingMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateIntegrationObjectMapping);
  const invoke = async (
    id: string,
    input: {
      settings?: any;
      enabled?: boolean;
    },
  ) => {
    const response = await mutation({ variables: { id, input } });
    return response.data?.updateIntegrationObjectMapping;
  };
  return { invoke, loading, error };
};

export const useAddContentStepMutation = () => {
  const [mutation, { loading, error }] = useMutation(addContentStep);
  const invoke = async (data: { [key: string]: any; versionId: string }) => {
    const response = await mutation({ variables: { data } });
    return response.data?.addContentStep;
  };
  return { invoke, loading, error };
};

export const useDeleteIntegrationObjectMappingMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteIntegrationObjectMapping);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteIntegrationObjectMapping;
  };
  return { invoke, loading, error };
};

export const useUpdateContentStepMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateContentStep);
  const invoke = async (stepId: string, data: { [key: string]: any }) => {
    const response = await mutation({ variables: { stepId, data } });
    return response.data?.updateContentStep;
  };
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

export const useGetUserInfoQuery = (uid?: string, options?: QueryHookOptions) => {
  const { data, refetch, loading, error } = useQuery(getUserInfo, {
    skip: !uid,
    ...options,
  });
  return { data: data?.me, refetch, loading, error };
};

export const useLogoutMutation = () => {
  const [mutation, { loading, error }] = useMutation(logout);
  const invoke = async () => {
    const response = await mutation();
    return response.data?.logout;
  };
  return { invoke, loading, error };
};

export const useCreateContentVersionMutation = () => {
  const [mutation, { loading, error }] = useMutation(createContentVersion);
  const invoke = async (data: { versionId: string }) => {
    const response = await mutation({ variables: { data } });
    return response.data?.createContentVersion;
  };
  return { invoke, loading, error };
};

export const useResetUserPasswordByCodeMutation = () => {
  const [mutation, { loading, error }] = useMutation(resetUserPasswordByCode);
  const invoke = async (code: string, password: string) => {
    const response = await mutation({ variables: { code, password } });
    return response.data?.resetUserPasswordByCode;
  };
  return { invoke, loading, error };
};

export const useDeleteAttributeMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteAttribute);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteAttribute?.id;
  };
  return { invoke, loading, error };
};

export const useDeleteSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteSegment);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteSegment?.success;
  };
  return { invoke, loading, error };
};

export const useUpdateSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateSegment);
  const invoke = async (data: {
    id: string;
    data: any;
    name: string;
  }): Promise<boolean> => {
    const response = await mutation({ variables: { data } });
    return !!response.data?.updateSegment?.id;
  };
  return { invoke, loading, error };
};

export const useDeleteContentMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteContent);
  const invoke = async (contentId: string): Promise<boolean> => {
    const response = await mutation({ variables: { contentId } });
    return !!response.data?.deleteContent?.success;
  };
  return { invoke, loading, error };
};

export const useDeleteEnvironmentsMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteEnvironments);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteEnvironments?.id;
  };
  return { invoke, loading, error };
};

export const useGetUserEnvironmentsQuery = (projectId: string | undefined) => {
  const { data, refetch, loading, error, networkStatus } = useQuery(getUserEnvironments, {
    variables: { projectId },
    notifyOnNetworkStatusChange: true,
    skip: !projectId,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const environmentList = data?.userEnvironments as Environment[] | null;

  return { environmentList, refetch, loading, error, isRefetching };
};

export const useDeleteEventMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteEvent);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteEvent?.id;
  };
  return { invoke, loading, error };
};

export const useListEventsQuery = (projectId: string | undefined) => {
  const { data, refetch, loading, error, networkStatus } = useQuery(listEvents, {
    variables: { projectId, bizType: 0 },
    notifyOnNetworkStatusChange: true,
    skip: !projectId,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const eventList = data?.listEvents as Event[] | undefined;
  return { eventList, refetch, loading, error, isRefetching };
};

export const useDeleteThemeMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteTheme);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteTheme?.id;
  };
  return { invoke, loading, error };
};

export const useListThemesQuery = (projectId: string | undefined) => {
  const { data, refetch, loading, error, networkStatus } = useQuery(listThemes, {
    variables: { projectId },
    notifyOnNetworkStatusChange: true,
    skip: !projectId,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const themeList = data?.listThemes as Theme[] | null;
  return { themeList, refetch, loading, error, isRefetching };
};

export const useDeleteBizUserMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteBizUser);
  const invoke = async (data: { ids: string[]; environmentId: string }): Promise<{
    success: boolean;
    count: number;
  }> => {
    const response = await mutation({ variables: { data } });
    return {
      success: !!response.data?.deleteBizUser?.success,
      count: response.data?.deleteBizUser?.count ?? 0,
    };
  };
  return { invoke, loading, error };
};

export const useDeleteBizUserOnSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(deleteBizUserOnSegment);
  const invoke = async (data: { bizUserIds: string[]; segmentId: string }): Promise<{
    success: boolean;
    count: number;
  }> => {
    const response = await mutation({ variables: { data } });
    return {
      success: !!response.data?.deleteBizUserOnSegment?.success,
      count: response.data?.deleteBizUserOnSegment?.count ?? 0,
    };
  };
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

export const useUpdateProjectLicenseMutation = () => {
  const [mutation, { loading, error }] = useMutation(updateProjectLicense);

  const invoke = async (projectId: string, license: string) => {
    const response = await mutation({
      variables: { projectId, license },
    });
    return response.data?.updateProjectLicense;
  };

  return { invoke, loading, error };
};
