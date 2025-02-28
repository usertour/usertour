import { Separator } from '@usertour-ui/separator';
import { SettingsContent } from '../components/content';
import { MemberListContent } from './components/member-list-content';
import { MemberListHeader } from './components/member-list-header';
import { useAppContext } from '@/contexts/app-context';

export const SettingsMemberList = () => {
  const { project } = useAppContext();
  if (!project || !project.id) {
    return <></>;
  }

  return (
    <SettingsContent>
      <MemberListHeader />
      <Separator />
      <MemberListContent projectId={project.id} />
    </SettingsContent>
  );
};

SettingsMemberList.displayName = 'SettingsMemberList';
