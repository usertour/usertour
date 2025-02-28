import { ListSkeleton } from '@/components/molecules/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { format } from 'date-fns';
import { MemberListAction } from './member-list-action';
import type { TeamMember } from '@usertour-ui/types';
import { useMemberContext } from '@/contexts/member-context';
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
              <TableHead>Role</TableHead>
              <TableHead>CreatedAt</TableHead>
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
