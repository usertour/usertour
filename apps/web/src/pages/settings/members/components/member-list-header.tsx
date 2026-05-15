import { useMemberContext } from '@/contexts/member-context';
import { Button } from '@usertour/button';
import { useState, useCallback } from 'react';
import { MemberInviteDialog } from './member-invite-dialog';
import { RiAddLine } from '@usertour/icons';

export const MemberListHeader = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { refetch } = useMemberContext();

  const handleCreate = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleOnClose = useCallback(() => {
    setIsDialogOpen(false);
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold tracking-tight">Team</h3>
        <Button onClick={handleCreate} className="flex-none">
          <RiAddLine className="mr-2 h-4 w-4" />
          Add Team Member
        </Button>
      </div>
      <MemberInviteDialog isOpen={isDialogOpen} onClose={handleOnClose} />
    </div>
  );
};

MemberListHeader.displayName = 'MemberListHeader';
