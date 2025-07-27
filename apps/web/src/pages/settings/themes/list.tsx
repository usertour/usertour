import { useAppContext } from '@/contexts/app-context';
import { ThemeListProvider } from '@/contexts/theme-list-context';
import { Separator } from '@usertour-packages/separator';
import { SettingsContent } from '../components/content';
import { ThemeListContent } from './components/theme-list-content';
import { ThemeListHeader } from './components/theme-list-header';

export const SettingsThemeList = () => {
  const { project } = useAppContext();

  return (
    <ThemeListProvider projectId={project?.id}>
      <SettingsContent>
        <ThemeListHeader />
        <Separator />
        <ThemeListContent />
      </SettingsContent>
    </ThemeListProvider>
  );
};

SettingsThemeList.displayName = 'SettingsThemeList';
