import { useAppContext } from '@/contexts/app-context';
import { UserListProvider } from '@/contexts/user-list-context';
import { useParams } from 'react-router-dom';
import { UserDetailContent } from './components/detail-content';

export const UserDetail = () => {
  const { userId } = useParams();
  const { environment } = useAppContext();
  return (
    <UserListProvider environmentId={environment?.id} defaultQuery={{ userId: userId }}>
      {environment?.id && userId && (
        <UserDetailContent environmentId={environment?.id} userId={userId} />
      )}
    </UserListProvider>
  );
};

UserDetail.displayName = 'UserDetail';
