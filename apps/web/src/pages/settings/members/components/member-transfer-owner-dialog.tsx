'use client';

import { TeamMemberRole, type TeamMember } from '@/types/theme-settings';
import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-ui/dialog';
import { SpinnerIcon } from '@usertour-ui/icons';
import { useChangeTeamMemberRoleMutation } from '@usertour-ui/shared-hooks';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';
import * as React from 'react';

interface EditFormProps {
  projectId: string;
  isOpen: boolean;
  data: TeamMember;
  onClose: () => void;
}

export const TransferOwnerDialog = (props: EditFormProps) => {
  const { onClose, isOpen, data, projectId } = props;
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { invoke } = useChangeTeamMemberRoleMutation();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  async function handleOnSubmit() {
    setIsLoading(true);
    try {
      if (!data.userId) {
        return;
      }
      const response = await invoke(projectId, data.userId, TeamMemberRole.OWNER);
      if (response) {
        onClose();
      }
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer account ownership</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Only one user can be the owner of your Usertour account. Once you transfer ownership, you
          can't undo it. Confirm transferring account ownership to {data.name}?
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={'destructive'}
            disabled={isLoading}
            onClick={handleOnSubmit}
          >
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            Transfer account ownership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

TransferOwnerDialog.displayName = 'TransferOwnerDialog';
