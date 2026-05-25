'use client';

import type { TeamMember } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useCancelInviteMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

interface MemberCancelInviteDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TeamMember;
  /** Called only after a successful cancel — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

export const MemberCancelInviteDialog = ({
  projectId,
  open,
  onOpenChange,
  data,
  onSubmit,
}: MemberCancelInviteDialogProps) => {
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
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleSubmit}
      loading={isLoading}
    />
  );
};

MemberCancelInviteDialog.displayName = 'MemberCancelInviteDialog';
