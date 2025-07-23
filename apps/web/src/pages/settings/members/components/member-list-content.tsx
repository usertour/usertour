import { ListSkeleton } from '@/components/molecules/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { MemberListAction } from './member-list-action';
import type { TeamMember } from '@usertour-packages/types';
import { useMemberContext } from '@/contexts/member-context';
import { Badge } from '@usertour-packages/badge';
import { UserAvatar } from '@/components/molecules/user-avatar';

interface MemberListContentTableRowProps {
  data: TeamMember;
}
const MemberListContentTableRow = (props: MemberListContentTableRowProps) => {
  const { data } = props;

  return (
    <TableRow className="cursor-pointer">
      <TableCell>
        <div className="flex flex-row items-center gap-2">
          <UserAvatar email={data.email} name={data.name} />
          <span>{data.name}</span>
          {data.isInvite && <Badge variant="success">Invite pending</Badge>}
        </div>
      </TableCell>
      <TableCell>{data.email}</TableCell>
      <TableCell>{data.role}</TableCell>
      {/* <TableCell>{format(new Date(data.createdAt), 'PPpp')}</TableCell> */}
      <TableCell>
        <MemberListAction data={data} />
      </TableCell>
    </TableRow>
  );
};

export const MemberListContent = () => {
  const { members, loading } = useMemberContext();

  if (loading) {
    return <ListSkeleton />;
  }
  const isEmpty = members && members.length === 0;

  return (
    <>
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {/* <TableHead>CreatedAt</TableHead> */}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isEmpty &&
              members?.map((member: TeamMember) => {
                const key = member.isInvite ? member.inviteId : member.userId;
                return <MemberListContentTableRow data={member} key={key} />;
              })}
            {isEmpty && (
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
