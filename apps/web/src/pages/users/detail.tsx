import { useAppContext } from '@/contexts/app-context';
import { UserListProvider } from '@/contexts/user-list-context';
import { useParams } from 'react-router-dom';
import { UserDetailContent } from './components/detail-content';
import { EventListProvider } from '@/contexts/event-list-context';

export const UserDetail = () => {
  const { userId } = useParams();
  const { environment, project } = useAppContext();

  return (
    <UserListProvider environmentId={environment?.id} defaultQuery={{ userId: userId }}>
      <EventListProvider projectId={project?.id || ''}>
        {environment?.id && userId && (
          <UserDetailContent environmentId={environment?.id} userId={userId} />
        )}
      </EventListProvider>
    </UserListProvider>
  );
};

UserDetail.displayName = 'UserDetail';
