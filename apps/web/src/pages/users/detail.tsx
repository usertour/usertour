import { useAppContext } from '@/contexts/app-context';
import { UserListProvider } from '@/contexts/user-list-context';
import { useParams } from 'react-router-dom';
import { UserDetailContent } from './components/layout';
import { EventListProvider } from '@/contexts/event-list-context';
import { ScrollArea } from '@usertour-packages/scroll-area';

export const UserDetail = () => {
  const { userId } = useParams();
  const { environment, project } = useAppContext();

  return (
    <UserListProvider environmentId={environment?.id} defaultQuery={{ userId: userId }}>
      <EventListProvider projectId={project?.id || ''}>
        <ScrollArea className="h-full w-full">
          <div className="min-h-full">
            {environment?.id && userId && (
              <UserDetailContent environmentId={environment?.id} userId={userId} />
            )}
          </div>
        </ScrollArea>
      </EventListProvider>
    </UserListProvider>
  );
};

UserDetail.displayName = 'UserDetail';
