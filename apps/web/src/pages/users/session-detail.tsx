import { useAppContext } from '@/contexts/app-context';
import { SessionDetailContent } from './components/session-detail-content';
import { useParams } from 'react-router-dom';

export const SessionDetail = () => {
  const { sessionId } = useParams();
  const { environment } = useAppContext();
  if (!sessionId || !environment?.id) {
    return <></>;
  }
  return <SessionDetailContent environmentId={environment?.id} sessionId={sessionId} />;
};

SessionDetail.displayName = 'SessionDetail';
