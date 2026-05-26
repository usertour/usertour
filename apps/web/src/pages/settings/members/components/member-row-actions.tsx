import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRightIcon } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { useMemberContext } from '@/contexts/member-context';
import { Delete2Icon, EditIcon } from '@usertour/icons';
import { type TeamMember, TeamMemberRole } from '@usertour/types';
import { ResourceRowActions, type ResourceRowActionItem } from '@usertour/ui';
import { MemberCancelInviteDialog } from './member-cancel-invite-dialog';
import { MemberChangeRoleDialog } from './member-change-role-dialog';
import { MemberRemoveDialog } from './member-remove-dialog';
import { MemberTransferOwnerDialog } from './member-transfer-owner-dialog';

interface MemberRowActionsProps {
  data: TeamMember;
}

export const MemberRowActions = (props: MemberRowActionsProps) => {
  const { data } = props;
  const { project, isViewOnly, refetch: refetchAppContext } = useAppContext();
  const { refetch } = useMemberContext();
  const { t } = useTranslation();
  const [cancelInviteOpen, setCancelInviteOpen] = useState(false);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [transferOwnerOpen, setTransferOwnerOpen] = useState(false);

  const projectId = project?.id as string;
  const isOwner = data.role === TeamMemberRole.OWNER;

  const items: ResourceRowActionItem[] = data.isInvite
    ? [
        {
          key: 'cancelInvite',
          icon: <Delete2Icon className="w-6" width={16} height={16} />,
          label: t('settings.team.cancelInviteMenuItem'),
          destructive: true,
          onSelect: () => setCancelInviteOpen(true),
        },
      ]
    : [
        {
          key: 'changeRole',
          icon: <EditIcon className="w-6" width={16} height={16} />,
          label: t('settings.team.changeRoleMenuItem'),
          disabled: isOwner,
          onSelect: () => setChangeRoleOpen(true),
        },
        {
          key: 'transferOwner',
          icon: <ArrowLeftRightIcon className="w-6" width={16} height={16} />,
          label: t('settings.team.transferOwnerMenuItem'),
          disabled: isOwner,
          onSelect: () => setTransferOwnerOpen(true),
        },
        {
          key: 'remove',
          icon: <Delete2Icon className="w-6" width={16} height={16} />,
          label: t('settings.team.removeMenuItem'),
          destructive: true,
          disabled: isOwner,
          separatorBefore: true,
          onSelect: () => setRemoveOpen(true),
        },
      ];

  return (
    <>
      <ResourceRowActions items={items} contentClassName="min-w-[200px]" disabled={isViewOnly} />
      <MemberCancelInviteDialog
        projectId={projectId}
        data={data}
        open={cancelInviteOpen}
        onOpenChange={setCancelInviteOpen}
        onSubmit={() => refetch()}
      />
      <MemberChangeRoleDialog
        projectId={projectId}
        open={changeRoleOpen}
        onOpenChange={setChangeRoleOpen}
        data={data}
        onSubmit={() => refetch()}
      />
      <MemberRemoveDialog
        projectId={projectId}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        data={data}
        onSubmit={() => refetch()}
      />
      <MemberTransferOwnerDialog
        projectId={projectId}
        open={transferOwnerOpen}
        onOpenChange={setTransferOwnerOpen}
        data={data}
        // Transfer flips the current user out of OWNER. Refetch the app
        // context so `isViewOnly` / capabilities re-derive and the
        // sidebar/route gates update without a full reload. Gate on
        // `success` so a failed transfer doesn't trigger the expensive
        // capability re-eval (visible sidebar/route-guard flicker).
        onSubmit={async (success) => {
          if (!success) {
            return;
          }
          await refetchAppContext();
          await refetch();
        }}
      />
    </>
  );
};

MemberRowActions.displayName = 'MemberRowActions';
