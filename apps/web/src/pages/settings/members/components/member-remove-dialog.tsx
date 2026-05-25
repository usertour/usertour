'use client';

import type { TeamMember } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useRemoveTeamMemberMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

interface MemberRemoveDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TeamMember;
  /** Called only after a successful remove — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

export const MemberRemoveDialog = ({
  projectId,
  open,
  onOpenChange,
  data,
  onSubmit,
}: MemberRemoveDialogProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { invoke } = useRemoveTeamMemberMutation();

  const handleSubmit = async () => {
    if (!data.userId) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await invoke(projectId, data.userId);
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
      title={t('settings.team.remove.title')}
      description={
        <Trans
          i18nKey="settings.team.remove.description"
          values={{ email: data.email }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('settings.team.remove.confirmButton')}
      cancelLabel={t('settings.team.remove.cancelButton')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleSubmit}
      loading={isLoading}
    />
  );
};

MemberRemoveDialog.displayName = 'MemberRemoveDialog';
