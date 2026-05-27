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
  /**
   * Fires once the action settles, with whether it succeeded. Consumers
   * typically refetch on either branch; gate side-effects like
   * navigation on the boolean.
   */
  onSubmit?: (success: boolean) => void;
}

export const MemberCancelInviteDialog = (props: MemberCancelInviteDialogProps) => {
  const { projectId, open, onOpenChange, data, onSubmit } = props;
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
      invoke={() => {
        if (!data.inviteId) {
          // Routed here by mistake — return a rejected promise so the
          // primitive's catch branch shows the failure toast with a
          // sensible message instead of the soft-failure toast (which
          // would falsely imply the server tried and refused).
          return Promise.reject(new Error(t('settings.team.cancelInvite.failure')));
        }
        return cancelInvite(projectId, data.inviteId);
      }}
      failureToast={t('settings.team.cancelInvite.failure')}
      onSettled={onSubmit}
    />
  );
};

MemberCancelInviteDialog.displayName = 'MemberCancelInviteDialog';
