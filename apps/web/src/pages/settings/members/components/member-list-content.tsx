import { ListSkeleton } from '@/components/molecules/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { MemberListAction } from './member-list-action';
import type { TeamMember } from '@usertour-ui/types';
import { useMemberContext } from '@/contexts/member-context';
import { Avatar, AvatarImage } from '@usertour-ui/avatar';
import { getGravatarUrl } from '@/utils/avatar';
import { Badge } from '@usertour-ui/badge';

interface MemberListContentTableRowProps {
  data: TeamMember;
}
const MemberListContentTableRow = (props: MemberListContentTableRowProps) => {
  const { data } = props;

  return (
    <TableRow className="cursor-pointer">
      <TableCell>
        <div className="flex flex-row items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={getGravatarUrl(data.email)} />
          </Avatar>
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
              members?.map((member: TeamMember) => (
                <MemberListContentTableRow data={member} key={member.id} />
              ))}
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
