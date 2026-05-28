import { useAppContext } from '@/contexts/app-context';
import { useParams } from 'react-router-dom';
import { ScrollArea } from '@usertour/ui';
import { UserDetailContent } from './components/user-detail-content';

export const UserDetail = () => {
  const { userId } = useParams();
  const { environment } = useAppContext();

  return (
    <ScrollArea className="h-full w-full">
      <div className="min-h-full">
        {environment?.id && userId && (
          <UserDetailContent environmentId={environment?.id} userId={userId} />
        )}
      </div>
    </ScrollArea>
  );
};

UserDetail.displayName = 'UserDetail';
