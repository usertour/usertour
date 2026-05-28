import { useAppContext } from '@/contexts/app-context';
import { UserSessionDetailContent } from './components/sessions/user-session-detail-content';
import { useParams } from 'react-router-dom';
import { ScrollArea } from '@usertour/ui';

export const SessionDetail = () => {
  const { sessionId } = useParams();
  const { environment } = useAppContext();
  if (!sessionId || !environment?.id) {
    return <></>;
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
