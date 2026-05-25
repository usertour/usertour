'use client';

import { TeamMemberRole, type TeamMember } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useChangeTeamMemberRoleMutation } from '@usertour/hooks';
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
    <DestructiveConfirmDialog
      title={t('settings.team.transferOwner.title')}
      description={
        <Trans
          i18nKey="settings.team.transferOwner.description"
          values={{ name: data.name }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('settings.team.transferOwner.confirmButton')}
      cancelLabel={t('settings.team.transferOwner.cancelButton')}
      open={isOpen}
      onOpenChange={(op) => !op && onCancel()}
      onConfirm={handleSubmit}
      loading={isLoading}
    />
  );
};

MemberTransferOwnerDialog.displayName = 'MemberTransferOwnerDialog';
