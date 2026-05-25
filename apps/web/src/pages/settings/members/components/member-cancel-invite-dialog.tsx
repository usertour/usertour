'use client';

import type { TeamMember } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useCancelInviteMutation } from '@usertour/hooks';
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
  const { t } = useTranslation();
  const { invoke: cancelInvite } = useCancelInviteMutation();

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
      // Success is obvious from the invite-list refresh below — no toast.
      invoke={() =>
        data.inviteId ? cancelInvite(projectId, data.inviteId) : Promise.resolve(false)
      }
      failureToast={t('settings.team.cancelInvite.failure')}
      onSettled={onSubmit}
    />
  );
};

MemberCancelInviteDialog.displayName = 'MemberCancelInviteDialog';
