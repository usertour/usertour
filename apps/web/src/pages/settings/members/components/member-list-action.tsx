import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { CloseIcon, EditIcon } from '@usertour-ui/icons';
import { useState } from 'react';
import { MemberDeleteForm } from './member-delete-form';
import { MemberEditForm } from './member-edit-form';

type MemberListActionProps = {
  data: any;
};

export const MemberListAction = (props: MemberListActionProps) => {
  const { data } = props;
  const [open, setOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  // const { refetch } = useMemberListContext();
  const handleOpen = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    // refetch();
  };
  const handleDeleteOpen = () => {
    setOpenDeleteDialog(true);
  };
  const handleDeleteClose = () => {
    setOpenDeleteDialog(false);
    // refetch();
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuItem onClick={handleOpen}>
            <EditIcon className="w-6" width={12} height={12} />
            Rename environment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDeleteOpen}>
            <CloseIcon className="w-6" width={16} height={16} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MemberEditForm data={data} isOpen={open} onClose={handleOnClose} />
      <MemberDeleteForm
        data={data}
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        onSubmit={handleDeleteClose}
      />
    </>
  );
};

MemberListAction.displayName = 'MemberListAction';
