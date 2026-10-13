import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import type { TeamMember } from '@usertour/types';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  ActiveUserProjectDocument,
  CancelInviteDocument,
  GetInvitesDocument,
  type GetInvitesQuery,
  type GetInvitesQueryVariables,
  GetTeamMembersDocument,
  type GetTeamMembersQuery,
  type GetTeamMembersQueryVariables,
  RemoveTeamMemberDocument,
  type Role,
  ChangeTeamMemberRoleDocument as changeTeamMemberRoleMutation,
  InviteTeamMemberDocument as inviteTeamMemberMutation,
  TransferProjectOwnershipDocument as transferProjectOwnershipMutation,
} from '../graphql';

// Domain wrappers for `team.graphql`: members, invites and the active project.

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
