import { useAppContext } from '@/contexts/app-context';
import { LocalizationListProvider } from '@/contexts/localization-list-context';
import { Separator } from '@usertour-packages/separator';
import { SettingsContent } from '../components/content';
import { LocalizationListContent } from './components/localization-list-content';
import { LocalizationListHeader } from './components/localization-list-header';

export const SettingsLocalizationList = () => {
  const { project } = useAppContext();
  return (
    <SettingsContent>
      <LocalizationListProvider projectId={project?.id}>
        <LocalizationListHeader />
        <Separator />
        <LocalizationListContent />
      </LocalizationListProvider>
    </SettingsContent>
  );
};

SettingsLocalizationList.displayName = 'SettingsLocalizationList';
