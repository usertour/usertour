import { useAppContext } from '@/contexts/app-context';
import { EventListProvider } from '@/contexts/event-list-context';
import { Separator } from '@usertour-ui/separator';
import { SettingsContent } from '../components/content';
import { EventListContent } from './components/event-list-content';
import { EventListHeader } from './components/event-list-header';

export const SettingsEventsList = () => {
  const { project } = useAppContext();
  return (
    <SettingsContent>
      <EventListProvider projectId={project?.id}>
        <EventListHeader />
        <Separator />
        <EventListContent />
      </EventListProvider>
    </SettingsContent>
  );
};

SettingsEventsList.displayName = 'SettingsEventsList';
