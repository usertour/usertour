import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { MemberProvider, useMemberContext } from '@/contexts/member-context';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { Badge } from '@usertour/badge';
import { Button } from '@usertour/button';
import { RiAddLine } from '@usertour/icons';
import type { TeamMember } from '@usertour/types';
import { ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { MemberInviteDialog } from './components/member-invite-dialog';
import { MemberListAction } from './components/member-list-action';

const AddTeamMemberButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex-none">
        <RiAddLine className="mr-2 h-4 w-4" />
        {t('settings.team.newButton')}
      </Button>
      <MemberInviteDialog
        isOpen={open}
        onClose={() => {
          setOpen(false);
          onSuccess();
        }}
      />
    </>
  );
};

const MemberListPage = () => {
  const { members, loading, refetch } = useMemberContext();
  const { t } = useTranslation();

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
      cell: (member) => member.role,
    },
    {
      header: '',
      headerClassName: 'w-20',
      cell: (member) => <MemberListAction data={member} />,
    },
  ];

  return (
    <ResourceListPage<TeamMember>
      title={t('settings.team.title')}
      actions={<AddTeamMemberButton onSuccess={refetch} />}
      columns={columns}
      rows={members}
      loading={loading}
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
