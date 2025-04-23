import { Separator } from '@usertour-ui/separator';
import { SettingsContent } from '../components/content';
import { ApiListContent } from './components/api-list-content';
import { ApiListHeader } from './components/api-list-header';
import { ApiProvider } from '@/contexts/api-context';

export const SettingsApiList = () => {
  return (
    <SettingsContent>
      <ApiProvider>
        <ApiListHeader />
        <Separator />
        <ApiListContent />
      </ApiProvider>
    </SettingsContent>
  );
};
