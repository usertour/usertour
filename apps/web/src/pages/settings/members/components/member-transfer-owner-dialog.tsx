'use client';

import { TeamMemberRole, type TeamMember } from '@usertour/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour/alert-dialog';
import { RiAlertFill } from '@usertour/icons';
import { useChangeTeamMemberRoleMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { LoadingButton } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

interface EditFormProps {
  projectId: string;
  isOpen: boolean;
  data: TeamMember;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MemberTransferOwnerDialog = (props: EditFormProps) => {
  const { onSuccess, onCancel, isOpen, data, projectId } = props;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { invoke } = useChangeTeamMemberRoleMutation();

  const handleSubmit = async () => {
    if (!data.userId) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await invoke(projectId, data.userId, TeamMemberRole.OWNER);
      if (response) {
        onSuccess();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(op) => !op && onCancel()}>
      {/* Matches DeleteConfirmDialog's max-w-xl so destructive confirmations
          render at a consistent width across the settings module. */}
      <AlertDialogContent className="max-w-xl">
        {/* Row layout with the warning badge to the left of title+description,
            same pattern as DeleteConfirmDialog. */}
        <AlertDialogHeader className="flex-row gap-4 space-y-0 text-left sm:text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <RiAlertFill className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <AlertDialogTitle>{t('settings.team.transferOwner.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="settings.team.transferOwner.description"
                values={{ name: data.name }}
                components={{ strong: <strong className="font-bold text-foreground" /> }}
              />
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t('settings.team.transferOwner.cancelButton')}
          </AlertDialogCancel>
          <LoadingButton variant="destructive" onClick={handleSubmit} loading={isLoading}>
            {t('settings.team.transferOwner.confirmButton')}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

MemberTransferOwnerDialog.displayName = 'MemberTransferOwnerDialog';
