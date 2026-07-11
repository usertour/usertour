import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMemberList } from '@/hooks/use-member-list';
import {
  UserAvatar,
  Badge,
  NewItemButton,
  ResourceListPage,
  type ResourceTableColumn,
} from '@usertour/ui';
import type { TeamMember } from '@usertour/types';
import { MemberInviteDialog } from './components/member-invite-dialog';
import { MemberRowActions } from './components/member-row-actions';

const AddTeamMemberButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <NewItemButton
        onClick={() => setOpen(true)}
        className="flex-none"
        label={t('settings.team.newButton')}
      />
      <MemberInviteDialog open={open} onOpenChange={setOpen} onSubmit={() => onSuccess()} />
    </>
  );
};

// Pending invites first (matches the legacy `[...invites, ...teamMembers]`
// composition in `useMemberList`), then name-asc within each group so
// refetches don't reshuffle rows.
const sortMembers = (members: readonly TeamMember[]) =>
  [...members].sort((left, right) => {
    if (left.isInvite !== right.isInvite) {
      return left.isInvite ? -1 : 1;
    }
    return (left.name ?? '').localeCompare(right.name ?? '');
  });

export const SettingsMemberList = () => {
  const { members, loading, refetch } = useMemberList();
  const { t } = useTranslation();

  const rows = useMemo(() => sortMembers(members ?? []), [members]);

  const columns: ResourceTableColumn<TeamMember>[] = [
    {
      header: t('settings.team.columns.name'),
      cell: (member) => (
        <div className="flex flex-row items-center gap-2">
          <UserAvatar email={member.email} name={member.name} />
          <span className="truncate max-w-64">{member.name}</span>
          {member.isInvite ? (
            <Badge variant="success">{t('settings.team.invitePending')}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      header: t('settings.team.columns.email'),
      headerClassName: 'hidden sm:table-cell',
      className: 'truncate hidden sm:table-cell',
      cell: (member) => member.email,
    },
    {
      header: t('settings.team.columns.role'),
      headerClassName: 'w-28',
      cell: (member) => t(`settings.team.roles.${member.role.toLowerCase()}`, member.role),
    },
    {
      header: t('settings.team.columns.twoFactor'),
      headerClassName: 'w-24 hidden sm:table-cell',
      className: 'hidden sm:table-cell',
      cell: (member) =>
        member.isInvite ? (
          <span className="text-muted-foreground">—</span>
        ) : member.twoFactorEnabled ? (
          <Badge variant="success">{t('settings.team.twoFactor.on')}</Badge>
        ) : (
          <span className="text-muted-foreground">{t('settings.team.twoFactor.off')}</span>
        ),
    },
    {
      header: '',
      headerClassName: 'w-20',
      cell: (member) => <MemberRowActions data={member} />,
    },
  ];

  return (
    <ResourceListPage<TeamMember>
      title={t('settings.team.title')}
      actions={<AddTeamMemberButton onSuccess={refetch} />}
      columns={columns}
      rows={rows}
      loading={loading}
      empty={t('settings.team.empty')}
      getRowKey={(member) => (member.isInvite ? member.inviteId : member.userId) ?? ''}
    />
  );
};

SettingsMemberList.displayName = 'SettingsMemberList';
