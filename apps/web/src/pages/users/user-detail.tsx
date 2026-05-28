import { useAppContext } from '@/contexts/app-context';
import { UserListProvider } from '@/contexts/user-list-context';
import { useParams } from 'react-router-dom';
import { UserDetailContent } from './components/user-detail-content';
import { ScrollArea } from '@usertour/ui';

export const UserDetail = () => {
  const { userId } = useParams();
  const { environment } = useAppContext();

  return (
    <UserListProvider environmentId={environment?.id} defaultQuery={{ userId: userId }}>
      <ScrollArea className="h-full w-full">
        <div className="min-h-full">
          {environment?.id && userId && (
            <UserDetailContent environmentId={environment?.id} userId={userId} />
          )}
        </div>
      </ScrollArea>
    </UserListProvider>
  );
};

UserDetail.displayName = 'UserDetail';
