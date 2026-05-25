'use client';

import type { TeamMember } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useRemoveTeamMemberMutation } from '@usertour/hooks';
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
  const { t } = useTranslation();
  const { invoke: removeTeamMember } = useRemoveTeamMemberMutation();

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
      // Success is obvious from the member-list refresh below — no toast.
      invoke={() =>
        data.userId ? removeTeamMember(projectId, data.userId) : Promise.resolve(false)
      }
      failureToast={t('settings.team.remove.failure')}
      onSettled={onSubmit}
    />
  );
};

MemberRemoveDialog.displayName = 'MemberRemoveDialog';
