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
import { useRemoveTeamMemberMutation } from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour-packages/utils';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';

interface MemberRemoveDialogProps {
  projectId: string;
  isOpen: boolean;
  data: TeamMember;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MemberRemoveDialog = (props: MemberRemoveDialogProps) => {
  const { onSuccess, onCancel, isOpen, data, projectId } = props;
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { invoke } = useRemoveTeamMemberMutation();

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
      const response = await invoke(projectId, data.userId);
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
        <DialogDescription>Confirm removing member, {data.email}?</DialogDescription>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>
            Canel
          </Button>
          <Button type="submit" disabled={isLoading} onClick={handleOnSubmit}>
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            Remove member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

MemberRemoveDialog.displayName = 'MemberRemoveDialog';
