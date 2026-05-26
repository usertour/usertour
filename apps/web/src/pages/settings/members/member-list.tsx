import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { MemberProvider, useMemberContext } from '@/contexts/member-context';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { Badge } from '@usertour/badge';
import type { TeamMember } from '@usertour/types';
import { NewItemButton, ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
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

// Pending invites first (matches the existing `[...invites, ...teamMembers]`
// shape of `useMemberContext`), then name-asc within each group so refetches
// don't reshuffle rows.
const sortMembers = (members: readonly TeamMember[]) =>
  [...members].sort((left, right) => {
    if (left.isInvite !== right.isInvite) {
      return left.isInvite ? -1 : 1;
    }
    return (left.name ?? '').localeCompare(right.name ?? '');
  });

const MemberListPage = () => {
  const { members, loading, refetch } = useMemberContext();
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

export const SettingsMemberList = () => {
  const { project } = useAppContext();
  if (!project?.id) {
    return null;
  }
  return (
    <MemberProvider projectId={project.id}>
      <MemberListPage />
    </MemberProvider>
  );
};

SettingsMemberList.displayName = 'SettingsMemberList';
