import { useQueryInviteListQuery, useQueryTeamMemberListQuery } from '@usertour/hooks';
import { useCallback, useMemo } from 'react';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useActiveProject } from './use-active-project';

// Composes the two member-list wrappers (active members + pending
// invites) into a single `members` array, mirroring the legacy
// `useMemberContext` value shape. Active-project-scoped — caller
// doesn't pass projectId.
export const useMemberList = () => {
  const project = useActiveProject();
  const projectId = project?.id;

  // SHARED_CACHE_QUERY_OPTIONS: this hook is called from members list +
  // member-row-actions in the same tree. Cache participation lets a
  // refetch from either side propagate.
  const {
    teamMembers,
    loading: teamMembersLoading,
    refetch: refetchTeamMembers,
  } = useQueryTeamMemberListQuery(projectId, SHARED_CACHE_QUERY_OPTIONS);
  const {
    invites,
    loading: invitesLoading,
    refetch: refetchInvites,
  } = useQueryInviteListQuery(projectId, SHARED_CACHE_QUERY_OPTIONS);

  const members = useMemo(() => [...invites, ...teamMembers], [invites, teamMembers]);
  const loading = invitesLoading || teamMembersLoading;
  const refetch = useCallback(async () => {
    await refetchTeamMembers();
    await refetchInvites();
  }, [refetchTeamMembers, refetchInvites]);

  return { members, loading, refetch };
};
