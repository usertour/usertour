import { useQueryInviteListQuery } from '@usertour-packages/shared-hooks';
import { useQueryTeamMemberListQuery } from '@usertour-packages/shared-hooks';
import { TeamMember } from '@usertour/types';
import { ReactNode, createContext, useContext } from 'react';

export interface MemberProviderProps {
  children?: ReactNode;
  projectId: string;
}

export interface MemberContextValue {
  members: TeamMember[] | undefined;
  refetch: () => Promise<void>;
  loading: boolean;
}
export const MemberContext = createContext<MemberContextValue | undefined>(undefined);

export function MemberProvider(props: MemberProviderProps): JSX.Element {
  const { children, projectId } = props;
  const {
    teamMembers,
    loading: teamMembersLoading,
    refetch: refetchTeamMembers,
  } = useQueryTeamMemberListQuery(projectId);

  const {
    invites,
    loading: invitesLoading,
    refetch: refetchInvites,
  } = useQueryInviteListQuery(projectId);

  const refetch = async () => {
    await refetchTeamMembers();
    await refetchInvites();
  };

  const loading = invitesLoading || teamMembersLoading;
  const members = [...invites, ...teamMembers];

  const value: MemberContextValue = {
    members,
    refetch,
    loading,
  };

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}

export function useMemberContext(): MemberContextValue {
  const context = useContext(MemberContext);
  if (!context) {
    throw new Error('useMemberContext must be used within a MemberProvider.');
  }
  return context;
}
