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
      invoke={() =>
        data.userId
          ? changeRole(projectId, data.userId, TeamMemberRole.OWNER)
          : Promise.resolve(false)
      }
      failureToast={t('settings.team.transferOwner.failure')}
      onSettled={onSubmit}
    />
  );
};

MemberTransferOwnerDialog.displayName = 'MemberTransferOwnerDialog';
