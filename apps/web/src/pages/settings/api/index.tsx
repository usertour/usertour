import { Separator } from '@usertour-ui/separator';
import { SettingsContent } from '../components/content';
import { ApiListContent } from './components/api-list-content';
import { ApiListHeader } from './components/api-list-header';

export const SettingsApiList = () => {
  return (
    <SettingsContent>
      <ApiListHeader />
      <Separator />
      <ApiListContent />
    </SettingsContent>
  );
};
