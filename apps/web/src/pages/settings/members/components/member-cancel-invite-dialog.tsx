'use client';

import type { TeamMember } from '@usertour/types';
import { Button } from '@usertour/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour/dialog';
import { SpinnerIcon } from '@usertour/icons';
import { useCancelInviteMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

interface EditFormProps {
  projectId: string;
  isOpen: boolean;
  data: TeamMember;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MemberCancelInviteDialog = (props: EditFormProps) => {
  const { onSuccess, onCancel, isOpen, data, projectId } = props;
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();
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
          <DialogTitle>{t('settings.team.cancelInvite.title')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t('settings.team.cancelInvite.description', { email: data.email })}
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>
            {t('settings.team.cancelInvite.cancelButton')}
          </Button>
          <Button type="submit" disabled={isLoading} onClick={handleOnSubmit}>
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.team.cancelInvite.confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

MemberCancelInviteDialog.displayName = 'MemberCancelInviteDialog';
