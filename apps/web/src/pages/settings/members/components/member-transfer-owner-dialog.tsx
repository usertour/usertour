'use client';

import { TeamMemberRole, type TeamMember } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useChangeTeamMemberRoleMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

interface MemberTransferOwnerDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TeamMember;
  /** Called only after a successful transfer — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

export const MemberTransferOwnerDialog = ({
  projectId,
  open,
  onOpenChange,
  data,
  onSubmit,
}: MemberTransferOwnerDialogProps) => {
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
        onSubmit?.(true);
        onOpenChange(false);
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
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleSubmit}
      loading={isLoading}
    />
  );
};

MemberTransferOwnerDialog.displayName = 'MemberTransferOwnerDialog';
