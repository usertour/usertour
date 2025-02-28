import { useMutation, useQuery } from '@apollo/client';
import {
  getInvites,
  getTeamMembers,
  inviteTeamMember as inviteTeamMemberMutation,
  listSegment,
  queryContents,
} from '@usertour-ui/gql';
import type { Content, ContentDataType, Pagination, Segment, TeamMember } from '@usertour-ui/types';

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
  const { data, refetch, error } = useQuery(queryContents, {
    variables: {
      ...pagination,
      query,
      orderBy,
    },
  });
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const contentList = data?.queryContents?.edges.map((e: any) => e.node);

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
  const teamMembers: TeamMember[] = data?.getTeamMembers?.map((item: any) => ({
    id: item.user.id,
    name: item.user.name,
    email: item.user.email,
    role: item.role,
    logo: item.user.logo,
    createdAt: item.createdAt,
  }));

  return { teamMembers, refetch, loading, error };
};

export const useQueryInviteListQuery = (projectId: string) => {
  const { data, refetch, loading, error } = useQuery(getInvites, {
    variables: { projectId },
  });

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const invites: TeamMember[] = data?.getInvites?.map((item: any) => ({
    id: item.id,
    name: item.name,
    email: item.email,
    role: item.role,
    createdAt: item.createdAt,
  }));

  return { invites, refetch, loading, error };
};

export const useInviteTeamMemberMutation = async (
  projectId: string,
  name: string,
  email: string,
  role: string,
) => {
  const [inviteTeamMember, { loading, error }] = useMutation(inviteTeamMemberMutation);
  const success = await inviteTeamMember({
    variables: { projectId, name, email, role },
  });
  return { success, loading, error };
};
