'use client';

import { TeamMemberRole, type TeamMember } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useChangeTeamMemberRoleMutation } from '@usertour/hooks';
import { Trans, useTranslation } from 'react-i18next';

interface MemberTransferOwnerDialogProps {
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

export const MemberTransferOwnerDialog = (props: MemberTransferOwnerDialogProps) => {
  const { projectId, open, onOpenChange, data, onSubmit } = props;
  const { t } = useTranslation();
  const { invoke: changeRole } = useChangeTeamMemberRoleMutation();

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
      // Success is obvious from the owner badge moving in the list + the
      // current user losing owner-only menu items — no toast.
      invoke={() => {
        if (!data.userId) {
          return Promise.reject(new Error(t('settings.team.transferOwner.failure')));
        }
        return changeRole(projectId, data.userId, TeamMemberRole.OWNER);
      }}
      failureToast={t('settings.team.transferOwner.failure')}
      onSettled={onSubmit}
    />
  );
};

MemberTransferOwnerDialog.displayName = 'MemberTransferOwnerDialog';
