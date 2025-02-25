import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { Button } from '@usertour-ui/button';
import { useState } from 'react';
import { MemberCreateForm } from './member-create-form';

export const MemberListHeader = () => {
  const [open, setOpen] = useState(false);
  const { refetch } = useEnvironmentListContext();
  const handleCreate = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };
  return (
    <>
      <div className="relative ">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between ">
            <h3 className="text-2xl font-semibold tracking-tight">Team</h3>
            <Button onClick={handleCreate} className="flex-none">
              New Member
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>With members, you can invite other users to your project.</p>
          </div>
        </div>
      </div>
      <MemberCreateForm isOpen={open} onClose={handleOnClose} />
    </>
  );
};

MemberListHeader.displayName = 'MemberListHeader';
