import { Separator } from '@usertour-ui/separator';
import { SettingsContent } from '../components/content';
import { MemberListContent } from './components/member-list-content';
import { MemberListHeader } from './components/member-list-header';

export const SettingsMemberList = () => {
  return (
    <SettingsContent>
      <MemberListHeader />
      <Separator />
      <MemberListContent />
    </SettingsContent>
  );
};

SettingsMemberList.displayName = 'SettingsMemberList';
