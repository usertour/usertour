import { ListSkeleton } from '@/components/molecules/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { format } from 'date-fns';
import { MemberListAction } from './member-list-action';
import { useQueryInviteListQuery, useQueryTeamMemberListQuery } from '@usertour-ui/shared-hooks';
import type { TeamMember } from '@usertour-ui/types';
interface MemberListContentTableRowProps {
  data: TeamMember;
}
const MemberListContentTableRow = (props: MemberListContentTableRowProps) => {
  const { data } = props;

  return (
    <TableRow className="cursor-pointer">
      <TableCell>{data.name}</TableCell>
      <TableCell>{data.role}</TableCell>
      <TableCell>{format(new Date(data.createdAt), 'PPpp')}</TableCell>
      <TableCell>
        <MemberListAction data={data} />
      </TableCell>
    </TableRow>
  );
};

interface MemberListContentProps {
  projectId: string;
}

export const MemberListContent = ({ projectId }: MemberListContentProps) => {
  const { teamMembers, loading } = useQueryTeamMemberListQuery(projectId);
  const { invites, loading: invitesLoading } = useQueryInviteListQuery(projectId);

  if (loading || invitesLoading) {
    return <ListSkeleton />;
  }

  return (
    <>
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>CreatedAt</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites?.length > 0 &&
              invites.map((invite: TeamMember) => (
                <MemberListContentTableRow data={invite} key={invite.id} />
              ))}
            {teamMembers?.length > 0 &&
              teamMembers.map((member: TeamMember) => (
                <MemberListContentTableRow data={member} key={member.id} />
              ))}
            {invites?.length === 0 && teamMembers?.length === 0 && (
              <TableRow>
                <TableCell className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

MemberListContent.displayName = 'MemberListContent';
