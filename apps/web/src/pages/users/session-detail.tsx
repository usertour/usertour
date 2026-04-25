import { useAppContext } from '@/contexts/app-context';
import { SessionDetailContent } from './components/sessions';
import { useParams } from 'react-router-dom';
import { EventListProvider } from '@/contexts/event-list-context';
import { ScrollArea } from '@usertour-packages/scroll-area';

export const SessionDetail = () => {
  const { sessionId } = useParams();
  const { environment, project } = useAppContext();
  if (!sessionId || !environment?.id) {
    return <></>;
  }
  return (
    <EventListProvider projectId={project?.id}>
      <ScrollArea className="h-full w-full">
        <div className="min-h-full">
          <SessionDetailContent environmentId={environment?.id} sessionId={sessionId} />
        </div>
      </ScrollArea>
    </EventListProvider>
  );
};

SessionDetail.displayName = 'SessionDetail';
