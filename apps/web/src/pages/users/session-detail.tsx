import { useAppContext } from '@/contexts/app-context';
import { SessionDetailContent } from './components/session-detail-content';
import { useParams } from 'react-router-dom';
import { EventListProvider } from '@/contexts/event-list-context';

export const SessionDetail = () => {
  const { sessionId } = useParams();
  const { environment, project } = useAppContext();
  if (!sessionId || !environment?.id) {
    return <></>;
  }
  return (
    <>
      <EventListProvider projectId={project?.id}>
        <SessionDetailContent environmentId={environment?.id} sessionId={sessionId} />
      </EventListProvider>
    </>
  );
};

SessionDetail.displayName = 'SessionDetail';
