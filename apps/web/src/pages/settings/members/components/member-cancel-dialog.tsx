'use client';

import type { TeamMember } from '@usertour-packages/types';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import { SpinnerIcon } from '@usertour-packages/icons';
import { useCancelInviteMutation } from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour-packages/utils';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';

interface EditFormProps {
  projectId: string;
  isOpen: boolean;
  data: TeamMember;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CancelInviteDialog = (props: EditFormProps) => {
  const { onSuccess, onCancel, isOpen, data, projectId } = props;
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { invoke } = useCancelInviteMutation();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  async function handleOnSubmit() {
    setIsLoading(true);
    try {
      if (!data.inviteId) {
        return;
      }
      const response = await invoke(projectId, data.inviteId);
      if (response) {
        onSuccess();
      }
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm </DialogTitle>
        </DialogHeader>
        <DialogDescription>Confirm canceling invite to {data.email}?</DialogDescription>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>
            No, do nothing
          </Button>
          <Button type="submit" disabled={isLoading} onClick={handleOnSubmit}>
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            Yes, cancel invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

CancelInviteDialog.displayName = 'CancelInviteDialog';
