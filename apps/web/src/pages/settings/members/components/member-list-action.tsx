import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { Delete2Icon, EditIcon } from '@usertour-packages/icons';
import { useState } from 'react';
import type { TeamMember } from '@usertour/types';
import { TeamMemberRole } from '@usertour/types';
import { CancelInviteDialog } from './member-cancel-dialog';
import { useAppContext } from '@/contexts/app-context';
import { useMemberContext } from '@/contexts/member-context';
import { MemberChangeRoleDialog } from './member-change-role-dialog';
import { MemberRemoveDialog } from './member-remove-dialog';
import { TransferOwnerDialog } from './member-transfer-owner-dialog';
import { ArrowLeftRightIcon } from 'lucide-react';

type MemberListActionProps = {
  data: TeamMember;
};

export const MemberListAction = (props: MemberListActionProps) => {
  const { data } = props;
  const [open, setOpen] = useState(false);
  const { project } = useAppContext();
  const { refetch } = useMemberContext();
  const [openChangeRoleDialog, setOpenChangeRoleDialog] = useState(false);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
  const [openTransferOwnerDialog, setOpenTransferOwnerDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[200px]">
          {data.isInvite && (
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              onClick={() => setOpen(true)}
            >
              <Delete2Icon className="w-6" width={16} height={16} />
              <span>Cancel invite</span>
            </DropdownMenuItem>
          )}
          {!data.isInvite && (
            <>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={data.role === TeamMemberRole.OWNER}
                onClick={() => setOpenChangeRoleDialog(true)}
              >
                <EditIcon className="w-6" width={16} height={16} />
                Change role
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={data.role === TeamMemberRole.OWNER}
                onClick={() => setOpenTransferOwnerDialog(true)}
              >
                <ArrowLeftRightIcon className="w-6" width={16} height={16} />
                Transfer ownership to this user
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                disabled={data.role === TeamMemberRole.OWNER}
                onClick={() => setOpenRemoveDialog(true)}
              >
                <Delete2Icon className="w-6" width={16} height={16} />
                Remove member
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CancelInviteDialog
        projectId={project?.id as string}
        data={data}
        isOpen={open}
        onSuccess={() => {
          setOpen(false);
          refetch();
        }}
        onCancel={() => {
          setOpen(false);
        }}
      />
      <MemberChangeRoleDialog
        projectId={project?.id as string}
        isOpen={openChangeRoleDialog}
        data={data}
        onSuccess={() => {
          setOpenChangeRoleDialog(false);
          refetch();
        }}
        onCancel={() => {
          setOpenChangeRoleDialog(false);
        }}
      />
      <MemberRemoveDialog
        projectId={project?.id as string}
        isOpen={openRemoveDialog}
        data={data}
        onSuccess={() => {
          setOpenRemoveDialog(false);
          refetch();
        }}
        onCancel={() => {
          setOpenRemoveDialog(false);
        }}
      />
      <TransferOwnerDialog
        projectId={project?.id as string}
        isOpen={openTransferOwnerDialog}
        data={data}
        onSuccess={() => {
          setOpenTransferOwnerDialog(false);
          window.location.reload();
        }}
        onCancel={() => {
          setOpenTransferOwnerDialog(false);
        }}
      />
    </>
  );
};

MemberListAction.displayName = 'MemberListAction';
