import { QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  activeUserProject,
  cancelInvite,
  changeTeamMemberRole as changeTeamMemberRoleMutation,
  createAttribute,
  deleteSession,
  endSession,
  getAuthConfig,
  getInvite,
  getInvites,
  getTeamMembers,
  inviteTeamMember as inviteTeamMemberMutation,
  listAttributes,
  listSegment,
  login,
  queryContentQuestionAnalytics,
  queryContent,
  querySessionDetail,
  removeTeamMember,
  signUp,
  updateContent,
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
} from '@usertour-ui/gql';

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
  Subscription,
  GlobalConfig,
  UpdateIntegrationInput,
  IntegrationModel,
  SalesforceObjectFields,
} from '@usertour-ui/types';

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
  const { data, loading, error, refetch } = useQuery(ListAccessTokens, {
    variables: { environmentId },
    skip: !environmentId,
  });

  const accessTokens = data?.listAccessTokens as AccessToken[] | undefined;
  return { accessTokens, loading, error, refetch };
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

export const useDeleteIntegrationObjectMappingMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteIntegrationObjectMapping);
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteIntegrationObjectMapping;
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
