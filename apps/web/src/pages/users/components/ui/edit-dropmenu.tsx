import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { Delete2Icon } from '@usertour-packages/icons';
import { Segment } from '@usertour/types';
import { ReactNode, useState } from 'react';
import { UserSegmentDeleteForm } from '../dialogs';

type UserEditDropdownMenuProps = {
  segment: Segment;
  children: ReactNode;
  onSubmit: (action: string) => void;
  disabled?: boolean;
};
export const UserEditDropdownMenu = (props: UserEditDropdownMenuProps) => {
  const { segment, children, onSubmit, disabled = false } = props;
  const [openDelete, setOpenDelete] = useState(false);

  const handleOnClick = () => {
    setOpenDelete(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[101]">
          <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={handleOnClick}>
            <Delete2Icon className="mr-1" />
            Delete segment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UserSegmentDeleteForm
        segment={segment}
        open={openDelete}
        onOpenChange={setOpenDelete}
        onSubmit={() => {
          setOpenDelete(false);
          onSubmit('delete');
        }}
      />
    </>
  );
};

UserEditDropdownMenu.displayName = 'UserEditDropdownMenu';
