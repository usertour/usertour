import { Separator } from '@usertour-packages/separator';
import { SettingsContent } from '../components/content';
import { MemberListContent } from './components/member-list-content';
import { MemberListHeader } from './components/member-list-header';
import { useAppContext } from '@/contexts/app-context';
import { MemberProvider } from '@/contexts/member-context';

export const SettingsMemberList = () => {
  const { project } = useAppContext();
  if (!project || !project.id) {
    return <></>;
  }

  return (
    <MemberProvider projectId={project.id}>
      <SettingsContent>
        <MemberListHeader />
        <Separator />
        <MemberListContent />
      </SettingsContent>
    </MemberProvider>
  );
};

SettingsMemberList.displayName = 'SettingsMemberList';
