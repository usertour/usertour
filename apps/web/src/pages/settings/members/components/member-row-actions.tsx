import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRightIcon } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { useMemberContext } from '@/contexts/member-context';
import { Delete2Icon, EditIcon } from '@usertour/icons';
import { type TeamMember, TeamMemberRole } from '@usertour/types';
import { ResourceRowActions, type ResourceRowActionItem } from '@usertour/ui';
import { CancelInviteDialog } from './member-cancel-dialog';
import { MemberChangeRoleDialog } from './member-change-role-dialog';
import { MemberRemoveDialog } from './member-remove-dialog';
import { TransferOwnerDialog } from './member-transfer-owner-dialog';

interface MemberRowActionsProps {
  data: TeamMember;
}

export const MemberRowActions = ({ data }: MemberRowActionsProps) => {
  const { project } = useAppContext();
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
      <ResourceRowActions items={items} contentClassName="min-w-[200px]" />
      <CancelInviteDialog
        projectId={projectId}
        data={data}
        isOpen={cancelInviteOpen}
        onSuccess={() => {
          setCancelInviteOpen(false);
          refetch();
        }}
        onCancel={() => setCancelInviteOpen(false)}
      />
      <MemberChangeRoleDialog
        projectId={projectId}
        isOpen={changeRoleOpen}
        data={data}
        onSuccess={() => {
          setChangeRoleOpen(false);
          refetch();
        }}
        onCancel={() => setChangeRoleOpen(false)}
      />
      <MemberRemoveDialog
        projectId={projectId}
        isOpen={removeOpen}
        data={data}
        onSuccess={() => {
          setRemoveOpen(false);
          refetch();
        }}
        onCancel={() => setRemoveOpen(false)}
      />
      <TransferOwnerDialog
        projectId={projectId}
        isOpen={transferOwnerOpen}
        data={data}
        onSuccess={() => {
          setTransferOwnerOpen(false);
          window.location.reload();
        }}
        onCancel={() => setTransferOwnerOpen(false)}
      />
    </>
  );
};

MemberRowActions.displayName = 'MemberRowActions';
