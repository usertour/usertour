import { useAppContext } from '@/contexts/app-context';
import { SegmentListProvider } from '@/contexts/segment-list-context';
import { UserListSidebar } from '@/pages/users/components/sidebar';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { UserListContent } from './components/content';

export const UserList = () => {
  const { environment } = useAppContext();

  return (
    <SegmentListProvider environmentId={environment?.id} bizType={['USER']}>
      <UserListSidebar />
      <ScrollArea className="h-full w-full ">
        <UserListContent environmentId={environment?.id} />
      </ScrollArea>
    </SegmentListProvider>
  );
};

UserList.displayName = 'UserList';
