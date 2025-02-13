import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { Delete2Icon } from '@usertour-ui/icons';
import { Segment } from '@usertour-ui/types';
import { ReactNode, useState } from 'react';
import { CompanySegmentDeleteForm } from './delete-form';

type UserEditDropdownMenuProps = {
  segment: Segment;
  children: ReactNode;
  onSubmit: (action: string) => void;
};
export const UserEditDropdownMenu = (props: UserEditDropdownMenuProps) => {
  const { segment, children, onSubmit } = props;
  const [openDelete, setOpenDelete] = useState(false);

  const handleOnClick = () => {
    setOpenDelete(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[101]">
          <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={handleOnClick}>
            <Delete2Icon className="mr-1" />
            Delete segment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CompanySegmentDeleteForm
        segment={segment}
        open={openDelete}
        onOpenChange={setOpenDelete}
        onSubmit={() => {
          onSubmit('delete');
        }}
      />
    </>
  );
};

UserEditDropdownMenu.displayName = 'UserEditDropdownMenu';
