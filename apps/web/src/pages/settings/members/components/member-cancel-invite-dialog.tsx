'use client';

import type { TeamMember } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useCancelInviteMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
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

export const MemberCancelInviteDialog = (props: EditFormProps) => {
  const { onSuccess, onCancel, isOpen, data, projectId } = props;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { invoke } = useCancelInviteMutation();

  const handleSubmit = async () => {
    if (!data.inviteId) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await invoke(projectId, data.inviteId);
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
    <DestructiveConfirmDialog
      title={t('settings.team.cancelInvite.title')}
      description={
        <Trans
          i18nKey="settings.team.cancelInvite.description"
          values={{ email: data.email }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('settings.team.cancelInvite.confirmButton')}
      cancelLabel={t('settings.team.cancelInvite.cancelButton')}
      open={isOpen}
      onOpenChange={(op) => !op && onCancel()}
      onConfirm={handleSubmit}
      loading={isLoading}
    />
  );
};

MemberCancelInviteDialog.displayName = 'MemberCancelInviteDialog';
