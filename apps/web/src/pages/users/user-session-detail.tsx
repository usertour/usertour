import { useAppContext } from '@/contexts/app-context';
import { NotFound } from '@/routes/not-found';
import { UserSessionDetailContent } from './components/sessions/user-session-detail-content';
import { useParams } from 'react-router-dom';
import { ScrollArea } from '@usertour/ui';

export const SessionDetail = () => {
  const { sessionId } = useParams();
  const { environment } = useAppContext();

  if (!sessionId) {
    return <NotFound />;
  }

  // AppContext is hydrating; brief null beats a transient loading flash.
  if (!environment?.id) {
    return null;
  }

  return (
    <ScrollArea className="h-full w-full">
      <div className="min-h-full">
        <UserSessionDetailContent environmentId={environment?.id} sessionId={sessionId} />
      </div>
    </ScrollArea>
  );
};

SessionDetail.displayName = 'SessionDetail';
